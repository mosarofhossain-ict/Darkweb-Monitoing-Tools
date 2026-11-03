import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Globe, 
  Flame, 
  Activity, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { DashboardStats, Finding, Connector } from '../types';
import { api } from '../api';

interface OverviewDashboardProps {
  stats: DashboardStats | null;
  findings: Finding[];
  onSelectFinding: (findingId: string) => void;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  findings,
  onSelectFinding,
  onRefresh,
  onNavigate,
}) => {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const filteredFindings = findings.filter(f => {
    if (filterSeverity !== 'ALL' && f.severity !== filterSeverity) return false;
    if (filterCategory !== 'ALL' && f.category !== filterCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.target_asset.toLowerCase().includes(q) ||
        f.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSyncConnector = async (id: string) => {
    try {
      setSyncingId(id);
      await api.syncConnector(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const postureScore = stats?.postureScore ?? 82;

  return (
    <div className="space-y-6">
      {/* Platform Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 p-6 border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ACTIVE DEFENSE POSTURE
              </span>
              <span className="text-xs text-slate-400">
                Authorized Corporate Intelligence Perimeter
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Enterprise Cyber Intelligence & Brand Protection
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time monitoring across public vulnerability catalogs (CISA KEV), malicious feeds (URLhaus, ThreatFox), Certificate Transparency public ledgers, and authorized leak exposure telemetry. Zero dark-web scraping or illicit network interaction.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('ai-analyst')}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 flex items-center space-x-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI Analyst</span>
            </button>
            <button
              onClick={() => onNavigate('brand-monitoring')}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all"
            >
              <Globe className="w-4 h-4" />
              <span>Manage Assets</span>
            </button>
          </div>
        </div>

        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      </div>

      {/* Top SOC Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Posture Score */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Security Posture</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{postureScore}</span>
            <span className="text-xs text-slate-400 font-semibold">/ 100</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-auto ${
              postureScore >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {postureScore >= 80 ? 'RESILIENT' : 'ATTENTION REQUIRED'}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${postureScore >= 80 ? 'bg-emerald-400' : 'bg-amber-400'}`}
              style={{ width: `${postureScore}%` }}
            ></div>
          </div>
        </div>

        {/* Critical & High Findings */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Critical Incidents</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-rose-400">
              {stats?.criticalFindings ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">Critical</span>
            <span className="text-xs text-amber-400 font-semibold ml-2">
              +{stats?.highFindings ?? 0} High
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Open findings: {stats?.openFindings ?? 0}</span>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5 font-medium"
            >
              <span>Triage</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Threat Indicators / IOCs */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Threat Indicators (IOCs)</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.totalIocs ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">Ingested</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>ThreatFox & URLhaus feeds</span>
            <button
              onClick={() => onNavigate('threat-intel')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5 font-medium"
            >
              <span>Explore</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Monitored Corporate Brands */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Corporate Assets</span>
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">
              {stats?.brandsCount ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">Brands Verified</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Authorized Scope Only</span>
            <button
              onClick={() => onNavigate('brand-monitoring')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5 font-medium"
            >
              <span>View</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      {/* Risk Distribution & Monitoring Status Section */}
      {(() => {
        const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
        const highCount = findings.filter(f => f.severity === 'HIGH').length;
        const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
        const lowCount = findings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length;
        const total = findings.length || 1;

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Risk & Severity Distribution */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">RISK & SEVERITY DISTRIBUTION</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">{findings.length} Findings Monitored</span>
              </div>

              {/* Distribution Bars */}
              <div className="space-y-2.5 pt-1 text-xs">
                {/* Critical */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-rose-300 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      <span>CRITICAL RISK</span>
                    </span>
                    <span className="text-slate-300 font-bold">{criticalCount} ({Math.round((criticalCount / total) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${(criticalCount / total) * 100}%` }}></div>
                  </div>
                </div>

                {/* High */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-amber-300 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>HIGH RISK</span>
                    </span>
                    <span className="text-slate-300 font-bold">{highCount} ({Math.round((highCount / total) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${(highCount / total) * 100}%` }}></div>
                  </div>
                </div>

                {/* Medium */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-yellow-300 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span>MEDIUM RISK</span>
                    </span>
                    <span className="text-slate-300 font-bold">{mediumCount} ({Math.round((mediumCount / total) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div className="bg-yellow-500 h-full rounded-full transition-all" style={{ width: `${(mediumCount / total) * 100}%` }}></div>
                  </div>
                </div>

                {/* Low & Info */}
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-blue-300 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>LOW / INFORMATIONAL</span>
                    </span>
                    <span className="text-slate-300 font-bold">{lowCount} ({Math.round((lowCount / total) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${(lowCount / total) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monitoring Scope & Telemetry Status */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide">MONITORING SCOPE & TELEMETRY</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PERIMETER ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Primary Brand Domain</div>
                  <div className="font-mono text-cyan-300 font-bold truncate mt-0.5">apextech.io</div>
                  <div className="text-[10px] text-slate-500">Apex Global Technologies</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Corporate Perimeter</div>
                  <div className="font-mono text-slate-200 font-bold truncate mt-0.5">4 Verified Domains</div>
                  <div className="text-[10px] text-slate-500">Certificate Transparency Sync</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Data Leak Monitoring</div>
                  <div className="font-semibold text-emerald-300 truncate mt-0.5">Metadata Only</div>
                  <div className="text-[10px] text-slate-500">Zero plaintext password storage</div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Intelligence Standard</div>
                  <div className="font-semibold text-purple-300 truncate mt-0.5">Demo & Lawful Feeds</div>
                  <div className="text-[10px] text-slate-500">Zero dark web network crawling</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span>Authorization: CISO #AT-2026-081</span>
                <button
                  onClick={() => onNavigate('brand-monitoring')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Configure Assets →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 14-Day Activity Trend & Connectors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Graph */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">14-DAY THREAT & FINDINGS VELOCITY</h3>
              <p className="text-[11px] text-slate-400">Correlated telemetry from public catalogs and partner feeds</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-cyan-500"></span>
                <span>Findings</span>
              </span>
              <span className="flex items-center space-x-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
                <span>IOC Indicators</span>
              </span>
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="pt-4 h-48 flex items-end justify-between gap-1.5 border-b border-slate-800 pb-2">
            {(stats?.trendDays || []).map((day, idx) => {
              const maxVal = 20;
              const fHeight = Math.min(100, Math.max(15, (day.findings / maxVal) * 100));
              const iHeight = Math.min(100, Math.max(10, (day.iocs / (maxVal * 2)) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-950 text-[10px] p-2 rounded border border-slate-700 whitespace-nowrap z-20 shadow-xl">
                    <p className="font-bold text-white">{day.date}</p>
                    <p className="text-cyan-400">Findings: {day.findings}</p>
                    <p className="text-blue-400">IOCs: {day.iocs}</p>
                  </div>
                  <div className="w-full flex items-end justify-center gap-0.5 h-36">
                    <div
                      className="w-1/2 bg-cyan-500 rounded-t transition-all group-hover:bg-cyan-400"
                      style={{ height: `${fHeight}%` }}
                    ></div>
                    <div
                      className="w-1/2 bg-blue-600/70 rounded-t transition-all group-hover:bg-blue-500"
                      style={{ height: `${iHeight}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] text-slate-400 truncate max-w-[28px]">
                    {day.date.split('-').slice(1).join('/')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connector Health Grid */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">CONNECTOR HEALTH</h3>
              <p className="text-[11px] text-slate-400">Public & Lawful Provider Status</p>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Configure
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-52 pr-1">
            {(stats?.connectors || []).map((conn: Connector) => (
              <div
                key={conn.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="truncate pr-2">
                  <div className="font-semibold text-slate-200 truncate">{conn.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {conn.record_count.toLocaleString()} records • {conn.last_sync ? new Date(conn.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    conn.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300' :
                    conn.status === 'NEEDS_KEY' ? 'bg-slate-800 text-slate-400' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {conn.status}
                  </span>
                  {conn.enabled && conn.status !== 'NEEDS_KEY' && (
                    <button
                      onClick={() => handleSyncConnector(conn.id)}
                      disabled={syncingId === conn.id}
                      className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                      title="Sync connector feed"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingId === conn.id ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-cyan-400" />
            <span>Strict Rate Limiting & Safe Parsing Active</span>
          </div>
        </div>
      </div>

      {/* Findings List Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">TELEMETRY FINDINGS & EXPOSURE EVENTS</h3>
            <p className="text-xs text-slate-400">
              Showing {filteredFindings.length} evaluated incidents across authorized assets
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search findings, assets, sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 w-56"
              />
            </div>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-slate-950 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="PHISHING">Phishing & AitM</option>
              <option value="BRAND_IMPERSONATION">Brand Impersonation</option>
              <option value="DATA_LEAK">Data Leak Exposure</option>
              <option value="DARKWEB_MENTION">Dark Web Mention</option>
              <option value="VULNERABILITY_EXPLOIT">CISA Exploits</option>
            </select>
          </div>
        </div>

        {/* Findings Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">SEVERITY</th>
                <th className="py-3 px-4">INCIDENT & TARGET ASSET</th>
                <th className="py-3 px-4">CATEGORY</th>
                <th className="py-3 px-4">SOURCE & CONFIDENCE</th>
                <th className="py-3 px-4">VERIFICATION</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredFindings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No findings match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFindings.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-slate-900/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectFinding(f.id)}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        f.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        f.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                        f.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                        {f.title}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 truncate mt-0.5 flex items-center space-x-2">
                        <span>Target: {f.target_asset}</span>
                        {f.is_demo ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[9px] font-bold border border-purple-500/40">
                            DEMO DATA
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                            LIVE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-300 border border-slate-800">
                        {f.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-300 font-medium truncate max-w-[140px]">{f.source}</div>
                      <div className="text-[10px] text-cyan-400 font-semibold">{f.confidence}% confidence</div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {new Date(f.first_seen).toLocaleDateString()} – {new Date(f.last_seen).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        f.verification_status === 'CONFIRMED_EXPOSURE' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                        f.verification_status === 'SUSPECTED_EXPOSURE' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {f.verification_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFinding(f.id);
                        }}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-slate-700 transition-colors"
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
