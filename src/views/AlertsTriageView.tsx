import React, { useState } from 'react';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Mail, 
  ExternalLink, 
  Sliders, 
  RefreshCw,
  Send,
  ShieldAlert
} from 'lucide-react';
import { Alert } from '../types';
import { api } from '../api';

interface AlertsTriageViewProps {
  alerts: Alert[];
  onSelectFinding: (findingId: string) => void;
  onRefresh: () => void;
}

export const AlertsTriageView: React.FC<AlertsTriageViewProps> = ({
  alerts,
  onSelectFinding,
  onRefresh,
}) => {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [testTitle, setTestTitle] = useState('New Lookalike Domain Registered: apextech-auth.online');
  const [testSeverity, setTestSeverity] = useState('HIGH');
  const [testMessage, setTestMessage] = useState('Public CT Log entry detected newly minted TLS certificate for unauthorized lookalike brand domain.');
  const [sendingTest, setSendingTest] = useState(false);

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    return true;
  });

  const handleMarkRead = async (id: string) => {
    try {
      await api.markAlertRead(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSendingTest(true);
      await api.sendTestAlert({
        severity: testSeverity,
        title: testTitle,
        message: testMessage,
      });
      onRefresh();
    } catch (err: any) {
      alert('Error triggering alert: ' + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Incident Alerts & Triage Center
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Real-time alerting thresholds for domain impersonation, credential leaks, and critical CISA vulnerabilities.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Severity Filter:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Alert Log List (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide">
              INCIDENT NOTIFICATIONS STREAM ({filteredAlerts.length})
            </h3>
            <span className="text-xs text-slate-400">
              {alerts.filter(a => a.status === 'UNREAD').length} Unacknowledged
            </span>
          </div>

          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                No active incident alerts recorded.
              </div>
            ) : (
              filteredAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border transition-all text-xs space-y-2 ${
                    a.status === 'UNREAD'
                      ? 'bg-slate-950 border-cyan-800/40 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        a.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                        a.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {a.severity}
                      </span>
                      <span className="font-bold text-white text-xs">{a.title}</span>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                      {a.status === 'UNREAD' && (
                        <button
                          onClick={() => handleMarkRead(a.id)}
                          className="text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-xs">{a.message}</p>

                  {a.finding_id && (
                    <div className="pt-2 border-t border-slate-850 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">Linked Finding ID: {a.finding_id}</span>
                      <button
                        onClick={() => onSelectFinding(a.finding_id!)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
                      >
                        <span>Investigate Incident</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Alert Channels & Simulator (1 Col) */}
        <div className="space-y-6">
          {/* Test Alert Simulator */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">TEST ALERT SIMULATOR</h3>
            </div>
            <p className="text-xs text-slate-400">
              Verify alert routing, in-app notifications, and triage handlers with simulated payload.
            </p>

            <form onSubmit={handleSendTestAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Severity</label>
                <select
                  value={testSeverity}
                  onChange={(e) => setTestSeverity(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Alert Title</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Message Description</label>
                <textarea
                  rows={3}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 p-2.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingTest}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingTest ? 'Broadcasting...' : 'Simulate SOC Alert'}</span>
              </button>
            </form>
          </div>

          {/* Email Connector Placeholder */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl text-xs">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-white tracking-wide">EMAIL DISPATCH PLACEHOLDER</h3>
            </div>
            <p className="text-slate-400 text-[11px]">
              Optional SMTP / SendGrid dispatch integration for critical alerts.
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="text-slate-400">Target: security-alerts@apextech.io</div>
              <div className="text-slate-400">Status: In-App Direct Logging Enabled</div>
              <div className="text-emerald-400">Connector: Ready for SMTP webhook hookup</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
