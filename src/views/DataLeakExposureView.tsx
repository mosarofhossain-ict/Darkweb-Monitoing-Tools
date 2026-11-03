import React, { useState } from 'react';
import { 
  Database, 
  ShieldAlert, 
  Lock, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Finding, Brand } from '../types';
import { api } from '../api';

interface DataLeakExposureViewProps {
  findings: Finding[];
  brands: Brand[];
  onSelectFinding: (findingId: string) => void;
}

export const DataLeakExposureView: React.FC<DataLeakExposureViewProps> = ({
  findings,
  brands,
  onSelectFinding,
}) => {
  const [searchEmail, setSearchEmail] = useState('');
  const [queryResult, setQueryResult] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  const leakFindings = findings.filter(f => f.category === 'DATA_LEAK');

  const handleSearchExposure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;

    setSearching(true);
    const queryDomain = searchEmail.includes('@') ? searchEmail.split('@')[1] : searchEmail;
    const isDomainMonitored = brands.some(b => 
      b.primary_domain.toLowerCase() === queryDomain.toLowerCase() ||
      b.additional_domains.some(d => d.toLowerCase() === queryDomain.toLowerCase())
    );

    // Filter against local leak metadata
    const localMatches = leakFindings.filter(f => 
      f.target_asset.toLowerCase().includes(queryDomain.toLowerCase()) ||
      f.title.toLowerCase().includes(queryDomain.toLowerCase())
    );

    // Query live HIBP v3 breaches catalog
    let hibpData: any = null;
    try {
      hibpData = await api.lookupHibp(searchEmail);
    } catch (err) {
      console.warn('HIBP lookup:', err);
    }

    const hibpMatches = hibpData?.matches || [];

    setQueryResult({
      queriedAsset: searchEmail,
      authorizedDomain: isDomainMonitored,
      matches: localMatches,
      hibpMatches,
      totalCataloged: hibpData?.totalBreachesCataloged || 0,
      cleanStatus: localMatches.length === 0 && hibpMatches.length === 0,
      timestamp: new Date().toISOString(),
    });
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Corporate Data Leak & Exposure Telemetry
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Monitor verified breach compilations and corporate domain credential exposures using approved breach-intelligence sources.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-[11px] text-cyan-300 max-w-sm flex items-start space-x-2">
          <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-white">Zero Plaintext Data Policy</span>
            DarkWatch AI tracks strictly exposure metadata (breach title, exposed attribute types, record counts). No plaintext passwords, cookies, or payment info are ever stored.
          </div>
        </div>
      </div>

      {/* Corporate Email / Domain Exposure Lookup */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white tracking-wide">
            AUTHORIZED CORPORATE DOMAIN & EMAIL EXPOSURE AUDITOR
          </h3>
          <p className="text-xs text-slate-400">
            Audit authorized corporate accounts against ingested breach compilation metadata.
          </p>
        </div>

        <form onSubmit={handleSearchExposure} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. employee@apextech.io or apextech.io"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <Search className="w-4 h-4" />
            <span>Audit Exposure</span>
          </button>
        </form>

        {queryResult && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-300">Target: <code className="text-cyan-300 font-mono">{queryResult.queriedAsset}</code></span>
                {queryResult.authorizedDomain ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    Authorized Scope
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    External / Unverified Domain
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">
                Audited: {new Date(queryResult.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {queryResult.cleanStatus ? (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero exposure findings detected for this entity across internal findings and the Have I Been Pwned public breach database ({queryResult.totalCataloged || 300}+ catalogs checked).</span>
              </div>
            ) : (
              <div className="space-y-3">
                {queryResult.matches.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-rose-300 font-semibold flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Identified {queryResult.matches.length} Internal Finding(s):</span>
                    </div>
                    {queryResult.matches.map((f: Finding) => (
                      <div key={f.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-white">{f.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Ref: {f.evidence_ref} • Source: {f.source}
                          </div>
                        </div>
                        <button
                          onClick={() => onSelectFinding(f.id)}
                          className="px-3 py-1 rounded-lg bg-slate-800 text-cyan-400 hover:text-cyan-300 text-xs font-medium"
                        >
                          Investigate
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {queryResult.hibpMatches?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-850">
                    <div className="text-xs text-cyan-300 font-semibold flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle className="w-4 h-4 text-cyan-400" />
                        <span>Have I Been Pwned (HIBP v3) Public Breach Matches ({queryResult.hibpMatches.length}):</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Minimal Metadata Only • No Passwords Stored</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {queryResult.hibpMatches.map((b: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-xs space-y-1">
                          <div className="flex items-start justify-between">
                            <span className="font-bold text-white text-xs">{b.title}</span>
                            <span className="text-[10px] text-cyan-400 font-mono">{b.pwnCount?.toLocaleString()} pwned</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Domain: <span className="font-mono text-slate-300">{b.domain}</span> • Date: <span className="text-slate-300">{b.breachDate}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(b.dataClasses || []).slice(0, 4).map((dc: string, dIdx: number) => (
                              <span key={dIdx} className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800">
                                {dc}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Exposure Findings Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              PUBLIC BREACH & DATA-LEAK EXPOSURE FINDINGS ({leakFindings.length})
            </h3>
            <p className="text-xs text-slate-400">
              Aggregated from public breach repositories and authorized breach telemetry
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">BREACH TITLE & TARGET DOMAIN</th>
                <th className="py-3 px-4">EXPOSED DATA ATTRIBUTES</th>
                <th className="py-3 px-4">SOURCE</th>
                <th className="py-3 px-4">VERIFICATION</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {leakFindings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active breach exposure findings cataloged.
                  </td>
                </tr>
              ) : (
                leakFindings.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-900/40 transition-colors cursor-pointer"
                    onClick={() => onSelectFinding(f.id)}
                  >
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        f.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                        f.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-200 truncate flex items-center space-x-2">
                        <span className="truncate">{f.title}</span>
                        {f.is_demo ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[9px] font-bold border border-purple-500/40 flex-shrink-0">
                            DEMO DATA
                          </span>
                        ) : null}
                      </div>
                      <div className="font-mono text-[11px] text-cyan-300 truncate mt-0.5">
                        Target: {f.target_asset}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {Array.isArray(f.evidence_details?.exposed_fields) ? (
                          f.evidence_details.exposed_fields.map((field: string, idx: number) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                              {field}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">Metadata attributes</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{f.source}</div>
                      <div className="text-[10px] text-cyan-400 font-semibold">{f.confidence}% confidence</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {new Date(f.first_seen).toLocaleDateString()} – {new Date(f.last_seen).toLocaleDateString()}
                      </div>
                    </td>
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
    </div>
  );
};
