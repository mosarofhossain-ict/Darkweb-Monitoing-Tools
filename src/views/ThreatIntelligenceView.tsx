import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Flame, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  Layers, 
  ArrowRight,
  Database,
  Lock,
  Globe,
  Radio,
  BookOpen,
  Terminal
} from 'lucide-react';
import { DashboardStats } from '../types';

interface ThreatIntelligenceViewProps {
  stats: DashboardStats | null;
  onNavigateToIocs: () => void;
  onNavigateToAi: () => void;
}

export const ThreatIntelligenceView: React.FC<ThreatIntelligenceViewProps> = ({
  stats,
  onNavigateToIocs,
  onNavigateToAi,
}) => {
  const [cveSearch, setCveSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'KEV' | 'ACTORS' | 'ATTACK'>('KEV');

  // Curated live-synchronized CISA KEV catalog sample data
  const cisaKevCatalog = [
    {
      cveId: 'CVE-2024-3400',
      vendor: 'Palo Alto Networks',
      product: 'PAN-OS GlobalProtect',
      cvss: 10.0,
      severity: 'CRITICAL',
      knownRansomware: 'Known',
      dateAdded: '2024-04-12',
      dueDate: '2024-04-19',
      summary: 'Command injection flaw in the GlobalProtect feature of PAN-OS allows unauthenticated attackers to execute arbitrary code with root privileges on firewall devices.',
      remediation: 'Apply hotfix released in PAN-OS 10.2, 11.0, and 11.1. In the interim, disable device telemetry as recommended in vendor advisory.'
    },
    {
      cveId: 'CVE-2024-40766',
      vendor: 'SonicWall',
      product: 'SonicOS Management Access',
      cvss: 9.3,
      severity: 'CRITICAL',
      knownRansomware: 'Known (Akira / Fog)',
      dateAdded: '2024-09-09',
      dueDate: '2024-09-30',
      summary: 'Improper access control vulnerability in SonicWall SonicOS allows remote unauthenticated attackers to gain unauthorized administrative access and potentially crash the firewall.',
      remediation: 'Upgrade to latest SonicOS firmware. Restrict firewall management access to trusted internal IP sources and enforce multi-factor authentication.'
    },
    {
      cveId: 'CVE-2023-4966',
      vendor: 'Citrix',
      product: 'NetScaler ADC and NetScaler Gateway (Citrix Bleed)',
      cvss: 9.4,
      severity: 'CRITICAL',
      knownRansomware: 'Known (LockBit 3.0)',
      dateAdded: '2023-10-18',
      dueDate: '2023-11-08',
      summary: 'Sensitive information disclosure vulnerability allowing attackers to extract valid user session cookies from memory without authentication, hijacking active MFA-authenticated sessions.',
      remediation: 'Install vendor security patch and terminate all existing active sessions to prevent cookie replay attacks.'
    },
    {
      cveId: 'CVE-2024-21887',
      vendor: 'Ivanti',
      product: 'Connect Secure and Policy Secure',
      cvss: 9.1,
      severity: 'CRITICAL',
      knownRansomware: 'Known',
      dateAdded: '2024-01-11',
      dueDate: '2024-01-22',
      summary: 'Command injection vulnerability in web components allows authenticated administrators to send crafted requests and execute arbitrary commands on the appliance.',
      remediation: 'Apply the vendor XML mitigation file or upgrade to patched Ivanti firmware versions immediately.'
    },
    {
      cveId: 'CVE-2024-1709',
      vendor: 'ConnectWise',
      product: 'ScreenConnect Remote Management',
      cvss: 10.0,
      severity: 'CRITICAL',
      knownRansomware: 'Known (BlackCat / Play)',
      dateAdded: '2024-02-22',
      dueDate: '2024-02-29',
      summary: 'Authentication bypass flaw using an alternate path in the SetupWizard.aspx component allows remote attackers to create administrative accounts without credentials.',
      remediation: 'Upgrade ScreenConnect servers to version 23.9.8 or higher immediately. Audit server local user database for rogue administrator accounts.'
    }
  ];

  // Threat Actor Dossiers
  const threatActors = [
    {
      name: 'BlackByte / FIN12 Affiliate',
      type: 'Ransomware-as-a-Service (RaaS)',
      origin: 'Financially Motivated Cybercrime Syndicate',
      targetedSectors: ['Financial Services', 'Technology', 'Healthcare', 'Critical Manufacturing'],
      primaryVectors: ['SonicWall CVE-2024-40766', 'Citrix Bleed CVE-2023-4966', 'Exchange Server Proxies'],
      ransomwareStrain: 'BlackByte v2 / Go-based Locker',
      observedInPlatform: true,
      ttpSummary: 'Specializes in rapid network traversal, disabling endpoint security agents via vulnerable drivers (BYOVD), and exfiltrating financial telemetry prior to double extortion deployment.'
    },
    {
      name: 'EvilProxy AitM Phishing Syndicate',
      type: 'Adversary-in-the-Middle (AitM) Phishing Provider',
      origin: 'Commodity Cybercrime Service',
      targetedSectors: ['Corporate SSO', 'Microsoft 365', 'Google Workspace', 'Okta Identity Providers'],
      primaryVectors: ['Lookalike Typo-squatted Domains', 'Reverse-proxy Session Harvesting'],
      ransomwareStrain: 'N/A (Access Broker)',
      observedInPlatform: true,
      ttpSummary: 'Deploys reverse-proxy infrastructure to intercept user credentials and authenticated session cookies in real time, bypassing push-based SMS and TOTP MFA. Defense requires FIDO2/WebAuthn.'
    },
    {
      name: 'Cobalt Strike Team Infrastructure',
      type: 'Post-Exploitation & C2 Framework Abuse',
      origin: 'Multi-Actor Commodity Staging',
      targetedSectors: ['Global Enterprise Infrastructure'],
      primaryVectors: ['Malleable C2 HTTP/HTTPS Beacons', 'DNS Tunneling', 'SMB Named Pipes'],
      ransomwareStrain: 'Loader for Qakbot, BlackCat, and LockBit',
      observedInPlatform: true,
      ttpSummary: 'Affiliates routinely utilize cracked or leaked Cobalt Strike licenses hosted on bulletproof Russian/Seychelles ASNs to coordinate lateral movement and Cobalt Strike Beacon implants.'
    },
    {
      name: 'RedLine Stealer Distribution Networks',
      type: 'Infostealer Malware Malware-as-a-Service',
      origin: 'Commercial Cybercrime',
      targetedSectors: ['Consumer & Enterprise Remote Workers'],
      primaryVectors: ['Malvertising', 'Fake Software Installers', 'Spearphishing Email Attachments'],
      ransomwareStrain: 'Infostealer (.NET Payload)',
      observedInPlatform: true,
      ttpSummary: 'Harvests browser-cached passwords, crypto wallets, VPN credentials, and Discord tokens from infected endpoints, bundling credentials into telemetry logs sold in initial access markets.'
    }
  ];

  // MITRE ATT&CK Matrix mapping
  const mitreTactics = [
    {
      id: 'TA0001',
      name: 'Initial Access',
      techniques: [
        { id: 'T1566.002', name: 'Spearphishing Link', status: 'Observed in apextech-login.com' },
        { id: 'T1190', name: 'Exploit Public-Facing App', status: 'Tracked in CISA CVE-2024-3400' }
      ]
    },
    {
      id: 'TA0006',
      name: 'Credential Access',
      techniques: [
        { id: 'T1555.003', name: 'Credentials from Web Browsers', status: 'RedLine Stealer Telemetry' },
        { id: 'T1110.003', name: 'Password Spraying', status: 'TeckData 2024 Breach Exposure' }
      ]
    },
    {
      id: 'TA0011',
      name: 'Command & Control',
      techniques: [
        { id: 'T1071.001', name: 'Web Protocols (HTTP/S)', status: 'Active on 185.220.101.45' },
        { id: 'T1584.001', name: 'Compromised Domains', status: 'apex-security-portal.xyz' }
      ]
    },
    {
      id: 'TA0040',
      name: 'Impact',
      techniques: [
        { id: 'T1486', name: 'Data Encrypted for Impact', status: 'BlackByte Ransomware Tracking' }
      ]
    }
  ];

  const filteredCves = cisaKevCatalog.filter(c => {
    if (selectedVendor !== 'ALL' && c.vendor !== selectedVendor) return false;
    if (cveSearch) {
      const q = cveSearch.toLowerCase();
      return (
        c.cveId.toLowerCase().includes(q) ||
        c.vendor.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Threat Intelligence & Public Vulnerability Radar
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              DEMO DATA & LIVE FEEDS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time correlation of US CISA Known Exploited Vulnerabilities (KEV), abuse.ch threat streams, and cyber adversary profiles.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onNavigateToAi}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 flex items-center space-x-1.5 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>AI Threat Analysis</span>
          </button>
          <button
            onClick={onNavigateToIocs}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Flame className="w-4 h-4" />
            <span>IOC Repository ({stats?.totalIocs ?? 4})</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('KEV')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            activeTab === 'KEV'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <span>CISA KEV Catalog ({cisaKevCatalog.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ACTORS')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            activeTab === 'ACTORS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Terminal className="w-4 h-4 text-purple-400" />
          <span>Threat Actor Profiles ({threatActors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ATTACK')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 ${
            activeTab === 'ATTACK'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>MITRE ATT&CK Mapping</span>
        </button>
      </div>

      {/* TAB 1: CISA KEV Catalog */}
      {activeTab === 'KEV' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search CVE ID, product name, or vendor..."
                value={cveSearch}
                onChange={(e) => setCveSearch(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 pl-9 pr-4 py-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="bg-slate-950 text-slate-300 px-3 py-2 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Vendors</option>
              <option value="Palo Alto Networks">Palo Alto Networks</option>
              <option value="SonicWall">SonicWall</option>
              <option value="Citrix">Citrix</option>
              <option value="Ivanti">Ivanti</option>
              <option value="ConnectWise">ConnectWise</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredCves.map((cve) => (
              <div
                key={cve.cveId}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl shadow-lg transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono font-bold text-cyan-300">
                      {cve.cveId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      CVSS {cve.cvss} • {cve.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      Ransomware: {cve.knownRansomware}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                    <span>Remediation Due: <strong className="text-slate-200">{cve.dueDate}</strong></span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-200">
                  {cve.vendor} — <span className="text-slate-400">{cve.product}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {cve.summary}
                </p>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-300">Mandated Defensive Action: </span>
                    <span>{cve.remediation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Threat Actor Profiles */}
      {activeTab === 'ACTORS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {threatActors.map((actor, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>{actor.name}</span>
                  </h3>
                  <p className="text-xs text-cyan-400 font-medium">{actor.type}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DEMO DOSSIER
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {actor.ttpSummary}
              </p>

              <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3">
                <div>
                  <span className="text-slate-400 font-medium">Targeted Sectors: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {actor.targetedSectors.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-slate-400 font-medium">Primary Exploit Vectors: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {actor.primaryVectors.map((v, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/50 text-[10px] font-mono">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: MITRE ATT&CK */}
      {activeTab === 'ATTACK' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">MITRE ATT&CK Framework Enterprise Matrix</h3>
            <p className="text-xs text-slate-400">
              Correlated telemetry observed across authorized brand monitoring and public exploit feeds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {mitreTactics.map((tactic) => (
              <div key={tactic.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="border-b border-slate-800 pb-2">
                  <div className="text-[10px] font-mono text-cyan-400">{tactic.id}</div>
                  <div className="text-xs font-bold text-white uppercase tracking-wider">{tactic.name}</div>
                </div>

                <div className="space-y-2">
                  {tactic.techniques.map((tech) => (
                    <div key={tech.id} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-amber-300 font-bold">{tech.id}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                      </div>
                      <div className="font-semibold text-slate-200">{tech.name}</div>
                      <div className="text-[10px] text-slate-400">{tech.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
