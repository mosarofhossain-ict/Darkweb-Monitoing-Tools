import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, db } from './server/db.js';
import {
  syncCisaKev,
  syncUrlhaus,
  syncThreatFox,
  syncVirusTotal,
  syncHaveIBeenPwned,
  queryVirusTotal,
  queryHaveIBeenPwned,
  queryCertificateTransparency,
  generateLookalikeDomains,
  safeInspectUrl,
} from './server/connectors.js';
import { analyzeFindingWithGemini, askSocAnalystAssistant } from './server/gemini.js';
import { generateCsvReport, generateDocxReport } from './server/reports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database
initDatabase();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit log helper
function logAudit(email: string, action: string, targetType: string, targetId: string, details: string, req: express.Request) {
  try {
    const ip = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress || '127.0.0.1';
    db.prepare(`
      INSERT INTO audit_logs (id, user_email, action, target_type, target_id, details, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email,
      action,
      targetType,
      targetId,
      details,
      ip,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Health & Platform Status
app.get('/api/health', (req, res) => {
  const brandCount = (db.prepare('SELECT COUNT(*) as c FROM brands').get() as any).c;
  const findingCount = (db.prepare('SELECT COUNT(*) as c FROM findings').get() as any).c;
  res.json({
    status: 'ONLINE',
    platform: 'DarkWatch AI — Cyber Intelligence & Brand Protection',
    version: '2.5.0-production',
    lawful_cti_mode: true,
    db: 'SQLite (WAL Mode)',
    uptime: process.uptime(),
    metrics: { brands: brandCount, findings: findingCount },
    timestamp: new Date().toISOString(),
  });
});

// 2. Dashboard Stats & Posture
app.get('/api/stats', (req, res) => {
  try {
    const brandsCount = (db.prepare("SELECT COUNT(*) as c FROM brands WHERE status = 'ACTIVE'").get() as any).c;
    const totalFindings = (db.prepare("SELECT COUNT(*) as c FROM findings").get() as any).c;
    const criticalFindings = (db.prepare("SELECT COUNT(*) as c FROM findings WHERE severity = 'CRITICAL' AND status != 'RESOLVED'").get() as any).c;
    const highFindings = (db.prepare("SELECT COUNT(*) as c FROM findings WHERE severity = 'HIGH' AND status != 'RESOLVED'").get() as any).c;
    const openFindings = (db.prepare("SELECT COUNT(*) as c FROM findings WHERE status = 'OPEN'").get() as any).c;
    const unreadAlerts = (db.prepare("SELECT COUNT(*) as c FROM alerts WHERE status = 'UNREAD'").get() as any).c;
    const totalIocs = (db.prepare("SELECT COUNT(*) as c FROM iocs").get() as any).c;

    const severityBreakdown = db.prepare(`
      SELECT severity, COUNT(*) as count 
      FROM findings 
      GROUP BY severity
    `).all() as any[];

    const categoryBreakdown = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM findings 
      GROUP BY category
    `).all() as any[];

    const verificationBreakdown = db.prepare(`
      SELECT verification_status, COUNT(*) as count 
      FROM findings 
      GROUP BY verification_status
    `).all() as any[];

    // Compute Security Posture Score (0-100)
    // Starts at 100, penalized by active critical (-15), high (-7), medium (-3)
    const medFindings = (db.prepare("SELECT COUNT(*) as c FROM findings WHERE severity = 'MEDIUM' AND status != 'RESOLVED'").get() as any).c;
    const postureScore = Math.max(25, Math.min(100, 100 - (criticalFindings * 12 + highFindings * 5 + medFindings * 2)));

    // Connector summary
    const connectors = db.prepare('SELECT id, name, category, status, enabled, last_sync, record_count FROM connectors').all();

    // 14-day trend simulation/points
    const trendDays: Array<{ date: string; findings: number; iocs: number }> = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      // Seed with plausible distribution
      const baseF = (i % 3 === 0 ? 3 : (i % 2 === 0 ? 1 : 2));
      const baseI = (i % 4 === 0 ? 6 : (i % 2 === 0 ? 3 : 4));
      trendDays.push({
        date: dateStr,
        findings: i === 0 ? openFindings : baseF,
        iocs: i === 0 ? totalIocs : baseI * 2,
      });
    }

    res.json({
      brandsCount,
      totalFindings,
      criticalFindings,
      highFindings,
      openFindings,
      unreadAlerts,
      totalIocs,
      postureScore,
      severityBreakdown,
      categoryBreakdown,
      verificationBreakdown,
      connectors,
      trendDays,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Brands Management
app.get('/api/brands', (req, res) => {
  try {
    const brands = db.prepare('SELECT * FROM brands ORDER BY created_at DESC').all();
    res.json(brands.map((b: any) => ({
      ...b,
      additional_domains: JSON.parse(b.additional_domains || '[]'),
      keywords: JSON.parse(b.keywords || '[]'),
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brands', (req, res) => {
  try {
    const { name, legal_name, primary_domain, additional_domains, keywords, contact_email, authorized_by } = req.body;
    if (!name || !primary_domain) {
      return res.status(400).json({ error: 'Brand name and primary domain are required' });
    }

    const cleanDomain = primary_domain.replace(/^(https?:\/\/)?(www\.)?/, '').trim().toLowerCase();
    const id = `brand_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO brands (id, name, legal_name, primary_domain, additional_domains, keywords, contact_email, authorized_by, authorization_date, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      legal_name ? legal_name.trim() : name.trim(),
      cleanDomain,
      JSON.stringify(Array.isArray(additional_domains) ? additional_domains : []),
      JSON.stringify(Array.isArray(keywords) ? keywords : [name.trim()]),
      contact_email || 'security@' + cleanDomain,
      authorized_by || 'Corporate Security Officer',
      now,
      'ACTIVE',
      now,
      now
    );

    logAudit('operator@darkwatch.ai', 'ADD_BRAND', 'BRAND', id, `Added authorized brand ${name} (${cleanDomain})`, req);
    res.json({ success: true, id, message: 'Authorized brand added successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/brands/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM brands WHERE id = ?').run(id);
    logAudit('operator@darkwatch.ai', 'DELETE_BRAND', 'BRAND', id, `Removed brand ${id}`, req);
    res.json({ success: true, message: 'Brand deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Findings & CTI Alerts
app.get('/api/findings', (req, res) => {
  try {
    const { brand_id, category, severity, status, verification_status, search, is_demo } = req.query;
    let query = 'SELECT f.*, b.name as brand_name FROM findings f LEFT JOIN brands b ON f.brand_id = b.id WHERE 1=1';
    const params: any[] = [];

    if (brand_id && brand_id !== 'ALL') {
      query += ' AND f.brand_id = ?';
      params.push(brand_id);
    }
    if (category && category !== 'ALL') {
      query += ' AND f.category = ?';
      params.push(category);
    }
    if (severity && severity !== 'ALL') {
      query += ' AND f.severity = ?';
      params.push(severity);
    }
    if (status && status !== 'ALL') {
      query += ' AND f.status = ?';
      params.push(status);
    }
    if (verification_status && verification_status !== 'ALL') {
      query += ' AND f.verification_status = ?';
      params.push(verification_status);
    }
    if (is_demo !== undefined && is_demo !== 'ALL') {
      query += ' AND f.is_demo = ?';
      params.push(is_demo === '1' || is_demo === 'true' ? 1 : 0);
    }
    if (search) {
      query += ' AND (f.title LIKE ? OR f.target_asset LIKE ? OR f.evidence_ref LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY f.created_at DESC';
    const findings = db.prepare(query).all(...params);

    res.json(findings.map((f: any) => ({
      ...f,
      evidence_details: f.evidence_details ? JSON.parse(f.evidence_details) : {},
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/findings/:id', (req, res) => {
  try {
    const finding = db.prepare(`
      SELECT f.*, b.name as brand_name, b.primary_domain as brand_domain
      FROM findings f 
      LEFT JOIN brands b ON f.brand_id = b.id 
      WHERE f.id = ?
    `).get(req.params.id) as any;

    if (!finding) return res.status(404).json({ error: 'Finding not found' });
    res.json({
      ...finding,
      evidence_details: finding.evidence_details ? JSON.parse(finding.evidence_details) : {},
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/findings/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['OPEN', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.prepare('UPDATE findings SET status = ? WHERE id = ?').run(status, id);
    logAudit('operator@darkwatch.ai', 'UPDATE_FINDING_STATUS', 'FINDING', id, `Updated finding status to ${status}`, req);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/findings/:id/ai-analyze', async (req, res) => {
  try {
    const { id } = req.params;
    const finding = db.prepare('SELECT * FROM findings WHERE id = ?').get(id) as any;
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    const analysis = await analyzeFindingWithGemini(finding);

    // Save summary back to finding
    db.prepare('UPDATE findings SET ai_summary = ? WHERE id = ?').run(analysis.executiveSummary, id);
    logAudit('operator@darkwatch.ai', 'AI_ANALYZE_FINDING', 'FINDING', id, `Executed AI threat analysis for ${finding.title}`, req);

    res.json({ success: true, analysis });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Interactive SOC AI Analyst Assistant
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    const recentFindings = db.prepare('SELECT * FROM findings ORDER BY created_at DESC LIMIT 8').all();
    const answer = await askSocAnalystAssistant(query, recentFindings);

    res.json({ answer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Indicators of Compromise (IOCs)
app.get('/api/iocs', (req, res) => {
  try {
    const { type, status, search, is_demo } = req.query;
    let query = 'SELECT * FROM iocs WHERE 1=1';
    const params: any[] = [];

    if (type && type !== 'ALL') {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (is_demo !== undefined && is_demo !== 'ALL') {
      query += ' AND is_demo = ?';
      params.push(is_demo === '1' || is_demo === 'true' ? 1 : 0);
    }
    if (search) {
      query += ' AND (value LIKE ? OR malware_family LIKE ? OR threat_type LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';
    const iocs = db.prepare(query).all(...params);

    res.json(iocs.map((i: any) => ({
      ...i,
      tags: i.tags ? JSON.parse(i.tags) : [],
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/iocs', (req, res) => {
  try {
    const { type, value, threat_type, malware_family, confidence, source, tags } = req.body;
    if (!type || !value) return res.status(400).json({ error: 'Type and value are required' });

    const id = `ioc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO iocs (id, type, value, threat_type, malware_family, confidence, source, first_seen, last_seen, tags, status, is_demo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type,
      value.trim(),
      threat_type || 'Malware',
      malware_family || 'Custom Submission',
      Number(confidence) || 90,
      source || 'Manual Analyst Submission',
      now,
      now,
      JSON.stringify(Array.isArray(tags) ? tags : ['manual_entry']),
      'ACTIVE',
      0,
      now
    );

    logAudit('operator@darkwatch.ai', 'ADD_IOC', 'IOC', id, `Added IOC ${type}:${value}`, req);
    res.json({ success: true, id, message: 'IOC added to threat repository' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/iocs/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM iocs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/iocs/export', (req, res) => {
  try {
    const format = req.query.format || 'json';
    const iocs = db.prepare('SELECT * FROM iocs ORDER BY created_at DESC').all() as any[];

    if (format === 'stix') {
      // Return STIX 2.1 compliant bundle
      const stixObjects = iocs.map(ioc => ({
        type: 'indicator',
        spec_version: '2.1',
        id: `indicator--${ioc.id}`,
        created: ioc.created_at,
        modified: ioc.last_seen,
        name: `${ioc.threat_type}: ${ioc.value}`,
        pattern_type: 'stix',
        pattern: `[${ioc.type.toLowerCase()}-addr:value = '${ioc.value}']`,
        valid_from: ioc.first_seen,
        confidence: ioc.confidence,
        labels: ioc.tags ? JSON.parse(ioc.tags) : [],
        external_references: [{ source_name: ioc.source }],
      }));

      const stixBundle = {
        type: 'bundle',
        id: `bundle--${Date.now()}`,
        objects: stixObjects,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="darkwatch-iocs-stix2.1.json"');
      return res.send(JSON.stringify(stixBundle, null, 2));
    }

    if (format === 'csv') {
      const csv = [
        'ID,Type,Value,Threat Type,Malware Family,Confidence,Source,First Seen,Status',
        ...iocs.map(i => `"${i.id}","${i.type}","${i.value}","${i.threat_type}","${i.malware_family || ''}","${i.confidence}%","${i.source}","${i.first_seen}","${i.status}"`)
      ].join('\r\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="darkwatch-iocs.csv"');
      return res.send(csv);
    }

    res.json(iocs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Connectors Sync & Public Feeds
app.get('/api/connectors', (req, res) => {
  try {
    const connectors = db.prepare('SELECT * FROM connectors').all();
    res.json(connectors.map((c: any) => ({
      ...c,
      config: c.config ? JSON.parse(c.config) : {},
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/connectors/sync/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let result;

    if (id === 'cisa-kev') {
      result = await syncCisaKev();
    } else if (id === 'urlhaus') {
      result = await syncUrlhaus();
    } else if (id === 'threatfox') {
      result = await syncThreatFox();
    } else if (id === 'virustotal') {
      result = await syncVirusTotal();
    } else if (id === 'hibp') {
      result = await syncHaveIBeenPwned();
    } else if (id === 'crt-sh') {
      const primaryBrand = db.prepare('SELECT primary_domain FROM brands LIMIT 1').get() as any;
      const domain = primaryBrand ? primaryBrand.primary_domain : 'apextech.io';
      const certs = await queryCertificateTransparency(domain);
      db.prepare(`
        UPDATE connectors 
        SET last_sync = ?, record_count = record_count + ?, status = 'HEALTHY'
        WHERE id = 'crt-sh'
      `).run(new Date().toISOString(), certs.length);
      result = {
        connectorId: 'crt-sh',
        success: true,
        message: `Queried crt.sh public Certificate Transparency logs for ${domain}. Processed ${certs.length} certificates.`,
        recordsSynced: certs.length,
        newFindings: 0,
      };
    } else {
      return res.status(400).json({
        error: `Connector ${id} requires a valid API key or provider license. Check platform settings.`,
      });
    }

    logAudit('operator@darkwatch.ai', 'SYNC_CONNECTOR', 'CONNECTOR', id, result.message, req);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// VirusTotal Live Lookup API
app.post('/api/virustotal/lookup', async (req, res) => {
  try {
    const { target, type } = req.body;
    if (!target) return res.status(400).json({ error: 'Target indicator is required' });
    const data = await queryVirusTotal(target, type || 'domain');
    logAudit('operator@darkwatch.ai', 'VIRUSTOTAL_LOOKUP', 'INDICATOR', target, `Queried VirusTotal API v3 (${type})`, req);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Have I Been Pwned Breach Catalog Lookup API
app.post('/api/hibp/lookup', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Domain or search query is required' });
    const data = await queryHaveIBeenPwned(query);
    logAudit('operator@darkwatch.ai', 'HIBP_LOOKUP', 'BREACH', query, `Queried HIBP API v3 breach catalog for ${query}`, req);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Impersonation & Typosquatting Engine
app.post('/api/impersonation/check', async (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain is required' });

    const clean = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const lookalikes = generateLookalikeDomains(clean);

    // Also query certificate transparency logs
    const certs = await queryCertificateTransparency(clean);

    res.json({
      baseDomain: clean,
      lookalikeCount: lookalikes.length,
      lookalikes: lookalikes.slice(0, 25),
      certificateLogsCount: certs.length,
      recentCertificates: certs.slice(0, 10).map((c: any) => ({
        id: c.id,
        logged_at: c.entry_timestamp,
        not_before: c.not_before,
        not_after: c.not_after,
        common_name: c.common_name,
        name_value: c.name_value,
        issuer_name: c.issuer_name,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Safe Server-Side URL Inspector (Zero automated visits)
app.post('/api/url-analyzer', (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const result = safeInspectUrl(url);
    logAudit('operator@darkwatch.ai', 'SAFE_URL_INSPECT', 'URL', url, `Inspected URL metadata safely. Risk: ${result.safeAnalysis.riskLevel}`, req);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Alerts Management
app.get('/api/alerts', (req, res) => {
  try {
    const alerts = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50').all();
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/alerts/:id/read', (req, res) => {
  try {
    db.prepare("UPDATE alerts SET status = 'READ' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts/test', (req, res) => {
  try {
    const { severity, title, message } = req.body;
    const id = `alert_test_${Date.now()}`;
    db.prepare(`
      INSERT INTO alerts (id, finding_id, severity, title, message, channel, status, created_at)
      VALUES (?, NULL, ?, ?, ?, 'IN_APP', 'UNREAD', ?)
    `).run(
      id,
      severity || 'HIGH',
      title || 'Simulated SOC Test Alert',
      message || 'This is a test notification confirming that DarkWatch AI incident alerting is operational.',
      new Date().toISOString()
    );

    res.json({ success: true, id, message: 'Test alert generated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Reports Generation (DOCX & CSV)
app.get('/api/reports/csv', (req, res) => {
  try {
    const { scopeBrandId, category, severity, includeDemo } = req.query;
    const csvContent = generateCsvReport({
      scopeBrandId: scopeBrandId as string,
      category: category as string,
      severity: severity as string,
      includeDemo: includeDemo === 'true' || includeDemo === '1',
    });

    logAudit('operator@darkwatch.ai', 'EXPORT_REPORT_CSV', 'REPORT', 'csv', 'Exported CSV findings report', req);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="darkwatch-threat-report.csv"');
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/docx', async (req, res) => {
  try {
    const { scopeBrandId, category, severity, includeDemo } = req.query;
    const docxBuffer = await generateDocxReport({
      scopeBrandId: scopeBrandId as string,
      category: category as string,
      severity: severity as string,
      includeDemo: includeDemo === 'true' || includeDemo === '1',
    });

    logAudit('operator@darkwatch.ai', 'EXPORT_REPORT_DOCX', 'REPORT', 'docx', 'Exported DOCX executive report', req);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="darkwatch-executive-threat-report.docx"');
    res.send(docxBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Audit Logs & Settings
app.get('/api/audit-logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    const settingsRows = db.prepare('SELECT key, value FROM platform_settings').all() as any[];
    const settings: Record<string, string> = {};
    for (const s of settingsRows) {
      settings[s.key] = s.value;
    }
    res.json({
      settings,
      keysStatus: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        hibp: Boolean(process.env.HIBP_API_KEY),
        virusTotal: Boolean(process.env.VIRUSTOTAL_API_KEY),
        darkWebFeed: Boolean(process.env.DARKWEB_FEED_API_KEY),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const { settings } = req.body;
    if (settings && typeof settings === 'object') {
      const stmt = db.prepare('INSERT OR REPLACE INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?)');
      const now = new Date().toISOString();
      for (const [k, v] of Object.entries(settings)) {
        stmt.run(k, String(v), now);
      }
      logAudit('operator@darkwatch.ai', 'UPDATE_SETTINGS', 'SYSTEM', 'settings', 'Updated platform configuration', req);
    }
    res.json({ success: true, message: 'Settings saved' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STATIC ASSETS & VITE INTEGRATION
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DarkWatch AI] Cyber Intelligence & Brand Protection platform active on port ${PORT}`);
  });
}

startServer();
