import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FindingDetailModal } from './components/FindingDetailModal';

// Views
import { OverviewDashboard } from './views/OverviewDashboard';
import { BrandMonitoringView } from './views/BrandMonitoringView';
import { DataLeakExposureView } from './views/DataLeakExposureView';
import { DarkWebFeedsView } from './views/DarkWebFeedsView';
import { PhishingImpersonationView } from './views/PhishingImpersonationView';
import { ThreatIntelIocsView } from './views/ThreatIntelIocsView';
import { ThreatIntelligenceView } from './views/ThreatIntelligenceView';
import { AiAnalystStudioView } from './views/AiAnalystStudioView';
import { AlertsTriageView } from './views/AlertsTriageView';
import { ReportsExportView } from './views/ReportsExportView';
import { SettingsConnectorsView } from './views/SettingsConnectorsView';

import { DashboardStats, Brand, Finding, IOC, Connector, Alert } from './types';
import { api } from './api';
import { ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('ALL');
  const [inspectingFindingId, setInspectingFindingId] = useState<string | null>(null);

  // Core Data State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [statsData, brandsData, findingsData, iocsData, connectorsData, alertsData] = await Promise.all([
        api.getStats(),
        api.getBrands(),
        api.getFindings({ brand_id: selectedBrandId !== 'ALL' ? selectedBrandId : undefined }),
        api.getIocs(),
        api.getConnectors(),
        api.getAlerts(),
      ]);

      setStats(statsData);
      setBrands(brandsData);
      setFindings(findingsData);
      setIocs(iocsData);
      setConnectors(connectorsData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error('Failed to load application data:', err);
      setError(err.message || 'Error communicating with DarkWatch backend services');
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedFinding = findings.find(f => f.id === inspectingFindingId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <Header
        stats={stats}
        onRefresh={loadData}
        onSelectFinding={(id) => setInspectingFindingId(id)}
        onNavigate={(tab) => setCurrentTab(tab)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          brands={brands}
          selectedBrandId={selectedBrandId}
          onSelectBrand={(id) => setSelectedBrandId(id)}
          stats={stats}
        />

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/90">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-300 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Backend notice: {error}</span>
              </div>
              <button
                onClick={loadData}
                className="px-3 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-xs font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-cyan-400 font-medium">
                Initializing DarkWatch AI Cyber Intelligence telemetry & SQLite core...
              </p>
            </div>
          ) : (
            <>
              {currentTab === 'overview' && (
                <OverviewDashboard
                  stats={stats}
                  findings={findings}
                  onSelectFinding={(id) => setInspectingFindingId(id)}
                  onRefresh={loadData}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'brand-monitoring' && (
                <BrandMonitoringView
                  brands={brands}
                  findings={findings}
                  onSelectFinding={(id) => setInspectingFindingId(id)}
                  onRefresh={loadData}
                />
              )}

              {currentTab === 'data-leak' && (
                <DataLeakExposureView
                  findings={findings}
                  brands={brands}
                  onSelectFinding={(id) => setInspectingFindingId(id)}
                />
              )}

              {currentTab === 'dark-web' && (
                <DarkWebFeedsView
                  findings={findings}
                  onSelectFinding={(id) => setInspectingFindingId(id)}
                  onNavigate={(tab) => setCurrentTab(tab)}
                />
              )}

              {currentTab === 'phishing' && (
                <PhishingImpersonationView
                  findings={findings}
                  onSelectFinding={(id) => setInspectingFindingId(id)}
                />
              )}

              {currentTab === 'threat-intel' && (
                <ThreatIntelligenceView
                  stats={stats}
                  onNavigateToIocs={() => setCurrentTab('ioc-management')}
                  onNavigateToAi={() => setCurrentTab('ai-analyst')}
                />
              )}

              {currentTab === 'ioc-management' && (
                <ThreatIntelIocsView
                  iocs={iocs}
                  onRefresh={loadData}
                />
              )}

              {currentTab === 'ai-analyst' && (
                <AiAnalystStudioView
                  findings={findings}
                  onSelectFinding={(id) => setInspectingFindingId(id)}
                />
              )}

              {currentTab === 'alerts' && (
                <AlertsTriageView
                  alerts={alerts}
                  onSelectFinding={(id) => setInspectingFindingId(id)}
                  onRefresh={loadData}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsExportView
                  brands={brands}
                  findings={findings}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsConnectorsView
                  connectors={connectors}
                  onRefresh={loadData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Finding Detail & AI Analysis Drawer/Modal */}
      {selectedFinding && (
        <FindingDetailModal
          finding={selectedFinding}
          onClose={() => setInspectingFindingId(null)}
          onStatusUpdated={loadData}
        />
      )}
    </div>
  );
}
