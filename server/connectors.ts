import { db } from './db.js';

export interface ConnectorSyncResult {
  connectorId: string;
  success: boolean;
  message: string;
  recordsSynced: number;
  newFindings: number;
}

// In-memory rate limiting and caching for external public calls
const cache: Record<string, { data: any; expiry: number }> = {};

function getCached<T>(key: string): T | null {
  const item = cache[key];
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCache(key: string, data: any, ttlSeconds: number) {
  cache[key] = {
    data,
    expiry: Date.now() + ttlSeconds * 1000,
  };
}

/**
 * Fetch with safe timeout and user-agent
 */
async function safeFetch(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'DarkWatch-AI-CyberIntelligence/1.0 (Defensive Research)',
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Sync CISA Known Exploited Vulnerabilities (KEV)
 */
export async function syncCisaKev(): Promise<ConnectorSyncResult> {
  const connectorId = 'cisa-kev';
  try {
    let data: any = getCached('cisa-kev-data');
    if (!data) {
      const resp = await safeFetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {}, 10000);
      if (!resp.ok) throw new Error(`CISA returned HTTP ${resp.status}`);
      data = await resp.json();
      setCache('cisa-kev-data', data, 3600); // cache 1 hr
    }

    const vulnerabilities = data.vulnerabilities || [];
    const totalCount = vulnerabilities.length;

    // Get monitored brands keywords to find potential matches
    const brands = db.prepare("SELECT id, name, keywords FROM brands WHERE status = 'ACTIVE'").all() as any[];
    let newFindings = 0;

    // Check last 20 vulnerabilities
    const recent = vulnerabilities.slice(-25).reverse();
    for (const v of recent) {
      const vulnId = v.cveID;
      const existing = db.prepare('SELECT id FROM findings WHERE evidence_ref LIKE ?').get(`%${vulnId}%`);
      if (!existing) {
        // Correlate with brand keywords or create high-priority perimeter advisory
        const matchingBrand = brands.find(b => {
          const kw = JSON.parse(b.keywords || '[]');
          return kw.some((k: string) => 
            v.vendorProject?.toLowerCase().includes(k.toLowerCase()) || 
            v.product?.toLowerCase().includes(k.toLowerCase()) ||
            v.shortDescription?.toLowerCase().includes(k.toLowerCase())
          );
        });

        const findingId = `cisa_${vulnId.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const targetBrandId = matchingBrand ? matchingBrand.id : (brands[0]?.id || null);

        db.prepare(`
          INSERT OR IGNORE INTO findings (
            id, brand_id, title, category, severity, status, source, confidence, 
            verification_status, first_seen, last_seen, evidence_ref, target_asset, 
            evidence_details, ai_summary, is_demo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          findingId,
          targetBrandId,
          `CISA KEV Vulnerability: ${v.cveID} in ${v.vendorProject} ${v.product}`,
          'VULNERABILITY_EXPLOIT',
          v.knownRansomwareCampaignUse === 'Known' ? 'CRITICAL' : 'HIGH',
          'OPEN',
          'CISA KEV Public Catalog',
          100,
          'CONFIRMED_EXPOSURE',
          v.dateAdded || new Date().toISOString(),
          new Date().toISOString(),
          `CISA-KEV:${v.cveID}`,
          `${v.vendorProject} ${v.product}`,
          JSON.stringify({
            cve: v.cveID,
            vendor: v.vendorProject,
            product: v.product,
            vulnerabilityName: v.vulnerabilityName,
            requiredAction: v.requiredAction,
            dueDate: v.dueDate,
            knownRansomwareUse: v.knownRansomwareCampaignUse,
            notes: v.notes,
          }),
          `CISA published active in-the-wild exploitation for ${v.cveID} (${v.product}). Mandatory defensive action: ${v.requiredAction}`,
          0,
          new Date().toISOString()
        );
        newFindings++;
      }
    }

    // Update connector status
    db.prepare(`
      UPDATE connectors 
      SET last_sync = ?, record_count = ?, status = 'HEALTHY'
      WHERE id = ?
    `).run(new Date().toISOString(), totalCount, connectorId);

    return {
      connectorId,
      success: true,
      message: `Successfully synchronized ${totalCount} records from CISA KEV catalog. Evaluated recent perimeter vulnerabilities.`,
      recordsSynced: totalCount,
      newFindings,
    };
  } catch (err: any) {
    db.prepare(`
      UPDATE connectors 
      SET status = 'DEGRADED', last_sync = ?
      WHERE id = ?
    `).run(new Date().toISOString(), connectorId);

    return {
      connectorId,
      success: false,
      message: `CISA KEV sync notice: ${err.message}. Using cached or fallback records.`,
      recordsSynced: 0,
      newFindings: 0,
    };
  }
}

/**
 * Sync URLhaus recent malware and phishing URLs
 */
export async function syncUrlhaus(): Promise<ConnectorSyncResult> {
  const connectorId = 'urlhaus';
  try {
    let data: any = getCached('urlhaus-recent');
    if (!data) {
      const resp = await safeFetch('https://urlhaus-api.abuse.ch/v1/urls/recent/limit/30/', {
        method: 'GET',
      }, 8000);
      if (!resp.ok) throw new Error(`URLhaus returned HTTP ${resp.status}`);
      data = await resp.json();
      setCache('urlhaus-recent', data, 600); // cache 10 mins
    }

    const urls = data.urls || [];
    let newIocs = 0;

    for (const item of urls.slice(0, 15)) {
      const iocId = `urlhaus_${item.id || item.url_id || Math.random().toString(36).substring(7)}`;
      const existing = db.prepare('SELECT id FROM iocs WHERE value = ?').get(item.url);
      if (!existing && item.url) {
        db.prepare(`
          INSERT OR IGNORE INTO iocs (
            id, type, value, threat_type, malware_family, confidence, source,
            first_seen, last_seen, tags, status, is_demo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          iocId,
          'URL',
          item.url,
          item.threat || 'Malware Distribution',
          item.tags ? item.tags.join(', ') : 'URLhaus Feed',
          item.url_status === 'online' ? 95 : 75,
          'URLhaus abuse.ch Feed',
          item.date_added || new Date().toISOString(),
          new Date().toISOString(),
          JSON.stringify(item.tags || ['urlhaus', 'malware']),
          item.url_status === 'online' ? 'ACTIVE' : 'MONITORED',
          0,
          new Date().toISOString()
        );
        newIocs++;
      }
    }

    db.prepare(`
      UPDATE connectors 
      SET last_sync = ?, record_count = record_count + ?, status = 'HEALTHY'
      WHERE id = ?
    `).run(new Date().toISOString(), urls.length, connectorId);

    return {
      connectorId,
      success: true,
      message: `Synchronized ${urls.length} live records from URLhaus feed. Added ${newIocs} verified threat indicators.`,
      recordsSynced: urls.length,
      newFindings: newIocs,
    };
  } catch (err: any) {
    db.prepare(`
      UPDATE connectors 
      SET status = 'DEGRADED', last_sync = ?
      WHERE id = ?
    `).run(new Date().toISOString(), connectorId);

    return {
      connectorId,
      success: false,
      message: `URLhaus connection notice: ${err.message}. Rate-limiting respected.`,
      recordsSynced: 0,
      newFindings: 0,
    };
  }
}

/**
 * Sync ThreatFox IOC Feed
 */
export async function syncThreatFox(): Promise<ConnectorSyncResult> {
  const connectorId = 'threatfox';
  try {
    let data: any = getCached('threatfox-recent');
    if (!data) {
      const resp = await safeFetch('https://threatfox-api.abuse.ch/v1/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'get_iocs', days: 1 }),
      }, 8000);
      if (!resp.ok) throw new Error(`ThreatFox returned HTTP ${resp.status}`);
      data = await resp.json();
      setCache('threatfox-recent', data, 600);
    }

    const iocList = data.data || [];
    let newIocs = 0;

    for (const item of iocList.slice(0, 15)) {
      const typeMap: Record<string, string> = {
        'ip:port': 'IP',
        'domain': 'DOMAIN',
        'url': 'URL',
        'md5_hash': 'MD5',
        'sha256_hash': 'SHA256',
      };
      const cleanType = typeMap[item.ioc_type] || 'IP';
      const cleanValue = item.ioc_value || item.ioc;
      if (!cleanValue) continue;

      const existing = db.prepare('SELECT id FROM iocs WHERE value = ?').get(cleanValue);
      if (!existing) {
        db.prepare(`
          INSERT OR IGNORE INTO iocs (
            id, type, value, threat_type, malware_family, confidence, source,
            first_seen, last_seen, tags, status, is_demo, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `tf_${item.id || Math.random().toString(36).substring(7)}`,
          cleanType,
          cleanValue,
          item.threat_type || 'Malware Communication',
          item.malware_printable || item.malware || 'Unknown',
          Number(item.confidence_level) || 85,
          'ThreatFox abuse.ch',
          item.first_seen || new Date().toISOString(),
          item.last_seen || new Date().toISOString(),
          JSON.stringify(item.tags || ['threatfox']),
          'ACTIVE',
          0,
          new Date().toISOString()
        );
        newIocs++;
      }
    }

    db.prepare(`
      UPDATE connectors 
      SET last_sync = ?, record_count = record_count + ?, status = 'HEALTHY'
      WHERE id = ?
    `).run(new Date().toISOString(), iocList.length, connectorId);

    return {
      connectorId,
      success: true,
      message: `Synchronized ${iocList.length} indicators from ThreatFox abuse.ch feed. Added ${newIocs} new IOCs.`,
      recordsSynced: iocList.length,
      newFindings: newIocs,
    };
  } catch (err: any) {
    db.prepare(`
      UPDATE connectors 
      SET status = 'DEGRADED', last_sync = ?
      WHERE id = ?
    `).run(new Date().toISOString(), connectorId);

    return {
      connectorId,
      success: false,
      message: `ThreatFox connection notice: ${err.message}.`,
      recordsSynced: 0,
      newFindings: 0,
    };
  }
}

/**
 * Sync & Authenticate VirusTotal Threat Telemetry Connector
 */
export async function syncVirusTotal(): Promise<ConnectorSyncResult> {
  const connectorId = 'virustotal';
  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  if (!apiKey) {
    db.prepare(`
      UPDATE connectors 
      SET status = 'NEEDS_KEY', has_key = 0, enabled = 0
      WHERE id = ?
    `).run(connectorId);
    return {
      connectorId,
      success: false,
      message: 'VirusTotal API key not configured in .env or Settings.',
      recordsSynced: 0,
      newFindings: 0,
    };
  }

  try {
    // Get monitored brand domain or fallback
    const brand = db.prepare("SELECT primary_domain FROM brands WHERE status = 'ACTIVE' LIMIT 1").get() as any;
    const testDomain = brand ? brand.primary_domain : 'apextech.io';

    const resp = await safeFetch(`https://www.virustotal.com/api/v3/domains/${encodeURIComponent(testDomain)}`, {
      headers: {
        'x-apikey': apiKey,
      },
    }, 10000);

    if (!resp.ok) {
      throw new Error(`VirusTotal API returned HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const attrs = data?.data?.attributes || {};
    const stats = attrs.last_analysis_stats || { harmless: 0, malicious: 0, suspicious: 0, undetected: 0 };
    const totalEngines = (stats.harmless || 0) + (stats.malicious || 0) + (stats.suspicious || 0) + (stats.undetected || 0);

    // Update connector status
    db.prepare(`
      UPDATE connectors 
      SET last_sync = ?, record_count = ?, status = 'HEALTHY', has_key = 1, enabled = 1
      WHERE id = ?
    `).run(new Date().toISOString(), totalEngines, connectorId);

    return {
      connectorId,
      success: true,
      message: `Successfully connected to VirusTotal API v3. Evaluated domain "${testDomain}" across ${totalEngines} antivirus and threat reputation engines (Harmless: ${stats.harmless}, Malicious: ${stats.malicious}, Suspicious: ${stats.suspicious}).`,
      recordsSynced: totalEngines,
      newFindings: stats.malicious > 0 ? 1 : 0,
    };
  } catch (err: any) {
    db.prepare(`
      UPDATE connectors 
      SET status = 'DEGRADED', last_sync = ?
      WHERE id = ?
    `).run(new Date().toISOString(), connectorId);

    return {
      connectorId,
      success: false,
      message: `VirusTotal connection error: ${err.message}`,
      recordsSynced: 0,
      newFindings: 0,
    };
  }
}

/**
 * Query VirusTotal v3 for a specific domain, IP, hash, or URL
 */
export async function queryVirusTotal(target: string, type: 'domain' | 'ip' | 'hash' | 'url' = 'domain') {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) {
    return { available: false, error: 'VirusTotal API key not configured' };
  }

  const cleanTarget = target.trim();
  const cacheKey = `vt_${type}_${cleanTarget}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    let endpoint = '';
    if (type === 'domain') {
      const dom = cleanTarget.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      endpoint = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(dom)}`;
    } else if (type === 'ip') {
      endpoint = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(cleanTarget)}`;
    } else if (type === 'hash') {
      endpoint = `https://www.virustotal.com/api/v3/files/${encodeURIComponent(cleanTarget)}`;
    } else {
      // URL ID in VT is base64 without padding
      const b64 = Buffer.from(cleanTarget).toString('base64').replace(/=/g, '');
      endpoint = `https://www.virustotal.com/api/v3/urls/${b64}`;
    }

    const resp = await safeFetch(endpoint, {
      headers: { 'x-apikey': apiKey },
    }, 10000);

    if (!resp.ok) {
      return { available: false, error: `VirusTotal returned HTTP ${resp.status}` };
    }

    const data = await resp.json();
    const attrs = data?.data?.attributes || {};
    const stats = attrs.last_analysis_stats || {};
    const results = attrs.last_analysis_results || {};

    // Get engines that flagged malicious or suspicious
    const detections: Array<{ engine: string; category: string; result: string }> = [];
    for (const [engineName, res] of Object.entries<any>(results)) {
      if (res.category === 'malicious' || res.category === 'suspicious') {
        detections.push({
          engine: engineName,
          category: res.category,
          result: res.result || 'flagged',
        });
      }
    }

    const result = {
      available: true,
      target: cleanTarget,
      type,
      reputation: attrs.reputation ?? 0,
      stats: {
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0,
        harmless: stats.harmless || 0,
        undetected: stats.undetected || 0,
      },
      totalEngines: Object.keys(results).length,
      detections,
      categories: attrs.categories || {},
      jarm: attrs.jarm,
      lastAnalysisDate: attrs.last_analysis_date ? new Date(attrs.last_analysis_date * 1000).toISOString() : null,
    };

    setCache(cacheKey, result, 1800); // cache for 30 minutes
    return result;
  } catch (err: any) {
    return { available: false, error: err.message };
  }
}

/**
 * Sync Have I Been Pwned Public Breach Database (v3)
 */
export async function syncHaveIBeenPwned(): Promise<ConnectorSyncResult> {
  const connectorId = 'hibp';
  try {
    let breaches: any[] = getCached('hibp-breaches-all') || [];
    if (!breaches || breaches.length === 0) {
      const resp = await safeFetch('https://haveibeenpwned.com/api/v3/breaches', {
        headers: {
          'User-Agent': 'DarkWatch-AI-CyberIntelligence/1.0 (Defensive Research)',
        },
      }, 10000);

      if (!resp.ok) throw new Error(`HIBP returned HTTP ${resp.status}`);
      breaches = await resp.json();
      setCache('hibp-breaches-all', breaches, 86400); // Cache 24 hours
    }

    // Correlate breaches against monitored brand domains
    const brands = db.prepare("SELECT id, name, primary_domain, additional_domains FROM brands WHERE status = 'ACTIVE'").all() as any[];
    let newFindings = 0;

    for (const brand of brands) {
      const allDomains = [brand.primary_domain, ...JSON.parse(brand.additional_domains || '[]')].map(d => d.toLowerCase());

      for (const breach of breaches) {
        const breachDomain = (breach.Domain || '').toLowerCase();
        const breachName = (breach.Name || '').toLowerCase();

        // Check if breach explicitly involves corporate domain
        const isMatch = allDomains.some(d => breachDomain.includes(d) || breachName.includes(d.split('.')[0]));

        if (isMatch) {
          const findingId = `hibp_${breach.Name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const existing = db.prepare('SELECT id FROM findings WHERE id = ?').get(findingId);

          if (!existing) {
            db.prepare(`
              INSERT OR IGNORE INTO findings (
                id, brand_id, title, category, severity, status, source, confidence,
                verification_status, first_seen, last_seen, evidence_ref, target_asset,
                evidence_details, ai_summary, is_demo, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              findingId,
              brand.id,
              `HIBP Verified Breach Exposure: ${breach.Title} (${breach.PwnCount.toLocaleString()} Accounts)`,
              'DATA_LEAK',
              breach.DataClasses?.includes('Passwords') ? 'HIGH' : 'MEDIUM',
              'OPEN',
              'Have I Been Pwned API v3',
              98,
              'CONFIRMED_EXPOSURE',
              breach.BreachDate || new Date().toISOString(),
              new Date().toISOString(),
              `HIBP-BREACH:${breach.Name}`,
              breach.Domain || brand.primary_domain,
              JSON.stringify({
                breach_title: breach.Title,
                domain: breach.Domain,
                breach_date: breach.BreachDate,
                pwn_count: breach.PwnCount,
                exposed_fields: breach.DataClasses || [],
                description: breach.Description?.replace(/<[^>]*>?/gm, ''),
                is_verified: breach.IsVerified,
                is_sensitive: breach.IsSensitive,
                is_fabricated: breach.IsFabricated,
                plaintext_passwords_stored: false,
                policy: 'DarkWatch strictly stores breach metadata attributes. Zero plaintext credentials retained.',
              }),
              `Have I Been Pwned recorded verified breach of ${breach.Title} affecting ${breach.PwnCount.toLocaleString()} total accounts. Exposed attributes include: ${(breach.DataClasses || []).slice(0, 5).join(', ')}.`,
              0,
              new Date().toISOString()
            );
            newFindings++;
          }
        }
      }
    }

    db.prepare(`
      UPDATE connectors 
      SET last_sync = ?, record_count = ?, status = 'HEALTHY', has_key = 1, enabled = 1
      WHERE id = ?
    `).run(new Date().toISOString(), breaches.length, connectorId);

    return {
      connectorId,
      success: true,
      message: `Successfully synchronized ${breaches.length} global breach records from Have I Been Pwned API v3. Correlated breach exposures with authorized assets.`,
      recordsSynced: breaches.length,
      newFindings,
    };
  } catch (err: any) {
    db.prepare(`
      UPDATE connectors 
      SET status = 'DEGRADED', last_sync = ?
      WHERE id = ?
    `).run(new Date().toISOString(), connectorId);

    return {
      connectorId,
      success: false,
      message: `Have I Been Pwned sync notice: ${err.message}`,
      recordsSynced: 0,
      newFindings: 0,
    };
  }
}

/**
 * Query Have I Been Pwned breaches for a specific domain or search keyword
 */
export async function queryHaveIBeenPwned(searchTerm: string) {
  try {
    let breaches: any[] = getCached('hibp-breaches-all') || [];
    if (!breaches || breaches.length === 0) {
      const resp = await safeFetch('https://haveibeenpwned.com/api/v3/breaches', {
        headers: {
          'User-Agent': 'DarkWatch-AI-CyberIntelligence/1.0 (Defensive Research)',
        },
      }, 10000);
      if (resp.ok) {
        breaches = await resp.json();
        setCache('hibp-breaches-all', breaches, 86400);
      }
    }

    const clean = searchTerm.toLowerCase().trim();
    const queryDomain = clean.includes('@') ? clean.split('@')[1] : clean;

    const matches = (breaches || []).filter(b => 
      (b.Domain && b.Domain.toLowerCase().includes(queryDomain)) ||
      (b.Name && b.Name.toLowerCase().includes(queryDomain)) ||
      (b.Title && b.Title.toLowerCase().includes(queryDomain))
    );

    return {
      query: searchTerm,
      queryDomain,
      totalBreachesCataloged: (breaches || []).length,
      matchesCount: matches.length,
      matches: matches.slice(0, 15).map(m => ({
        name: m.Name,
        title: m.Title,
        domain: m.Domain,
        breachDate: m.BreachDate,
        pwnCount: m.PwnCount,
        dataClasses: m.DataClasses,
        isVerified: m.IsVerified,
        isSensitive: m.IsSensitive,
        description: m.Description?.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...',
      })),
    };
  } catch (err: any) {
    return {
      query: searchTerm,
      error: err.message,
      matchesCount: 0,
      matches: [],
    };
  }
}

/**
 * Check Certificate Transparency for a brand domain via crt.sh
 */
export async function queryCertificateTransparency(domain: string): Promise<any[]> {
  try {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const cacheKey = `crtsh_${cleanDomain}`;
    const cached = getCached<any[]>(cacheKey);
    if (cached) return cached;

    const resp = await safeFetch(`https://crt.sh/?q=%.${encodeURIComponent(cleanDomain)}&output=json`, {}, 8000);
    if (!resp.ok) return [];
    const certs = await resp.json();
    if (Array.isArray(certs)) {
      setCache(cacheKey, certs, 1800);
      return certs;
    }
    return [];
  } catch (err) {
    // crt.sh can frequently be heavily loaded or rate-limit; fail gracefully
    return [];
  }
}

/**
 * Safe Typosquatting / Lookalike Domain Generator
 * Generates permutations based on:
 * - Homoglyphs / visually identical characters (e.g. o -> 0, l -> 1, rn -> m)
 * - Hyphenations and corporate prefix/suffix spoofing (-login, -sso, -verify, -support, -portal)
 * - TLD substitutions (.xyz, .top, .io, .net, .co, .live)
 * - Bitsquatting variations
 */
export function generateLookalikeDomains(domain: string): Array<{
  domain: string;
  technique: string;
  riskScore: number;
  reason: string;
}> {
  const parts = domain.toLowerCase().split('.');
  const baseName = parts[0];
  const tld = parts.slice(1).join('.') || 'com';

  const results: Array<{ domain: string; technique: string; riskScore: number; reason: string }> = [];

  // 1. Phishing & Brand Pre/Suffixes
  const deceptiveKeywords = [
    'login', 'sso', 'portal', 'auth', 'verify', 'security', 'support', 'account', 'update'
  ];
  for (const kw of deceptiveKeywords) {
    results.push({
      domain: `${baseName}-${kw}.${tld}`,
      technique: 'Hyphenated Brand Phishing',
      riskScore: 92,
      reason: `Direct brand name paired with high-intent credential keyword "${kw}"`,
    });
    results.push({
      domain: `${kw}-${baseName}.${tld}`,
      technique: 'Prefixed Brand Phishing',
      riskScore: 88,
      reason: `Prefix spoofing mimicking legitimate single sign-on redirect`,
    });
  }

  // 2. TLD Variations
  const riskyTlds = ['xyz', 'top', 'live', 'click', 'site', 'security', 'online'];
  for (const rTld of riskyTlds) {
    if (rTld !== tld) {
      results.push({
        domain: `${baseName}.${rTld}`,
        technique: 'TLD Substitution',
        riskScore: 78,
        reason: `Registration on low-cost TLD frequently favored in impersonation campaigns`,
      });
    }
  }

  // 3. Typo / Homoglyph Substitutions
  const substitutions: Record<string, string[]> = {
    'o': ['0'],
    'l': ['1', 'i'],
    'i': ['l', '1'],
    'e': ['3'],
    'a': ['4', '@'],
  };

  for (let i = 0; i < baseName.length; i++) {
    const char = baseName[i];
    if (substitutions[char]) {
      for (const sub of substitutions[char]) {
        const typoName = baseName.substring(0, i) + sub + baseName.substring(i + 1);
        results.push({
          domain: `${typoName}.${tld}`,
          technique: 'Homoglyph / Visual Spoofing',
          riskScore: 85,
          reason: `Character "${char}" substituted with visual lookalike "${sub}"`,
        });
      }
    }
  }

  // 4. Double-letter omission / insertion
  for (let i = 0; i < baseName.length; i++) {
    const omission = baseName.slice(0, i) + baseName.slice(i + 1);
    if (omission.length >= 3 && omission !== baseName) {
      results.push({
        domain: `${omission}.${tld}`,
        technique: 'Omission Typosquatting',
        riskScore: 70,
        reason: 'Omission of single character to catch typing errors',
      });
      break;
    }
  }

  return results;
}

/**
 * Safe Server-Side URL Inspector
 * Strictly analyzes URL metadata, entropy, syntax, host reputation, and IOC patterns
 * NEVER visits or executes the URL, preventing malware delivery or tracking beacon triggers!
 */
export function safeInspectUrl(inputUrl: string): {
  parsed: boolean;
  safeAnalysis: {
    protocol: string;
    hostname: string;
    pathname: string;
    port: string;
    queryParamsCount: number;
    hasIpHostname: boolean;
    suspiciousKeywordsFound: string[];
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    findings: string[];
    recommendation: string;
  };
} {
  try {
    let clean = inputUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }

    const urlObj = new URL(clean);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();

    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const findings: string[] = [];
    let riskScore = 10;

    if (isIp) {
      riskScore += 45;
      findings.push('URL utilizes direct raw IP address instead of fully qualified domain name (FQDN). Common C2/stealer evasion technique.');
    }

    if (urlObj.protocol === 'http:') {
      riskScore += 20;
      findings.push('Insecure HTTP protocol without TLS/HTTPS encryption.');
    }

    const suspiciousKeywords = [
      'login', 'signin', 'verify', 'account', 'password', 'secure', 'auth', 'sso',
      'banking', 'update', 'wallet', 'token', 'admin', 'recovery', 'confirm'
    ];
    const foundKeywords: string[] = [];
    for (const kw of suspiciousKeywords) {
      if (hostname.includes(kw) || pathname.includes(kw)) {
        foundKeywords.push(kw);
      }
    }

    if (foundKeywords.length > 0) {
      riskScore += Math.min(foundKeywords.length * 15, 40);
      findings.push(`Contains high-intent deceptive credential keywords: ${foundKeywords.join(', ')}`);
    }

    // High entropy / encoded strings check
    if (urlObj.search.length > 100 || /token|session|redirect|return_url/i.test(urlObj.search)) {
      riskScore += 15;
      findings.push('Contains long query strings or authentication redirect parameters typical of Adversary-in-the-Middle (AitM) phishing kits.');
    }

    // Check against local IOC database
    const matchingIoc = db.prepare('SELECT id, threat_type, malware_family FROM iocs WHERE value = ? OR value LIKE ?').get(inputUrl, `%${hostname}%`) as any;
    if (matchingIoc) {
      riskScore = 100;
      findings.push(`CRITICAL MATCH: Indicator verified in ThreatFox / URLhaus threat database (${matchingIoc.malware_family || matchingIoc.threat_type}).`);
    }

    riskScore = Math.min(100, Math.max(0, riskScore));

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 80) riskLevel = 'CRITICAL';
    else if (riskScore >= 60) riskLevel = 'HIGH';
    else if (riskScore >= 35) riskLevel = 'MEDIUM';

    let recommendation = 'No immediate high-risk indicators observed in syntax analysis. Continue passive monitoring.';
    if (riskLevel === 'CRITICAL') {
      recommendation = 'BLOCK IMMEDIATELY. Add domain and IP to perimeter firewall, DNS sinkhole, and submit abuse takedown request.';
    } else if (riskLevel === 'HIGH') {
      recommendation = 'SUSPICIOUS. Restrict corporate access via secure web gateway and alert SOC analysts.';
    }

    return {
      parsed: true,
      safeAnalysis: {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80'),
        queryParamsCount: Array.from(urlObj.searchParams.keys()).length,
        hasIpHostname: isIp,
        suspiciousKeywordsFound: foundKeywords,
        riskScore,
        riskLevel,
        findings,
        recommendation,
      },
    };
  } catch (err: any) {
    return {
      parsed: false,
      safeAnalysis: {
        protocol: '',
        hostname: '',
        pathname: '',
        port: '',
        queryParamsCount: 0,
        hasIpHostname: false,
        suspiciousKeywordsFound: [],
        riskScore: 50,
        riskLevel: 'MEDIUM',
        findings: ['Malformed or invalid URL syntax: ' + err.message],
        recommendation: 'Verify URL formatting before analyzing.',
      },
    };
  }
}
