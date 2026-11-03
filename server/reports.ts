import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, Packer, AlignmentType } from 'docx';
import { db } from './db.js';

export interface ReportOptions {
  scopeBrandId?: string;
  category?: string;
  severity?: string;
  status?: string;
  includeDemo?: boolean;
}

export function getFilteredFindingsForReport(options: ReportOptions) {
  let query = 'SELECT * FROM findings WHERE 1=1';
  const params: any[] = [];

  if (options.scopeBrandId && options.scopeBrandId !== 'ALL') {
    query += ' AND brand_id = ?';
    params.push(options.scopeBrandId);
  }

  if (options.category && options.category !== 'ALL') {
    query += ' AND category = ?';
    params.push(options.category);
  }

  if (options.severity && options.severity !== 'ALL') {
    query += ' AND severity = ?';
    params.push(options.severity);
  }

  if (!options.includeDemo) {
    query += ' AND is_demo = 0';
  }

  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params) as any[];
}

/**
 * Generate CSV Report
 */
export function generateCsvReport(options: ReportOptions): string {
  const findings = getFilteredFindingsForReport(options);

  const headers = [
    'Finding ID',
    'Title',
    'Category',
    'Severity',
    'Status',
    'Verification Status',
    'Confidence Score',
    'Source',
    'Target Asset',
    'Evidence Reference',
    'Is Demo Data',
    'First Seen',
    'Created Date'
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = findings.map(f => [
    escapeCsv(f.id),
    escapeCsv(f.title),
    escapeCsv(f.category),
    escapeCsv(f.severity),
    escapeCsv(f.status),
    escapeCsv(f.verification_status),
    escapeCsv(f.confidence + '%'),
    escapeCsv(f.source),
    escapeCsv(f.target_asset),
    escapeCsv(f.evidence_ref),
    escapeCsv(f.is_demo ? 'YES (DEMO DATA)' : 'NO (LIVE FEED)'),
    escapeCsv(f.first_seen),
    escapeCsv(f.created_at)
  ].join(','));

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Generate DOCX Report using docx library
 */
export async function generateDocxReport(options: ReportOptions): Promise<Buffer> {
  const findings = getFilteredFindingsForReport(options);
  const now = new Date();
  const reportDateStr = now.toUTCString();

  const brand = options.scopeBrandId && options.scopeBrandId !== 'ALL'
    ? (db.prepare('SELECT name, primary_domain FROM brands WHERE id = ?').get(options.scopeBrandId) as any)
    : null;

  const scopeLabel = brand ? `${brand.name} (${brand.primary_domain})` : 'All Authorized Corporate Brands & Domains';

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Severity', bold: true, color: 'FFFFFF' })] })], shading: { fill: '0F172A' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Finding Title & Target', bold: true, color: 'FFFFFF' })] })], shading: { fill: '0F172A' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Source & Evidence', bold: true, color: 'FFFFFF' })] })], shading: { fill: '0F172A' } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status & Verification', bold: true, color: 'FFFFFF' })] })], shading: { fill: '0F172A' } }),
      ],
    }),
  ];

  for (const f of findings) {
    const sevColor = f.severity === 'CRITICAL' ? 'DC2626' : (f.severity === 'HIGH' ? 'EA580C' : 'D97706');
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: f.severity, bold: true, color: sevColor }),
                  new TextRun({ text: `\nConf: ${f.confidence}%`, size: 18 }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: f.title, bold: true }),
                  new TextRun({ text: `\nTarget Asset: ${f.target_asset}`, size: 18, color: '475569' }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: f.source, bold: true }),
                  new TextRun({ text: `\nRef: ${f.evidence_ref}`, size: 18, color: '64748B' }),
                  new TextRun({ text: f.is_demo ? '\n[DEMO DATA]' : '\n[LIVE FEED]', size: 16, color: '94A3B8' }),
                ],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: f.verification_status, bold: true }),
                  new TextRun({ text: `\nTriage: ${f.status}`, size: 18 }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'DarkWatch AI — Cyber Threat Intelligence & Brand Protection',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: 'EXECUTIVE THREAT & EXPOSURE REPORT',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Generated: ${reportDateStr} | Scope: ${scopeLabel}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: '1. Executive Summary',
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [
              new TextRun(
                `This report summarizes telemetry and brand exposure findings gathered by DarkWatch AI across authorized corporate perimeters. ` +
                `A total of ${findings.length} findings are currently cataloged, including ${criticalCount} Critical and ${highCount} High priority incidents requiring immediate SOC triage. ` +
                `All telemetry is aggregated strictly from lawful feeds, public catalogs (CISA KEV, URLhaus, ThreatFox), Certificate Transparency logs, and authorized corporate connectors.`
              ),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: '2. Lawful Sourcing & Compliance Limitations',
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [
              new TextRun(
                `Compliance Notice: DarkWatch AI strictly observes legal and ethical boundaries. No illicit forums or restricted onion networks were crawled, scraped, or interacted with directly. ` +
                `In accordance with privacy requirements, DarkWatch does NOT collect, decrypt, or store plaintext user credentials, passwords, or session tokens. ` +
                `Sample data markers ([DEMO DATA]) clearly indicate simulated records where live licensed provider connectors are pending.`
              ),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: '3. Detailed Findings Inventory',
            heading: HeadingLevel.HEADING_3,
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: '4. Immediate Defensive Recommendations',
            heading: HeadingLevel.HEADING_3,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '• DNS Sinkholing: ', bold: true }),
              new TextRun('Add all identified lookalike domains to recursive DNS blocklists across corporate networks.\n'),
              new TextRun({ text: '• Registrar Abuse Takedowns: ', bold: true }),
              new TextRun('Transmit RFC 2142 compliant abuse notifications with cryptographic evidence references to respective registrars.\n'),
              new TextRun({ text: '• Multi-Factor Authentication Hardening: ', bold: true }),
              new TextRun('Enforce phishing-resistant FIDO2/WebAuthn credentials for corporate portals to mitigate AitM reverse-proxy kits.\n'),
              new TextRun({ text: '• Vulnerability Remediation: ', bold: true }),
              new TextRun('Expedite patching for all CVEs tracked in the CISA KEV catalog currently exposed on external perimeters.'),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
