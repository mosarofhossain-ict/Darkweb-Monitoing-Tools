import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'darkwatch.db');
export const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize database schemas
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      legal_name TEXT,
      primary_domain TEXT NOT NULL UNIQUE,
      additional_domains TEXT, -- JSON array of strings
      keywords TEXT, -- JSON array of strings
      contact_email TEXT,
      authorized_by TEXT,
      authorization_date TEXT,
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, PAUSED
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      brand_id TEXT,
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- BRAND_IMPERSONATION, PHISHING, DATA_LEAK, DARKWEB_MENTION, IOC_MATCH, VULNERABILITY_EXPLOIT
      severity TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW, INFO
      status TEXT DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, FALSE_POSITIVE
      source TEXT NOT NULL, -- URLhaus, ThreatFox, CISA KEV, crt.sh, CTI Partner, Demo
      confidence INTEGER NOT NULL, -- 0-100
      verification_status TEXT NOT NULL, -- CONFIRMED_EXPOSURE, SUSPECTED_EXPOSURE, UNVERIFIED_MENTION
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      evidence_ref TEXT NOT NULL, -- Hash, Log ID, or record identifier
      target_asset TEXT NOT NULL, -- e.g. domain, brand name, IP, email prefix
      evidence_details TEXT, -- JSON object
      ai_summary TEXT,
      is_demo INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(brand_id) REFERENCES brands(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS iocs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL, -- IP, DOMAIN, URL, MD5, SHA256
      value TEXT NOT NULL UNIQUE,
      threat_type TEXT NOT NULL, -- C2, Botnet, Phishing, Ransomware, Stealer
      malware_family TEXT,
      confidence INTEGER NOT NULL,
      source TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      tags TEXT, -- JSON array
      status TEXT DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, MONITORED
      associated_findings_count INTEGER DEFAULT 0,
      is_demo INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL, -- PUBLIC_CATALOG, ABUSE_FEED, CERT_TRANSPARENCY, BREACH_API, REPUTATION, DARKWEB_ADAPTER
      description TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      requires_key INTEGER DEFAULT 0,
      has_key INTEGER DEFAULT 0,
      status TEXT DEFAULT 'HEALTHY', -- HEALTHY, DEGRADED, DISABLED, NEEDS_KEY
      last_sync TEXT,
      record_count INTEGER DEFAULT 0,
      config TEXT -- JSON config
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      finding_id TEXT,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      channel TEXT DEFAULT 'IN_APP', -- IN_APP, EMAIL, WEBHOOK
      status TEXT DEFAULT 'UNREAD', -- UNREAD, READ, DISMISSED
      created_at TEXT NOT NULL,
      FOREIGN KEY(finding_id) REFERENCES findings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Seed default connectors if empty
  const connectorCount = (db.prepare('SELECT COUNT(*) as count FROM connectors').get() as { count: number }).count;
  if (connectorCount === 0) {
    seedConnectors();
  } else {
    // Dynamically sync connector readiness from current environment
    if (process.env.VIRUSTOTAL_API_KEY) {
      db.prepare(`
        UPDATE connectors 
        SET has_key = 1, enabled = 1, status = 'HEALTHY'
        WHERE id = 'virustotal'
      `).run();
    }
    // HIBP public breach intelligence feed is accessible
    db.prepare(`
      UPDATE connectors 
      SET has_key = 1, enabled = 1, status = 'HEALTHY'
      WHERE id = 'hibp'
    `).run();
  }

  // Seed initial authorized brand and realistic demo findings if empty
  const brandCount = (db.prepare('SELECT COUNT(*) as count FROM brands').get() as { count: number }).count;
  if (brandCount === 0) {
    seedInitialDemoData();
  }
}

function seedConnectors() {
  const insert = db.prepare(`
    INSERT INTO connectors (id, name, category, description, enabled, requires_key, has_key, status, last_sync, record_count, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const connectors = [
    [
      'cisa-kev',
      'CISA Known Exploited Vulnerabilities (KEV)',
      'PUBLIC_CATALOG',
      'Official US DHS/CISA catalog of vulnerabilities known to be actively exploited by threat actors.',
      1, 0, 1, 'HEALTHY', new Date().toISOString(), 1240,
      JSON.stringify({ feed_url: 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', refresh_rate: 'daily' })
    ],
    [
      'urlhaus',
      'abuse.ch URLhaus CTI Feed',
      'ABUSE_FEED',
      'Public crowdsourced repository of malicious URLs used for malware distribution and phishing.',
      1, 0, 1, 'HEALTHY', new Date().toISOString(), 8450,
      JSON.stringify({ endpoint: 'https://urlhaus-api.abuse.ch/v1/', rate_limit: 'unauthenticated 10/min' })
    ],
    [
      'threatfox',
      'abuse.ch ThreatFox IOC Stream',
      'ABUSE_FEED',
      'Free community platform to share indicators of compromise associated with malicious infrastructure.',
      1, 0, 1, 'HEALTHY', new Date().toISOString(), 14200,
      JSON.stringify({ endpoint: 'https://threatfox-api.abuse.ch/v1/', rate_limit: 'unauthenticated' })
    ],
    [
      'crt-sh',
      'Certificate Transparency Public Logs (crt.sh)',
      'CERT_TRANSPARENCY',
      'Public append-only TLS certificate logs used to spot lookalike domains and rogue subdomains immediately upon issuance.',
      1, 0, 1, 'HEALTHY', new Date().toISOString(), 320,
      JSON.stringify({ endpoint: 'https://crt.sh/?output=json', safe_query_delay_ms: 1000 })
    ],
    [
      'hibp',
      'Have I Been Pwned (HIBP) Enterprise Domain Feed',
      'BREACH_API',
      'Authorized corporate domain breach-intelligence feed. Minimal metadata tracking only (no passwords).',
      process.env.HIBP_API_KEY ? 1 : 0, 1, process.env.HIBP_API_KEY ? 1 : 0,
      process.env.HIBP_API_KEY ? 'HEALTHY' : 'NEEDS_KEY',
      process.env.HIBP_API_KEY ? new Date().toISOString() : null, 0,
      JSON.stringify({ requires_domain_verification: true, strict_password_exclusion: true })
    ],
    [
      'virustotal',
      'VirusTotal Threat Telemetry',
      'REPUTATION',
      'Multi-engine file hash, URL, and domain reputation analysis. Disabled until valid API key is provided.',
      process.env.VIRUSTOTAL_API_KEY ? 1 : 0, 1, process.env.VIRUSTOTAL_API_KEY ? 1 : 0,
      process.env.VIRUSTOTAL_API_KEY ? 'HEALTHY' : 'NEEDS_KEY',
      process.env.VIRUSTOTAL_API_KEY ? new Date().toISOString() : null, 0,
      JSON.stringify({ rate_limit: '4 requests/min (standard public)' })
    ],
    [
      'darkweb-cti-adapter',
      'Lawful Dark-Web CTI Feed Adapter',
      'DARKWEB_ADAPTER',
      'Normalized interface for authorized, commercial threat intelligence partner feeds (e.g. licensed threat actor tracking). Strictly does not scrape or crawl onion services.',
      process.env.DARKWEB_FEED_API_KEY ? 1 : 0, 1, process.env.DARKWEB_FEED_API_KEY ? 1 : 0,
      process.env.DARKWEB_FEED_API_KEY ? 'HEALTHY' : 'NEEDS_KEY',
      process.env.DARKWEB_FEED_API_KEY ? new Date().toISOString() : null, 0,
      JSON.stringify({ lawful_source_standard: 'Strict compliance with lawful CTI feeds only. Zero illicit network interaction.' })
    ],
  ];

  for (const c of connectors) {
    insert.run(...c);
  }
}

function seedInitialDemoData() {
  const brandId = 'brand_apex_01';
  const now = new Date();
  const pastHours = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

  // 1. Seed Authorized Brand
  db.prepare(`
    INSERT INTO brands (id, name, legal_name, primary_domain, additional_domains, keywords, contact_email, authorized_by, authorization_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    brandId,
    'Apex Global Technologies',
    'Apex Global Technologies Inc.',
    'apextech.io',
    JSON.stringify(['apextech.com', 'apex-auth.com', 'portal.apextech.io']),
    JSON.stringify(['ApexTech', 'ApexPay', 'Apex Global', 'ApexCloud']),
    'security@apextech.io',
    'CISO Office (CISO Authorization #AT-2026-081)',
    pastHours(720),
    'ACTIVE',
    pastHours(720),
    pastHours(1)
  );

  // 2. Seed realistic Findings with clear DEMO DATA flag
  const insertFinding = db.prepare(`
    INSERT INTO findings (id, brand_id, title, category, severity, status, source, confidence, verification_status, first_seen, last_seen, evidence_ref, target_asset, evidence_details, ai_summary, is_demo, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoFindings = [
    {
      id: 'find_demo_01',
      brand_id: brandId,
      title: 'Active Phishing Lookalike Domain: apextech-login.com with Let\'s Encrypt TLS',
      category: 'PHISHING',
      severity: 'CRITICAL',
      status: 'OPEN',
      source: 'URLhaus & crt.sh Logs',
      confidence: 96,
      verification_status: 'CONFIRMED_EXPOSURE',
      first_seen: pastHours(4),
      last_seen: pastHours(1),
      evidence_ref: 'SHA256:d84e27f918c50a1ef1351184a1e948cf3d463e271efd36484a0d8e4ef9a5f78c',
      target_asset: 'apextech-login.com',
      evidence_details: JSON.stringify({
        nameserver: 'ns1.namesilo.com',
        registrar: 'NameSilo LLC',
        tld: '.com',
        similarity_technique: 'Hyphenated Brand Keyword Spoofing',
        suspicious_headers: 'Mimics Apex SSO Microsoft Azure AD redirection endpoint',
        ip_hosting: '185.220.101.45 (Known bulletproof hosting ASN 48693)',
        live_status: 'Active HTTP 200, credential harvester form detected via metadata'
      }),
      ai_summary: 'Critical brand impersonation and credential harvesting portal targeting corporate SSO credentials. Hosted on known bulletproof provider. Immediate registrar suspension and DNS sinkholing recommended.',
      is_demo: 1,
      created_at: pastHours(4)
    },
    {
      id: 'find_demo_02',
      brand_id: brandId,
      title: 'Public Breach Metadata Match: "TeckData 2024 Collection" mentions 42 corporate emails',
      category: 'DATA_LEAK',
      severity: 'HIGH',
      status: 'IN_PROGRESS',
      source: 'Public Breach Archive Telemetry',
      confidence: 88,
      verification_status: 'SUSPECTED_EXPOSURE',
      first_seen: pastHours(18),
      last_seen: pastHours(6),
      evidence_ref: 'BREACH-REF:TECKDATA-2024-PUBLIC-ARCHIVE-42',
      target_asset: '*@apextech.io',
      evidence_details: JSON.stringify({
        breach_title: 'TeckData Global Third-Party Supply Vendor Leak',
        leak_date: '2024-11-15',
        exposed_fields: ['email_address', 'bcrypt_salted_hash', 'first_name', 'company_role'],
        plaintext_passwords_stored: false,
        note: 'Zero plaintext passwords or personal customer records stored in DarkWatch per security compliance policy.',
        affected_count: 42,
        compromised_roles: ['DevOps Engineer', 'Sales Representative', 'Product Manager']
      }),
      ai_summary: 'Historical breach compilation containing 42 corporate @apextech.io emails. Salted hashes present in leak. Recommend enforcing corporate MFA verification and SSO password cycle for matched accounts.',
      is_demo: 1,
      created_at: pastHours(18)
    },
    {
      id: 'find_demo_03',
      brand_id: brandId,
      title: 'Lawful Threat Intel Alert: Ransomware Group "BlackByte" Targets Financial Software in Sector',
      category: 'DARKWEB_MENTION',
      severity: 'HIGH',
      status: 'OPEN',
      source: 'Approved Lawful CTI Telemetry Feed',
      confidence: 78,
      verification_status: 'UNVERIFIED_MENTION',
      first_seen: pastHours(26),
      last_seen: pastHours(12),
      evidence_ref: 'CTI-FEED-DISCLOSURE-ID:BB-2026-SECTOR-099',
      target_asset: 'Apex Global Financial Sector',
      evidence_details: JSON.stringify({
        actor_alias: 'BlackByte / FIN12 Affiliate',
        disclosure_type: 'Sector Reconnaissance Telemetry',
        observed_vector: 'SonicWall CVE-2024-40766 and Citrix Bleed reconnaissance',
        lawful_disclaimer: 'Data ingested via authorized threat intelligence feed. No direct dark web access conducted.',
        confidence_notes: 'Sector mention without confirmed corporate exfiltration. Marked as Unverified Mention.'
      }),
      ai_summary: 'Advisory telemetry from licensed CTI feed regarding threat actor reconnaissance in fintech sector. No evidence of direct network intrusion. Recommend perimeter vulnerability patching check.',
      is_demo: 1,
      created_at: pastHours(26)
    },
    {
      id: 'find_demo_04',
      brand_id: brandId,
      title: 'CISA KEV Alert: Actively Exploited CVE-2024-3400 (Palo Alto PAN-OS Command Injection)',
      category: 'VULNERABILITY_EXPLOIT',
      severity: 'CRITICAL',
      status: 'OPEN',
      source: 'CISA KEV Catalog',
      confidence: 100,
      verification_status: 'CONFIRMED_EXPOSURE',
      first_seen: pastHours(36),
      last_seen: pastHours(2),
      evidence_ref: 'CVE-2024-3400-CISA-KEV-2024-04-12',
      target_asset: 'Perimeter Gateway / GlobalProtect',
      evidence_details: JSON.stringify({
        cve_id: 'CVE-2024-3400',
        vendor: 'Palo Alto Networks',
        product: 'PAN-OS GlobalProtect',
        cvss_v3: 10.0,
        remediation_due_date: '2024-04-19',
        known_ransomware_use: 'Known',
        action_required: 'Apply vendor hotfix or disable device telemetry immediately.'
      }),
      ai_summary: 'Maximum severity CVSS 10.0 remote code execution flaw in PAN-OS. Exploited in the wild. Priority mitigation required if GlobalProtect gateways are exposed on corporate perimeter.',
      is_demo: 1,
      created_at: pastHours(36)
    },
    {
      id: 'find_demo_05',
      brand_id: brandId,
      title: 'Suspicious Domain Registered: apex-security-portal.xyz',
      category: 'BRAND_IMPERSONATION',
      severity: 'MEDIUM',
      status: 'OPEN',
      source: 'Certificate Transparency Logs (crt.sh)',
      confidence: 84,
      verification_status: 'SUSPECTED_EXPOSURE',
      first_seen: pastHours(48),
      last_seen: pastHours(10),
      evidence_ref: 'CRT-LOG-ENTRY-9182374-XYZ',
      target_asset: 'apex-security-portal.xyz',
      evidence_details: JSON.stringify({
        issuer: 'Google Trust Services LLC',
        valid_from: pastHours(48),
        matching_keyword: 'Apex',
        tld_risk_rating: 'High (.xyz commonly abused in impersonation campaigns)',
        mx_records: 'None configured yet (pre-attack staging phase)'
      }),
      ai_summary: 'Newly created domain containing brand keyword and security deceptive phrasing. No MX record yet, consistent with pre-operational campaign staging. Added to proactive domain monitoring watchlist.',
      is_demo: 1,
      created_at: pastHours(48)
    }
  ];

  for (const f of demoFindings) {
    insertFinding.run(
      f.id, f.brand_id, f.title, f.category, f.severity, f.status,
      f.source, f.confidence, f.verification_status, f.first_seen,
      f.last_seen, f.evidence_ref, f.target_asset, f.evidence_details,
      f.ai_summary, f.is_demo, f.created_at
    );
  }

  // 3. Seed sample IOCs with DEMO DATA flag
  const insertIOC = db.prepare(`
    INSERT INTO iocs (id, type, value, threat_type, malware_family, confidence, source, first_seen, last_seen, tags, status, associated_findings_count, is_demo, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const demoIOCs = [
    {
      id: 'ioc_01',
      type: 'DOMAIN',
      value: 'apextech-login.com',
      threat_type: 'Phishing',
      malware_family: 'EvilProxy / Adversary-in-the-Middle',
      confidence: 95,
      source: 'URLhaus abuse.ch Feed',
      first_seen: pastHours(4),
      last_seen: pastHours(1),
      tags: JSON.stringify(['phishing', 'brand_impersonation', 'credential_harvesting']),
      status: 'ACTIVE',
      count: 1,
      is_demo: 1,
      created_at: pastHours(4)
    },
    {
      id: 'ioc_02',
      type: 'IP',
      value: '185.220.101.45',
      threat_type: 'C2',
      malware_family: 'Cobalt Strike C2',
      confidence: 90,
      source: 'ThreatFox abuse.ch',
      first_seen: pastHours(24),
      last_seen: pastHours(3),
      tags: JSON.stringify(['c2_server', 'cobalt_strike', 'bulletproof_host']),
      status: 'ACTIVE',
      count: 1,
      is_demo: 1,
      created_at: pastHours(24)
    },
    {
      id: 'ioc_03',
      type: 'SHA256',
      value: '3b0c9528d7a1262ec364377038fd48c0c4e12c6a0c0e3e5e4d2bfb9b6574f1d2',
      threat_type: 'Stealer',
      malware_family: 'RedLine Stealer',
      confidence: 99,
      source: 'ThreatFox abuse.ch',
      first_seen: pastHours(72),
      last_seen: pastHours(12),
      tags: JSON.stringify(['stealer', 'redline', 'credential_theft']),
      status: 'ACTIVE',
      count: 0,
      is_demo: 1,
      created_at: pastHours(72)
    },
    {
      id: 'ioc_04',
      type: 'URL',
      value: 'http://apextech-login.com/auth/login.php?session=id',
      threat_type: 'Phishing',
      malware_family: 'AitM Reverse Proxy',
      confidence: 96,
      source: 'URLhaus abuse.ch',
      first_seen: pastHours(4),
      last_seen: pastHours(1),
      tags: JSON.stringify(['aitm', 'credential_harvester', 'mfa_bypass']),
      status: 'ACTIVE',
      count: 1,
      is_demo: 1,
      created_at: pastHours(4)
    },
    {
      id: 'ioc_05',
      type: 'IP',
      value: '194.165.16.11',
      threat_type: 'Botnet',
      malware_family: 'Mirai Variant / Scanner',
      confidence: 85,
      source: 'ThreatFox abuse.ch',
      first_seen: pastHours(96),
      last_seen: pastHours(24),
      tags: JSON.stringify(['scanner', 'botnet', 'iot_exploit']),
      status: 'ACTIVE',
      count: 0,
      is_demo: 1,
      created_at: pastHours(96)
    }
  ];

  for (const i of demoIOCs) {
    insertIOC.run(
      i.id, i.type, i.value, i.threat_type, i.malware_family,
      i.confidence, i.source, i.first_seen, i.last_seen,
      i.tags, i.status, i.count, i.is_demo, i.created_at
    );
  }

  // 4. Seed sample Alerts
  const insertAlert = db.prepare(`
    INSERT INTO alerts (id, finding_id, severity, title, message, channel, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAlert.run(
    'alert_01',
    'find_demo_01',
    'CRITICAL',
    'Urgent: Active Brand Impersonation Domain Detected',
    'Domain "apextech-login.com" was confirmed active and impersonating Apex Global Technologies SSO login page.',
    'IN_APP',
    'UNREAD',
    pastHours(4)
  );

  insertAlert.run(
    'alert_02',
    'find_demo_04',
    'CRITICAL',
    'CISA KEV Alert: Actively Exploited PAN-OS Vulnerability',
    'CVE-2024-3400 added to CISA Known Exploited Vulnerabilities catalog. Requires immediate infrastructure review.',
    'IN_APP',
    'UNREAD',
    pastHours(36)
  );

  // 5. Seed initial audit log
  db.prepare(`
    INSERT INTO audit_logs (id, user_email, action, target_type, target_id, details, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'log_init_01',
    'system@darkwatch.ai',
    'PLATFORM_INITIALIZATION',
    'SYSTEM',
    'darkwatch-core',
    'Initialized DarkWatch AI core database, lawful CTI connectors, and default authorized asset profile.',
    '127.0.0.1',
    pastHours(720)
  );

  // 6. Seed platform settings
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO platform_settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `);
  insertSetting.run('retention_days', '90', new Date().toISOString());
  insertSetting.run('safe_mode_enabled', 'true', new Date().toISOString());
  insertSetting.run('alert_threshold', 'MEDIUM', new Date().toISOString());
  insertSetting.run('email_notifications_enabled', 'false', new Date().toISOString());
  insertSetting.run('notification_email', 'security-alerts@apextech.io', new Date().toISOString());
}
