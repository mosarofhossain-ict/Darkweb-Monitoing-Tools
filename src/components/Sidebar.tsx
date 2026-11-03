import React from 'react';
import { 
  LayoutDashboard, 
  Globe, 
  Database, 
  ShieldAlert, 
  Crosshair, 
  Flame, 
  Sparkles, 
  Bell, 
  FileText, 
  Settings,
  Building2,
  Lock,
  Layers
} from 'lucide-react';
import { Brand, DashboardStats } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  brands: Brand[];
  selectedBrandId: string;
  onSelectBrand: (brandId: string) => void;
  stats: DashboardStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  brands,
  selectedBrandId,
  onSelectBrand,
  stats,
}) => {
  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'brand-monitoring', label: 'Brand Monitoring', icon: Globe, badge: stats?.brandsCount ? `${stats.brandsCount}` : null },
    { id: 'data-leak', label: 'Data Leak Intelligence', icon: Database, badge: null },
    { id: 'dark-web', label: 'Dark Web Intelligence', icon: ShieldAlert, badge: 'Lawful' },
    { id: 'threat-intel', label: 'Threat Intelligence', icon: Flame, badge: 'KEV/APT' },
    { id: 'ioc-management', label: 'IOC Management', icon: Layers, badge: stats?.totalIocs ? `${stats.totalIocs}` : null },
    { id: 'phishing', label: 'Phishing & Impersonation', icon: Crosshair, badge: null },
    { id: 'ai-analyst', label: 'AI Threat Analyst', icon: Sparkles, badge: 'Gemini' },
    { id: 'alerts', label: 'Alerts & Triage', icon: Bell, badge: stats?.unreadAlerts ? `${stats.unreadAlerts}` : null },
    { id: 'reports', label: 'Reports', icon: FileText, badge: 'DOCX/PDF' },
    { id: 'settings', label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-950/70 border-r border-slate-800/80 flex flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] select-none">
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* Brand Switcher */}
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-bold text-slate-400 tracking-wider flex items-center space-x-1">
              <Building2 className="w-3 h-3 text-cyan-400" />
              <span>AUTHORIZED BRAND</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
              <Lock className="w-2.5 h-2.5" />
              <span>Active</span>
            </span>
          </div>
          <select
            value={selectedBrandId}
            onChange={(e) => onSelectBrand(e.target.value)}
            className="w-full bg-slate-950 text-slate-200 text-xs font-medium rounded-lg border border-slate-700/80 px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Authorized Assets ({brands.length})</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.primary_domain})
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          <div className="px-2 pb-1 text-[10px] font-bold text-slate-400 tracking-wider">
            SECURITY MODULES
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-200'
                        : item.badge === 'Gemini'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : item.badge === 'Lawful'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Security Telemetry Tag */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <div className="rounded-lg bg-slate-900/90 p-2.5 border border-slate-800 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-slate-300">Local SQLite DB</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">WAL</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Safe Scan Mode</span>
            <span className="text-cyan-400 font-medium">Metadata Only</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
