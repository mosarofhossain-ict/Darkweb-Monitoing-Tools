import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  RefreshCw, 
  ShieldCheck, 
  Key, 
  Lock, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  History,
  Save,
  Check
} from 'lucide-react';
import { Connector, AuditLog } from '../types';
import { api } from '../api';

interface SettingsConnectorsViewProps {
  connectors: Connector[];
  onRefresh: () => void;
}

export const SettingsConnectorsView: React.FC<SettingsConnectorsViewProps> = ({
  connectors,
  onRefresh,
}) => {
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [keysStatus, setKeysStatus] = useState<any>({});
  const [settings, setSettings] = useState<Record<string, string>>({
    retention_days: '90',
    safe_mode_enabled: 'true',
    alert_threshold: 'MEDIUM',
    notification_email: 'security-alerts@apextech.io',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettingsAndLogs();
  }, []);

  const loadSettingsAndLogs = async () => {
    try {
      setLoadingLogs(true);
      const [settingsRes, logsRes] = await Promise.all([
        api.getSettings(),
        api.getAuditLogs(),
      ]);
      setSettings(prev => ({ ...prev, ...(settingsRes.settings || {}) }));
      setKeysStatus(settingsRes.keysStatus || {});
      setAuditLogs(logsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSyncConnector = async (id: string) => {
    try {
      setSyncingId(id);
      const res = await api.syncConnector(id);
      alert(res.message);
      onRefresh();
      loadSettingsAndLogs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      loadSettingsAndLogs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Connectors, Compliance & System Policies
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Configure external public feeds, API credentials status, telemetry retention schedules, and immutable operator audit logs.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 flex items-center space-x-2">
          <Lock className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>Server-Side Secrets Only: Zero API keys exposed to browser</span>
        </div>
      </div>

      {/* Connectors Status & Sync Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              THREAT INTELLIGENCE & REPUTATION CONNECTORS ({connectors.length})
            </h3>
            <p className="text-xs text-slate-400">
              Live status and synchronization controls for authorized feeds
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connectors.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">{c.name}</h4>
                    <span className="text-[10px] text-cyan-400 font-mono">{c.category}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    c.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    c.status === 'NEEDS_KEY' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{c.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-850 flex items-center justify-between text-[11px]">
                <div className="text-slate-400">
                  <span>{c.record_count.toLocaleString()} records</span>
                  <span className="mx-1.5">•</span>
                  <span>{c.last_sync ? new Date(c.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never synced'}</span>
                </div>

                {c.enabled && c.status !== 'NEEDS_KEY' ? (
                  <button
                    onClick={() => handleSyncConnector(c.id)}
                    disabled={syncingId === c.id}
                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-cyan-400 border border-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingId === c.id ? 'animate-spin' : ''}`} />
                    <span>{syncingId === c.id ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">
                    Requires API key in .env or Secrets
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Retention & Security Policy Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            RETENTION & DEFENSIVE POLICY CONFIGURATION
          </h3>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Telemetry Retention Schedule
              </label>
              <select
                value={settings.retention_days}
                onChange={(e) => setSettings({ ...settings, retention_days: e.target.value })}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="30">30 Days (Rolling purge)</option>
                <option value="90">90 Days (Recommended SOC default)</option>
                <option value="180">180 Days (Extended incident tracking)</option>
                <option value="365">365 Days (Annual compliance audit)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Default Alert Trigger Threshold
              </label>
              <select
                value={settings.alert_threshold}
                onChange={(e) => setSettings({ ...settings, alert_threshold: e.target.value })}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="CRITICAL">Critical Severity Only</option>
                <option value="HIGH">High and Critical</option>
                <option value="MEDIUM">Medium and Above</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Security Operations Dispatch Email
              </label>
              <input
                type="email"
                value={settings.notification_email}
                onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-white block">Strict Safe Scanning Mode (No Automatic HTTP Requests)</span>
              <span className="text-[11px] text-slate-400">
                Guarantees that DarkWatch will strictly inspect DNS records, WHOIS, certificate logs, and URL syntax without triggering malicious web payloads.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ENFORCED
            </span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Configuration Saved</span>
              </span>
            )}
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save System Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Audit Log */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                OPERATOR SECURITY AUDIT LOG
              </h3>
              <p className="text-xs text-slate-400">
                Cryptographically tracked administrative and analysis actions
              </p>
            </div>
          </div>
          <button
            onClick={loadSettingsAndLogs}
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-3">TIMESTAMP</th>
                <th className="py-2.5 px-3">OPERATOR</th>
                <th className="py-2.5 px-3">ACTION</th>
                <th className="py-2.5 px-3">TARGET</th>
                <th className="py-2.5 px-3">DETAILS</th>
                <th className="py-2.5 px-3">IP ADDRESS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/30">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 font-medium">{log.user_email}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-cyan-300 border border-slate-800 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      {log.target_type}: {log.target_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">{log.details}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{log.ip_address}</td>
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
