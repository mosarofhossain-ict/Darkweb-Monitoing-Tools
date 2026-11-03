export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FindingCategory = 
  | 'BRAND_IMPERSONATION'
  | 'PHISHING'
  | 'DATA_LEAK'
  | 'DARKWEB_MENTION'
  | 'IOC_MATCH'
  | 'VULNERABILITY_EXPLOIT';

export type FindingStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'FALSE_POSITIVE';

export type VerificationStatus = 'CONFIRMED_EXPOSURE' | 'SUSPECTED_EXPOSURE' | 'UNVERIFIED_MENTION';

export interface Brand {
  id: string;
  name: string;
  legal_name?: string;
  primary_domain: string;
  additional_domains: string[];
  keywords: string[];
  contact_email?: string;
  authorized_by?: string;
  authorization_date?: string;
  status: 'ACTIVE' | 'PAUSED';
  created_at: string;
  updated_at: string;
}

export interface Finding {
  id: string;
  brand_id?: string;
  brand_name?: string;
  brand_domain?: string;
  title: string;
  category: FindingCategory;
  severity: Severity;
  status: FindingStatus;
  source: string;
  confidence: number;
  verification_status: VerificationStatus;
  first_seen: string;
  last_seen: string;
  evidence_ref: string;
  target_asset: string;
  evidence_details: Record<string, any>;
  ai_summary?: string;
  is_demo: number | boolean;
  created_at: string;
}

export interface IOC {
  id: string;
  type: 'IP' | 'DOMAIN' | 'URL' | 'MD5' | 'SHA256';
  value: string;
  threat_type: string;
  malware_family?: string;
  confidence: number;
  source: string;
  first_seen: string;
  last_seen: string;
  tags: string[];
  status: 'ACTIVE' | 'REVOKED' | 'MONITORED';
  associated_findings_count?: number;
  is_demo: number | boolean;
  created_at: string;
}

export interface Connector {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: number | boolean;
  requires_key: number | boolean;
  has_key: number | boolean;
  status: 'HEALTHY' | 'DEGRADED' | 'DISABLED' | 'NEEDS_KEY';
  last_sync?: string | null;
  record_count: number;
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  finding_id?: string;
  severity: Severity;
  title: string;
  message: string;
  channel: string;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  brandsCount: number;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  openFindings: number;
  unreadAlerts: number;
  totalIocs: number;
  postureScore: number;
  severityBreakdown: Array<{ severity: Severity; count: number }>;
  categoryBreakdown: Array<{ category: FindingCategory; count: number }>;
  verificationBreakdown: Array<{ verification_status: VerificationStatus; count: number }>;
  connectors: Connector[];
  trendDays: Array<{ date: string; findings: number; iocs: number }>;
}

export interface AiThreatAnalysis {
  sourceAi: boolean;
  model: string;
  executiveSummary: string;
  technicalBreakdown: string;
  mitreAttackTechniques: Array<{ id: string; name: string; tactic: string }>;
  defensiveRecommendations: Array<{ priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM'; action: string; details: string }>;
  falsePositiveEvaluation: {
    likelihood: 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH';
    reasoning: string;
  };
  executiveBrief: string;
}
