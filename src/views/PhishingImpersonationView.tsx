import React, { useState } from 'react';
import { 
  Crosshair, 
  Search, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Check,
  ShieldCheck,
  Terminal,
  Lock
} from 'lucide-react';
import { Finding } from '../types';
import { api } from '../api';

interface PhishingImpersonationViewProps {
  findings: Finding[];
  onSelectFinding: (findingId: string) => void;
}

export const PhishingImpersonationView: React.FC<PhishingImpersonationViewProps> = ({
  findings,
  onSelectFinding,
}) => {
  const [urlToInspect, setUrlToInspect] = useState('http://apextech-login.com/auth/login.php?session=token_abc123');
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<any | null>(null);
  const [vtResult, setVtResult] = useState<any | null>(null);
  const [vtLoading, setVtLoading] = useState(false);

  const phishingFindings = findings.filter(f => 
    f.category === 'PHISHING' || f.category === 'BRAND_IMPERSONATION'
  );

  const handleInspectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlToInspect) return;

    try {
      setInspecting(true);
      setVtResult(null);
      const res = await api.inspectUrlSafely(urlToInspect);
      setInspectionResult(res);

      // Auto-query VirusTotal for the host domain if parsed
      if (res.parsed && res.safeAnalysis?.hostname) {
        setVtLoading(true);
        try {
          const vt = await api.lookupVirusTotal(res.safeAnalysis.hostname, res.safeAnalysis.hasIpHostname ? 'ip' : 'domain');
          setVtResult(vt);
        } catch (vtErr) {
          console.warn('VT query error:', vtErr);
        } finally {
          setVtLoading(false);
        }
      }
    } catch (err: any) {
      alert('Inspection failed: ' + err.message);
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Crosshair className="w-5 h-5 text-rose-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Phishing & Adversary-in-the-Middle (AitM) Defense
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Identify credential harvesters, lookalike login portals, and reverse-proxy kits targeting authorized brands.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Safe Sandboxing: Zero automated visits. Metadata & reputation analysis only.</span>
        </div>
      </div>

      {/* Safe URL Inspector Tool */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>SAFE SERVER-SIDE URL INSPECTOR (NO DIRECT VISITS)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Safely dissect suspicious URLs, evaluate query string entropy, detect AitM reverse-proxy parameters, and correlate against ThreatFox & URLhaus.
          </p>
        </div>

        <form onSubmit={handleInspectUrl} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={urlToInspect}
              onChange={(e) => setUrlToInspect(e.target.value)}
              placeholder="Paste suspicious URL or domain e.g. http://apextech-portal.xyz/login"
              className="w-full bg-slate-950 text-slate-200 px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={inspecting}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Crosshair className="w-4 h-4" />
            <span>{inspecting ? 'Analyzing Metadata...' : 'Inspect Safely'}</span>
          </button>
        </form>

        {/* Inspection Results Panel */}
        {inspectionResult && inspectionResult.safeAnalysis && (
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4 mt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  inspectionResult.safeAnalysis.riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                  inspectionResult.safeAnalysis.riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-blue-500/20 text-blue-300 border-blue-500/40'
                }`}>
                  {inspectionResult.safeAnalysis.riskLevel} RISK ({inspectionResult.safeAnalysis.riskScore}/100)
                </span>
                <span className="font-mono text-xs text-slate-300 truncate max-w-md">
                  Host: {inspectionResult.safeAnalysis.hostname}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Safe analysis completed without network contact to destination
              </span>
            </div>

            {/* Syntax Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Protocol / Port</div>
                <div className="font-mono font-semibold text-slate-200 mt-0.5">
                  {inspectionResult.safeAnalysis.protocol} // {inspectionResult.safeAnalysis.port}
                </div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Hostname Type</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {inspectionResult.safeAnalysis.hasIpHostname ? 'Direct Raw IP (High Risk)' : 'FQDN Domain'}
                </div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Deceptive Keywords</div>
                <div className="font-semibold text-rose-300 mt-0.5 truncate">
                  {inspectionResult.safeAnalysis.suspiciousKeywordsFound.length > 0 
                    ? inspectionResult.safeAnalysis.suspiciousKeywordsFound.join(', ')
                    : 'None detected'}
                </div>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Query Parameters</div>
                <div className="font-semibold text-slate-200 mt-0.5">
                  {inspectionResult.safeAnalysis.queryParamsCount} parameter(s)
                </div>
              </div>
            </div>

            {/* Specific Findings List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300">Analytical Flags:</div>
              <div className="space-y-1.5">
                {inspectionResult.safeAnalysis.findings.map((f: string, i: number) => (
                  <div key={i} className="text-xs text-slate-300 flex items-start space-x-2 bg-slate-900/40 p-2 rounded border border-slate-850">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VirusTotal Live Multi-Engine Telemetry */}
            {vtLoading && (
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-cyan-300 flex items-center space-x-2">
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Querying VirusTotal API v3 multi-engine threat telemetry...</span>
              </div>
            )}

            {vtResult && vtResult.available && (
              <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>VirusTotal v3 Multi-Engine Telemetry</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      vtResult.stats.malicious > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      vtResult.stats.suspicious > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {vtResult.stats.malicious > 0 ? `${vtResult.stats.malicious} Malicious Detections` : 'Clean / Harmless'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Total Engines: {vtResult.totalEngines || 90}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Malicious</div>
                    <div className={`font-bold text-xs ${vtResult.stats.malicious > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {vtResult.stats.malicious}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Suspicious</div>
                    <div className={`font-bold text-xs ${vtResult.stats.suspicious > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {vtResult.stats.suspicious}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Harmless</div>
                    <div className="font-bold text-emerald-400 text-xs">{vtResult.stats.harmless}</div>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Undetected</div>
                    <div className="font-bold text-slate-400 text-xs">{vtResult.stats.undetected}</div>
                  </div>
                </div>

                {vtResult.detections?.length > 0 && (
                  <div className="text-[11px] text-rose-300 space-y-1 pt-1">
                    <span className="font-semibold block">Flagging Security Engines:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {vtResult.detections.map((d: any, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-200 border border-rose-900 text-[10px] font-mono">
                          {d.engine}: {d.result}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recommendation */}
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-start space-x-2">
              <Terminal className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-cyan-300">Recommended Action:</span>
                {inspectionResult.safeAnalysis.recommendation}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phishing Findings Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              CONFIRMED PHISHING & CREDENTIAL HARVESTER FINDINGS ({phishingFindings.length})
            </h3>
            <p className="text-xs text-slate-400">
              Correlated from URLhaus abuse feeds and DNS reconnaissance
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">DECEPTIVE ASSET / URL</th>
                <th className="py-3 px-4">SOURCE FEED</th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">VERIFICATION</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {phishingFindings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active phishing findings cataloged.
                  </td>
                </tr>
              ) : (
                phishingFindings.map((f) => (
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
                    <td className="py-3 px-4 max-w-sm font-mono text-slate-200">
                      <div className="font-semibold text-rose-300 truncate flex items-center space-x-2">
                        <span className="truncate">{f.target_asset}</span>
                        {f.is_demo ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[9px] font-bold border border-purple-500/40 flex-shrink-0">
                            DEMO DATA
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans truncate mt-0.5">{f.title}</div>
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
    </div>
  );
};
