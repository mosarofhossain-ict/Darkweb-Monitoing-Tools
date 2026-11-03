import { DashboardStats, Brand, Finding, IOC, Connector, Alert, AuditLog, AiThreatAnalysis } from './types';

export const api = {
  async getHealth() {
    const res = await fetch('/api/health');
    return res.json();
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Failed to load dashboard metrics');
    return res.json();
  },

  async getBrands(): Promise<Brand[]> {
    const res = await fetch('/api/brands');
    if (!res.ok) throw new Error('Failed to load brands');
    return res.json();
  },

  async createBrand(brandData: Partial<Brand>) {
    const res = await fetch('/api/brands', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brandData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create brand');
    }
    return res.json();
  },

  async deleteBrand(id: string) {
    const res = await fetch(`/api/brands/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getFindings(filters: Record<string, string | number | boolean | undefined> = {}): Promise<Finding[]> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== '') params.append(k, String(v));
    }
    const res = await fetch(`/api/findings?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load findings');
    return res.json();
  },

  async getFindingById(id: string): Promise<Finding> {
    const res = await fetch(`/api/findings/${id}`);
    if (!res.ok) throw new Error('Failed to load finding details');
    return res.json();
  },

  async updateFindingStatus(id: string, status: string) {
    const res = await fetch(`/api/findings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update finding status');
    return res.json();
  },

  async analyzeFindingWithAi(id: string): Promise<{ analysis: AiThreatAnalysis }> {
    const res = await fetch(`/api/findings/${id}/ai-analyze`, { method: 'POST' });
    if (!res.ok) throw new Error('AI Threat Analysis request failed');
    return res.json();
  },

  async askSocAnalyst(query: string): Promise<{ answer: string }> {
    const res = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error('AI Assistant request failed');
    return res.json();
  },

  async getIocs(filters: Record<string, string | number | boolean | undefined> = {}): Promise<IOC[]> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== '') params.append(k, String(v));
    }
    const res = await fetch(`/api/iocs?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load IOCs');
    return res.json();
  },

  async createIoc(iocData: Partial<IOC>) {
    const res = await fetch('/api/iocs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(iocData),
    });
    if (!res.ok) throw new Error('Failed to add IOC');
    return res.json();
  },

  async deleteIoc(id: string) {
    const res = await fetch(`/api/iocs/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async getConnectors(): Promise<Connector[]> {
    const res = await fetch('/api/connectors');
    if (!res.ok) throw new Error('Failed to load connectors');
    return res.json();
  },

  async syncConnector(id: string) {
    const res = await fetch(`/api/connectors/sync/${id}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to sync connector');
    return data;
  },

  async checkImpersonation(domain: string) {
    const res = await fetch('/api/impersonation/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    if (!res.ok) throw new Error('Failed to run lookalike domain analysis');
    return res.json();
  },

  async inspectUrlSafely(url: string) {
    const res = await fetch('/api/url-analyzer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error('URL inspection failed');
    return res.json();
  },

  async lookupVirusTotal(target: string, type: 'domain' | 'ip' | 'hash' | 'url' = 'domain') {
    const res = await fetch('/api/virustotal/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, type }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'VirusTotal lookup failed');
    }
    return res.json();
  },

  async lookupHibp(query: string) {
    const res = await fetch('/api/hibp/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'HIBP breach catalog lookup failed');
    }
    return res.json();
  },

  async getAlerts(): Promise<Alert[]> {
    const res = await fetch('/api/alerts');
    if (!res.ok) throw new Error('Failed to load alerts');
    return res.json();
  },

  async markAlertRead(id: string) {
    const res = await fetch(`/api/alerts/${id}/read`, { method: 'PATCH' });
    return res.json();
  },

  async sendTestAlert(data: { severity: string; title: string; message: string }) {
    const res = await fetch('/api/alerts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/audit-logs');
    if (!res.ok) throw new Error('Failed to load audit logs');
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load platform settings');
    return res.json();
  },

  async updateSettings(settings: Record<string, any>) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    return res.json();
  },
};
