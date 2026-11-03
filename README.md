# DarkWatch AI — Cyber Intelligence & Brand Protection Platform

A professional, local-first security intelligence platform for authorized corporate brand monitoring, public data-leak exposure monitoring, dark-web threat intelligence alerts from lawful and approved sources, phishing detection, and AI-assisted threat analysis.

---

## Key Modules

1. **Overview Dashboard**: High-level SOC view with security posture scoring (0-100), severity breakdown, 14-day threat velocity chart, connector health grid, and real-time finding feed.
2. **Brand & Domain Monitoring**: Authorized corporate asset management, trademark keyword tracking, algorithmic typosquatting/lookalike domain generator (homoglyphs, AitM keywords, TLD substitutions), and Certificate Transparency (crt.sh) logs.
3. **Data Leak Exposure**: Corporate domain and email exposure audits across public breach compilations. Tracks only metadata attributes (breach title, leak timestamp, exposed fields, salted hash indicators). **Zero plaintext passwords, tokens, or payment records are stored.**
4. **Dark Web Intelligence**: Normalized connector framework for lawful, approved CTI providers and public disclosure feeds (ransomware victim portals, threat actor campaign telemetry). **Strictly does not crawl, scrape, or interact with illicit dark-web marketplaces or unauthorized onion services.**
5. **Phishing & Impersonation**: Identifies malicious infrastructure and AitM phishing kits from URLhaus feeds. Includes a **Safe Server-Side URL Inspector** that evaluates query entropy and deceptive patterns without making automated HTTP visits to the destination.
6. **Threat Intelligence & IOCs**: Repository for IPs, Domains, URLs, MD5, and SHA-256 hashes. Deduplication, confidence scoring, malware family attribution, and one-click export to STIX 2.1 JSON and CSV formats.
7. **AI Threat Analyst Studio**: Powered server-side by Gemini 3.8 Flash (`@google/genai`). Generates executive summaries, technical threat breakdowns, MITRE ATT&CK technique mapping, prioritized defensive playbooks (DNS sinkholes, WAF rules), and false-positive assessments. Includes an interactive SOC Analyst Assistant.
8. **Incident Alerts & Triage**: Configurable severity thresholds, notification streams, acknowledgment tracking, and a built-in test alert simulator.
9. **Reports & Exports**: Multi-format reporting engine supporting DOCX (Microsoft Word), printable PDF view, and CSV data export with lawful compliance disclosures and defensive recommendations.
10. **Connectors & Settings**: Live synchronization controls for CISA KEV, abuse.ch URLhaus, abuse.ch ThreatFox, and crt.sh. Configurable data retention policies and immutable operator security audit logging.

---

## Lawful Sourcing & Ethical Standard

DarkWatch AI strictly enforces lawful and ethical cyber intelligence principles:
- **No Illicit Tor/Onion Scraping**: The platform never crawls, scrapes, or logs into dark-web marketplaces or unauthorized hidden services.
- **Zero Plaintext Credentials**: No passwords, cookies, or personal consumer data are harvested or persisted.
- **Explicit Demo Data Tagging**: Sample scenarios are clearly designated with `[DEMO DATA]` badges to ensure evidentiary integrity and transparency.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, tsx
- **Database**: SQLite via `better-sqlite3` (WAL mode enabled)
- **AI Engine**: Gemini 3.8 Flash via `@google/genai` (Server-Side only)
- **Report Export**: `docx` for Word document generation, `jspdf` / print stylesheets for PDF

---

## Database Schema (SQLite)

- `brands`: Authorized brand records, verified primary/secondary domains, monitored keywords, and compliance authorization signatures.
- `findings`: Evaluated incident records, severity ratings, evidence references, verification statuses, and AI threat summaries.
- `iocs`: Threat indicators (IP, DOMAIN, URL, MD5, SHA256), malware families, confidence scores, and tags.
- `connectors`: External intelligence feed configurations, sync timestamps, and record counts.
- `alerts`: In-app incident notifications and delivery states.
- `audit_logs`: Operator actions, timestamps, and IP addresses.
- `platform_settings`: Retention periods and security scanning policies.

---

## Local Setup & Development

### 1. Prerequisites
- Node.js >= 20
- npm >= 9

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure optional threat intelligence provider keys if available:
```env
# Gemini API Key (Required for AI Threat Analyst reasoning)
GEMINI_API_KEY="your-gemini-api-key"

# Application URL
APP_URL="http://localhost:3000"

# Optional External API Keys (Leave blank to use free public feeds and demo data)
HIBP_API_KEY=""
VIRUSTOTAL_API_KEY=""
DARKWEB_FEED_URL=""
DARKWEB_FEED_API_KEY=""
```

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Start full-stack development server on port 3000
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## Security Architecture

- **Server-Side API Key Storage**: External API keys and secrets are never exposed to the client bundle.
- **Safe URL Analysis**: URLs submitted to the inspector are parsed and evaluated syntactically on the server; the server never initiates network calls to unverified or suspicious external hosts.
- **Auditing**: All administrative additions, status changes, and report exports are logged to the `audit_logs` table.
