import React from 'react';
import { 
  ShieldAlert, 
  Lock, 
  AlertTriangle, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  Info,
  Radio,
  FileText
} from 'lucide-react';
import { Finding } from '../types';

interface DarkWebFeedsViewProps {
  findings: Finding[];
  onSelectFinding: (findingId: string) => void;
  onNavigate: (tab: string) => void;
}

export const DarkWebFeedsView: React.FC<DarkWebFeedsViewProps> = ({
  findings,
  onSelectFinding,
  onNavigate,
}) => {
  const darkWebFindings = findings.filter(f => f.category === 'DARKWEB_MENTION');

  const lawfulThreatFeeds = [
    {
      name: 'Ransomware Public Disclosures & Victim Telemetry',
      provider: 'Public CTI Telemetry Feed',
      status: 'MONITORING',
      coverage: 'Double-extortion victim public leak portals metadata',
      lastObserved: '3 hours ago',
    },
    {
      name: 'Adversary Reconnaissance & Forum Mention Feed',
      provider: 'Licensed CTI Partner Adapter',
      status: 'DEMO / SIMULATED',
      coverage: 'Threat actor discussions regarding financial software and corporate SSL portals',
      lastObserved: '6 hours ago',
    },
    {
      name: 'Infostealer Log Ingestion Metadata',
      provider: 'Approved Threat Intelligence Stream',
      status: 'ACTIVE',
      coverage: 'Compromised host telemetry from RedLine/Vidar stealer distributions',
      lastObserved: '12 hours ago',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Lawful Threat Intelligence & Deep Feed Telemetry
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Adversary intelligence and threat actor disclosures ingested strictly via lawful, approved commercial CTI partners.
          </p>
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 flex items-center space-x-2 self-start transition-all"
        >
          <Radio className="w-4 h-4" />
          <span>Configure Provider Adapters</span>
        </button>
      </div>

      {/* Compliance Notice */}
      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-900/50 text-xs text-purple-200 space-y-1.5">
        <div className="flex items-center space-x-2 font-bold text-purple-300">
          <CheckCircle2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>Strict Ethical & Lawful Sourcing Standard</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
          DarkWatch AI does NOT crawl, scrape, log into, or execute transactions on illicit marketplaces, restricted forums, or unauthorized .onion services. Telemetry is sourced exclusively through verified public disclosure blogs, law enforcement feeds, and licensed CTI vendor partners. Sample records are explicitly labeled with <strong className="text-purple-300">[DEMO DATA]</strong> to ensure evidentiary honesty.
        </p>
      </div>

      {/* Authorized Threat Feeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {lawfulThreatFeeds.map((feed, i) => (
          <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {feed.provider}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  feed.status === 'MONITORING' || feed.status === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {feed.status}
                </span>
              </div>
              <h4 className="font-bold text-white text-xs">{feed.name}</h4>
              <p className="text-[11px] text-slate-400">{feed.coverage}</p>
            </div>
            <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
              Last observed telemetry: {feed.lastObserved}
            </div>
          </div>
        ))}
      </div>

      {/* Dark Web / Threat Feed Findings Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              THREAT ACTOR MENTIONS & DISCLOSURES ({darkWebFindings.length})
            </h3>
            <p className="text-xs text-slate-400">
              Monitored mentions regarding authorized corporate brands and industry sectors
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">THREAT ACTOR INCIDENT</th>
                <th className="py-3 px-4">TARGET ASSET / SECTOR</th>
                <th className="py-3 px-4">SOURCE FEED</th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {darkWebFindings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No active threat actor mentions recorded.
                  </td>
                </tr>
              ) : (
                darkWebFindings.map((f) => (
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
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-200 truncate">{f.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-2">
                        <span>Ref: {f.evidence_ref}</span>
                        {f.is_demo ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[9px] font-bold border border-purple-500/40">
                            DEMO DATA
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-300">{f.target_asset}</td>
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
