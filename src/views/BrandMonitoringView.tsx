import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  ExternalLink, 
  Layers, 
  FileCheck2,
  RefreshCw,
  Building,
  Key
} from 'lucide-react';
import { Brand, Finding } from '../types';
import { api } from '../api';

interface BrandMonitoringViewProps {
  brands: Brand[];
  findings: Finding[];
  onSelectFinding: (findingId: string) => void;
  onRefresh: () => void;
}

export const BrandMonitoringView: React.FC<BrandMonitoringViewProps> = ({
  brands,
  findings,
  onSelectFinding,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [analyzingDomain, setAnalyzingDomain] = useState(false);
  const [domainToAnalyze, setDomainToAnalyze] = useState(brands[0]?.primary_domain || 'apextech.io');
  const [lookalikeResults, setLookalikeResults] = useState<any | null>(null);

  // New Brand Form State
  const [newBrand, setNewBrand] = useState({
    name: '',
    legal_name: '',
    primary_domain: '',
    additional_domains: '',
    keywords: '',
    contact_email: '',
    authorized_by: 'CISO / Authorized Security Officer',
  });

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.name || !newBrand.primary_domain) {
      alert('Brand name and primary domain are required');
      return;
    }

    try {
      await api.createBrand({
        name: newBrand.name,
        legal_name: newBrand.legal_name,
        primary_domain: newBrand.primary_domain,
        additional_domains: newBrand.additional_domains.split(',').map(s => s.trim()).filter(Boolean),
        keywords: newBrand.keywords.split(',').map(s => s.trim()).filter(Boolean),
        contact_email: newBrand.contact_email,
        authorized_by: newBrand.authorized_by,
      });
      setShowAddModal(false);
      setNewBrand({
        name: '',
        legal_name: '',
        primary_domain: '',
        additional_domains: '',
        keywords: '',
        contact_email: '',
        authorized_by: 'CISO / Authorized Security Officer',
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove authorized monitoring for "${name}"?`)) {
      try {
        await api.deleteBrand(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleRunLookalikeAnalysis = async () => {
    if (!domainToAnalyze) return;
    try {
      setAnalyzingDomain(true);
      const res = await api.checkImpersonation(domainToAnalyze);
      setLookalikeResults(res);
    } catch (err: any) {
      alert('Analysis failed: ' + err.message);
    } finally {
      setAnalyzingDomain(false);
    }
  };

  const impersonationFindings = findings.filter(f => 
    f.category === 'BRAND_IMPERSONATION' || f.category === 'PHISHING'
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Corporate Brand & Domain Perimeter Protection
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Monitor verified corporate domains, trademark keywords, certificate transparency (crt.sh) logs, and prospective typosquatting variants.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-2 self-start transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Authorized Brand</span>
        </button>
      </div>

      {/* Authorized Brands Portfolio Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((b) => (
          <div
            key={b.id}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{b.name}</h3>
                  <div className="text-[11px] text-slate-400">{b.legal_name || b.name}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>AUTHORIZED</span>
                </span>
              </div>

              {/* Primary Domain */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300 flex items-center justify-between">
                <span>{b.primary_domain}</span>
                <span className="text-[10px] text-slate-500">PRIMARY</span>
              </div>

              {/* Additional Domains */}
              {b.additional_domains && b.additional_domains.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Associated Domains ({b.additional_domains.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {b.additional_domains.map((dom, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                        {dom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {b.keywords && b.keywords.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Monitored Trademark Keywords
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {b.keywords.map((kw, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-300 border border-cyan-800/40">
                        "{kw}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-[170px]" title={b.authorized_by}>
                Auth: {b.authorized_by || 'Verified'}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setDomainToAnalyze(b.primary_domain);
                    handleRunLookalikeAnalysis();
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Analyze Variants
                </button>
                {brands.length > 1 && (
                  <button
                    onClick={() => handleDeleteBrand(b.id, b.name)}
                    className="text-rose-400 hover:text-rose-300 p-1"
                    title="Remove authorized asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lookalike & Certificate Transparency Interactive Engine */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center space-x-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>TYPOSQUATTING & CERTIFICATE TRANSPARENCY RADAR</span>
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates homoglyphs, brand keyword spoofing (-login, -auth), TLD substitution, and searches public crt.sh certificate ledgers.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={domainToAnalyze}
              onChange={(e) => setDomainToAnalyze(e.target.value)}
              placeholder="e.g. apextech.io"
              className="bg-slate-950 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 w-52 font-mono"
            />
            <button
              onClick={handleRunLookalikeAnalysis}
              disabled={analyzingDomain || !domainToAnalyze}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzingDomain ? 'animate-spin' : ''}`} />
              <span>{analyzingDomain ? 'Evaluating...' : 'Inspect'}</span>
            </button>
          </div>
        </div>

        {lookalikeResults && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lookalikes Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>POTENTIAL HIGH-RISK LOOKALIKE DOMAINS ({lookalikeResults.lookalikes.length})</span>
                  <span className="text-[10px] text-cyan-400">Algorithmic Permutations</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-850 pr-1">
                  {lookalikeResults.lookalikes.map((item: any, i: number) => (
                    <div key={i} className="py-2 flex items-center justify-between text-xs">
                      <div className="truncate pr-2">
                        <div className="font-mono text-slate-200 font-semibold truncate">{item.domain}</div>
                        <div className="text-[10px] text-slate-400">{item.reason}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                        item.riskScore >= 90 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        item.riskScore >= 80 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {item.riskScore}% Risk
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certificate Transparency Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>CERTIFICATE TRANSPARENCY PUBLIC LOGS ({lookalikeResults.certificateLogsCount})</span>
                  <span className="text-[10px] text-emerald-400">crt.sh Telemetry</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-850 pr-1">
                  {lookalikeResults.recentCertificates.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No recent public certificates found for this domain wildcard or crt.sh query delay limit reached.
                    </div>
                  ) : (
                    lookalikeResults.recentCertificates.map((cert: any, i: number) => (
                      <div key={i} className="py-2 text-xs space-y-0.5">
                        <div className="font-mono text-cyan-300 font-medium truncate">
                          {cert.common_name || cert.name_value}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span className="truncate max-w-[200px]">Issuer: {cert.issuer_name}</span>
                          <span>Logged: {cert.logged_at ? new Date(cert.logged_at).toLocaleDateString() : 'Active'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Brand Impersonation Findings Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">CONFIRMED & SUSPECTED IMPERSONATION FINDINGS</h3>
            <p className="text-xs text-slate-400">
              Active domain spoofing and phishing infrastructure flagged by DarkWatch AI
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">SUSPICIOUS TARGET / DOMAIN</th>
                <th className="py-3 px-4">EVIDENCE SOURCE</th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">VERIFICATION</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {impersonationFindings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active impersonation findings recorded.
                  </td>
                </tr>
              ) : (
                impersonationFindings.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                    onClick={() => onSelectFinding(f.id)}
                  >
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        f.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      <div className="font-semibold text-cyan-300 flex items-center space-x-2">
                        <span>{f.target_asset}</span>
                        {f.is_demo ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[9px] font-bold border border-purple-500/40">
                            DEMO DATA
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans">{f.title}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{f.source}</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {new Date(f.first_seen).toLocaleDateString()} – {new Date(f.last_seen).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-cyan-400 font-semibold">{f.confidence}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {f.verification_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFinding(f.id);
                        }}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800"
                      >
                        Investigate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Brand Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-base">Add Authorized Corporate Brand</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBrand} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Technologies"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary FQDN Domain *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. apextech.io"
                  value={newBrand.primary_domain}
                  onChange={(e) => setNewBrand({ ...newBrand, primary_domain: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Additional Domains (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. apextech.com, portal.apextech.io"
                  value={newBrand.additional_domains}
                  onChange={(e) => setNewBrand({ ...newBrand, additional_domains: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Approved Trademark Keywords (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. ApexTech, ApexPay, ApexCloud"
                  value={newBrand.keywords}
                  onChange={(e) => setNewBrand({ ...newBrand, keywords: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Security Contact Email</label>
                  <input
                    type="email"
                    placeholder="security@apextech.io"
                    value={newBrand.contact_email}
                    onChange={(e) => setNewBrand({ ...newBrand, contact_email: e.target.value })}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Authorizing Official</label>
                  <input
                    type="text"
                    value={newBrand.authorized_by}
                    onChange={(e) => setNewBrand({ ...newBrand, authorized_by: e.target.value })}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
                <span className="font-semibold block mb-0.5">Authorization Compliance Standard:</span>
                By adding this brand, you confirm that you are authorized to monitor this entity and that no unlawful, unauthorized crawling will be conducted.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20"
                >
                  Authorize & Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
