import React, { useState } from 'react';
import { 
  Flame, 
  Search, 
  Plus, 
  Download, 
  Trash2, 
  ShieldAlert, 
  ExternalLink,
  Copy,
  Check,
  Filter,
  FileCode,
  Layers
} from 'lucide-react';
import { IOC } from '../types';
import { api } from '../api';

interface ThreatIntelIocsViewProps {
  iocs: IOC[];
  onRefresh: () => void;
}

export const ThreatIntelIocsView: React.FC<ThreatIntelIocsViewProps> = ({
  iocs,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New IOC state
  const [newIoc, setNewIoc] = useState({
    type: 'IP',
    value: '',
    threat_type: 'C2',
    malware_family: '',
    confidence: 90,
    tags: 'malware, c2',
    source: 'Analyst Submission',
  });

  const handleCopy = (val: string, key: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredIocs = iocs.filter(ioc => {
    if (filterType !== 'ALL' && ioc.type !== filterType) return false;
    if (filterStatus !== 'ALL' && ioc.status !== filterStatus) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        ioc.value.toLowerCase().includes(q) ||
        (ioc.malware_family && ioc.malware_family.toLowerCase().includes(q)) ||
        ioc.threat_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateIoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIoc.value) return;

    try {
      await api.createIoc({
        type: newIoc.type as any,
        value: newIoc.value.trim(),
        threat_type: newIoc.threat_type,
        malware_family: newIoc.malware_family || 'Custom Threat',
        confidence: Number(newIoc.confidence) || 85,
        source: newIoc.source,
        tags: newIoc.tags.split(',').map(s => s.trim()).filter(Boolean),
      });
      setShowAddModal(false);
      setNewIoc({
        type: 'IP',
        value: '',
        threat_type: 'C2',
        malware_family: '',
        confidence: 90,
        tags: 'malware, c2',
        source: 'Analyst Submission',
      });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteIoc = async (id: string) => {
    if (confirm('Delete this indicator from the threat repository?')) {
      try {
        await api.deleteIoc(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleExportStix = () => {
    window.location.href = '/api/iocs/export?format=stix';
  };

  const handleExportCsv = () => {
    window.location.href = '/api/iocs/export?format=csv';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Threat Intelligence & IOC Repository
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Deduplicated Indicators of Compromise (IPs, Domains, URLs, File Hashes) enriched via ThreatFox and URLhaus.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportStix}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Download STIX 2.1 JSON bundle"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            <span>Export STIX 2.1</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Download CSV export"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add IOC</span>
          </button>
        </div>
      </div>

      {/* IOC Search & Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search indicators by IP, domain, hash, or malware family..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 text-slate-200 pl-10 pr-4 py-2 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 text-slate-300 px-3 py-2 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Indicator Types</option>
              <option value="IP">IP Addresses</option>
              <option value="DOMAIN">Domains</option>
              <option value="URL">URLs</option>
              <option value="SHA256">SHA-256 Hashes</option>
              <option value="MD5">MD5 Hashes</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 text-slate-300 px-3 py-2 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="MONITORED">Monitored</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>
        </div>

        {/* IOC Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">INDICATOR VALUE</th>
                <th className="py-3 px-4">THREAT & MALWARE</th>
                <th className="py-3 px-4">CONFIDENCE</th>
                <th className="py-3 px-4">SOURCE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredIocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No threat indicators match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredIocs.map((ioc) => (
                  <tr key={ioc.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                        {ioc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200 max-w-sm">
                      <div className="flex items-center space-x-2">
                        <span className="truncate select-all text-cyan-300 font-medium">
                          {ioc.value}
                        </span>
                        <button
                          onClick={() => handleCopy(ioc.value, ioc.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5 flex-shrink-0"
                          title="Copy indicator"
                        >
                          {copiedKey === ioc.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span>Seen: {new Date(ioc.first_seen).toLocaleDateString()} – {new Date(ioc.last_seen).toLocaleDateString()}</span>
                        {ioc.is_demo ? (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/25 text-purple-300 text-[9px] font-bold border border-purple-500/40">
                            DEMO DATA
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30">
                            LIVE FEED
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{ioc.threat_type}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                        {ioc.malware_family || 'Standard Vector'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{ioc.confidence}%</span>
                        <div className="w-12 bg-slate-800 rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full"
                            style={{ width: `${ioc.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{ioc.source}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ioc.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ioc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteIoc(ioc.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Delete IOC"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add IOC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Add Indicator of Compromise</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Indicator Type</label>
                  <select
                    value={newIoc.type}
                    onChange={(e) => setNewIoc({ ...newIoc, type: e.target.value })}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="IP">IP Address</option>
                    <option value="DOMAIN">Domain</option>
                    <option value="URL">URL</option>
                    <option value="SHA256">SHA-256 Hash</option>
                    <option value="MD5">MD5 Hash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Threat Type</label>
                  <select
                    value={newIoc.threat_type}
                    onChange={(e) => setNewIoc({ ...newIoc, threat_type: e.target.value })}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="C2">C2 Server</option>
                    <option value="Phishing">Phishing</option>
                    <option value="Botnet">Botnet</option>
                    <option value="Stealer">Infostealer</option>
                    <option value="Ransomware">Ransomware</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Indicator Value *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.1.100 or bad-domain.com"
                  value={newIoc.value}
                  onChange={(e) => setNewIoc({ ...newIoc, value: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Malware Family / Campaign</label>
                <input
                  type="text"
                  placeholder="e.g. Cobalt Strike, RedLine, Emotet"
                  value={newIoc.malware_family}
                  onChange={(e) => setNewIoc({ ...newIoc, malware_family: e.target.value })}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Confidence (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newIoc.confidence}
                    onChange={(e) => setNewIoc({ ...newIoc, confidence: Number(e.target.value) })}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Source Label</label>
                  <input
                    type="text"
                    value={newIoc.source}
                    onChange={(e) => setNewIoc({ ...newIoc, source: e.target.value })}
                    className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                  />
                </div>
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
                  Save Indicator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
