import React, { useState } from 'react';
import { 
  Shield, 
  RefreshCw, 
  Bell, 
  CheckCircle2, 
  Info, 
  Activity, 
  ExternalLink,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { Alert, DashboardStats } from '../types';
import { api } from '../api';

interface HeaderProps {
  stats: DashboardStats | null;
  onRefresh: () => void;
  onSelectFinding?: (findingId: string) => void;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ stats, onRefresh, onSelectFinding, onNavigate }) => {
  const [syncing, setSyncing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleQuickSync = async () => {
    try {
      setSyncing(true);
      setSyncMessage('Synchronizing public feeds (CISA KEV, URLhaus, ThreatFox)...');
      await Promise.allSettled([
        api.syncConnector('cisa-kev'),
        api.syncConnector('urlhaus'),
        api.syncConnector('threatfox'),
      ]);
      setSyncMessage('Feeds synchronized successfully.');
      onRefresh();
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err: any) {
      setSyncMessage('Sync finished with notices.');
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenAlerts = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      try {
        const data = await api.getAlerts();
        setAlerts(data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMarkRead = async (id: string) => {
    await api.markAlertRead(id);
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'READ' } : a));
    onRefresh();
  };

  const posture = stats?.postureScore ?? 82;
  const postureColor = posture >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : (posture >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30');

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left: Branding & Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-wider text-white">DARKWATCH</span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">AI</span>
              </div>
              <p className="text-[11px] text-slate-400">Cyber Intelligence & Brand Protection Platform</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-slate-800">
            <div className="group relative">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-950/40 text-cyan-400 border border-cyan-800/50 hover:bg-cyan-950/60 transition-colors cursor-help">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lawful CTI Sourcing</span>
                <Info className="w-3 h-3 text-cyan-500/80" />
              </span>
              <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-72 p-3 bg-slate-900 text-[11px] text-slate-300 rounded-lg shadow-2xl border border-slate-700 z-50">
                <p className="font-semibold text-cyan-300 mb-1">Ethical & Lawful CTI Policy</p>
                Strict adherence to approved feeds, public catalogs, and licensed CTI partners. DarkWatch AI never crawls or interacts with illicit dark web marketplaces or unauthorized onion services.
              </div>
            </div>

            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${postureColor}`}>
              <Activity className="w-3.5 h-3.5" />
              <span>Posture Score: {posture}/100</span>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
              <span>DEMO MODE ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Right: Actions, Alerts, Operator */}
        <div className="flex items-center space-x-3">
          {syncMessage && (
            <span className="text-xs text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800 animate-pulse hidden md:inline">
              {syncMessage}
            </span>
          )}

          <button
            onClick={handleQuickSync}
            disabled={syncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors shadow-sm disabled:opacity-50"
            title="Poll public threat feeds (CISA KEV, URLhaus, ThreatFox)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Feeds'}</span>
          </button>

          {/* Notifications Drawer */}
          <div className="relative">
            <button
              onClick={handleOpenAlerts}
              className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
              aria-label="Alerts"
            >
              <Bell className="w-4 h-4" />
              {(stats?.unreadAlerts ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {stats?.unreadAlerts}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white tracking-wider">INCIDENT ALERTS</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {alerts.filter(a => a.status === 'UNREAD').length} unread
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {alerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No recent incident alerts</div>
                  ) : (
                    alerts.slice(0, 6).map(alert => (
                      <div
                        key={alert.id}
                        className={`p-3.5 text-xs transition-colors hover:bg-slate-800/40 ${alert.status === 'UNREAD' ? 'bg-slate-800/20' : 'opacity-70'}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            alert.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            alert.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] text-slate-500">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="font-semibold text-slate-200 mt-1.5">{alert.title}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-2">{alert.message}</p>
                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/50">
                          {alert.finding_id && onSelectFinding && (
                            <button
                              onClick={() => {
                                onSelectFinding(alert.finding_id!);
                                setShowNotifications(false);
                              }}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                            >
                              <span>Investigate</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                          {alert.status === 'UNREAD' && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-200 ml-auto"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 bg-slate-950 border-t border-slate-800 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      onNavigate?.('alerts');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    View All Incident Alerts →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Operator Profile */}
          <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-800">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="text-left text-[11px] leading-tight">
              <div className="font-semibold text-slate-200">mosarof.ict@gmail.com</div>
              <div className="text-slate-400 text-[10px]">Lead CTI Officer</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
