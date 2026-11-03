import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle, 
  Calendar, 
  Layers,
  Building,
  AlertCircle
} from 'lucide-react';
import { Brand, Finding } from '../types';

interface ReportsExportViewProps {
  brands: Brand[];
  findings: Finding[];
}

export const ReportsExportView: React.FC<ReportsExportViewProps> = ({
  brands,
  findings,
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [includeDemo, setIncludeDemo] = useState(true);

  // Filter findings for report preview
  const filteredFindings = findings.filter(f => {
    if (selectedBrandId !== 'ALL' && f.brand_id !== selectedBrandId) return false;
    if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
    if (selectedSeverity !== 'ALL' && f.severity !== selectedSeverity) return false;
    if (!includeDemo && f.is_demo) return false;
    return true;
  });

  const criticalCount = filteredFindings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = filteredFindings.filter(f => f.severity === 'HIGH').length;

  const handleDownloadCsv = () => {
    const params = new URLSearchParams({
      scopeBrandId: selectedBrandId,
      category: selectedCategory,
      severity: selectedSeverity,
      includeDemo: String(includeDemo),
    });
    window.location.href = `/api/reports/csv?${params.toString()}`;
  };

  const handleDownloadDocx = () => {
    const params = new URLSearchParams({
      scopeBrandId: selectedBrandId,
      category: selectedCategory,
      severity: selectedSeverity,
      includeDemo: String(includeDemo),
    });
    window.location.href = `/api/reports/docx?${params.toString()}`;
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const scopeLabel = selectedBrand ? `${selectedBrand.name} (${selectedBrand.primary_domain})` : 'All Authorized Corporate Brands';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Executive Threat & Brand Protection Reports
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Generate formal compliance, executive, and technical threat intelligence reports for CISO leadership and audit boards.
          </p>
        </div>

        {/* 3 Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadDocx}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 flex items-center space-x-1.5 transition-all"
            title="Download Word Document (.docx)"
          >
            <Download className="w-4 h-4" />
            <span>Export DOCX</span>
          </button>

          <button
            onClick={handlePrintPdf}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 flex items-center space-x-1.5 transition-all"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center space-x-1.5 transition-all"
            title="Download CSV spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Scope Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Corporate Brand Scope</label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Authorized Assets ({brands.length})</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.primary_domain})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Category Scope</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="BRAND_IMPERSONATION">Brand Impersonation</option>
              <option value="PHISHING">Phishing & AitM</option>
              <option value="DATA_LEAK">Data Leak Exposure</option>
              <option value="DARKWEB_MENTION">Dark Web Mention</option>
              <option value="VULNERABILITY_EXPLOIT">CISA KEV Exploits</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5">Minimum Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High & Critical</option>
              <option value="MEDIUM">Medium and Above</option>
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center space-x-2 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={includeDemo}
                onChange={(e) => setIncludeDemo(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <span className="text-slate-300 font-medium text-xs">Include [DEMO DATA] Scenarios</span>
            </label>
          </div>
        </div>
      </div>

      {/* Live Document Preview Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-8 print:p-0 print:border-none print:bg-white print:text-black">
        {/* Report Header */}
        <div className="border-b border-slate-800 pb-6 text-center space-y-2">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-widest">
            DarkWatch AI • Cyber Threat Intelligence & Brand Protection
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">
            Executive Cyber Threat & Brand Protection Report
          </h2>
          <p className="text-xs text-slate-400">
            Generated: {new Date().toUTCString()} • Scope: <strong className="text-slate-200">{scopeLabel}</strong> • Total Evaluated Findings: <strong className="text-cyan-400">{filteredFindings.length}</strong>
          </p>
        </div>

        {/* Section 1: Executive Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>1. Executive Summary</span>
          </h3>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              This document provides an executive summary of monitored brand exposure, public breach metadata, and threat actor telemetry collected for <strong>{scopeLabel}</strong>.
            </p>
            <p>
              DarkWatch AI identified <strong>{filteredFindings.length}</strong> findings within the selected operational scope, containing <strong>{criticalCount} Critical</strong> and <strong>{highCount} High</strong> priority security incidents requiring SOC containment.
            </p>
          </div>
        </div>

        {/* Section 2: Lawful Sourcing & Compliance Limitations */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span>2. Lawful Sourcing & Compliance Standards</span>
          </h3>
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 text-xs text-slate-300 leading-relaxed space-y-2">
            <p>
              <strong>Ethical Operations:</strong> DarkWatch AI operates in strict accordance with lawful intelligence gathering standards. The platform integrates exclusively with authorized commercial feeds, public telemetry catalogs (CISA KEV, abuse.ch URLhaus & ThreatFox), and Certificate Transparency public ledgers.
            </p>
            <p>
              <strong>Data Privacy:</strong> No plaintext passwords, stolen authentication tokens, or personal cardholder data are collected or retained. Simulated records are explicitly tagged with <em>[DEMO DATA]</em> markers for evidentiary transparency.
            </p>
          </div>
        </div>

        {/* Section 3: Findings Inventory Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>3. Detailed Findings Telemetry Table</span>
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">SEVERITY</th>
                  <th className="py-2.5 px-3">TITLE & TARGET ASSET</th>
                  <th className="py-2.5 px-3">CATEGORY</th>
                  <th className="py-2.5 px-3">SOURCE & EVIDENCE REF</th>
                  <th className="py-2.5 px-3">CONFIDENCE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredFindings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No findings in current report scope.
                    </td>
                  </tr>
                ) : (
                  filteredFindings.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-900/30">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                          f.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-sm">
                        <div className="font-semibold text-slate-200">{f.title}</div>
                        <div className="font-mono text-[10px] text-cyan-300 mt-0.5">
                          Target: {f.target_asset}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{f.category.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="text-slate-300">{f.source}</div>
                        <div className="font-mono text-[10px] text-slate-500 truncate">{f.evidence_ref}</div>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-semibold">{f.confidence}%</td>
                      <td className="py-2.5 px-3">
                        <span className="text-slate-300">{f.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Defensive Countermeasures */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>4. Prioritized Defensive Remediation Playbook</span>
          </h3>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <ul className="list-disc list-inside space-y-1.5 pl-2">
              <li><strong>DNS Sinkholing:</strong> Deploy all confirmed lookalike domains to corporate recursive resolvers to neutralize click-throughs.</li>
              <li><strong>Registrar Takedowns:</strong> Transmit RFC 2142 abuse takedown notifications to registrars hosting impersonation domains.</li>
              <li><strong>Authentication Hardening:</strong> Mandate FIDO2 / WebAuthn phishing-resistant multi-factor authentication across corporate SSO portals.</li>
              <li><strong>CISA KEV Patching:</strong> Expedite remediation of actively exploited vulnerabilities cataloged in DHS/CISA KEV.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
