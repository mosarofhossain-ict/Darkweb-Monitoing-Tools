import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Sparkles, 
  Terminal, 
  Copy, 
  Check, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle, 
  FileText,
  Activity,
  Calendar,
  Layers,
  Cpu,
  ShieldCheck
} from 'lucide-react';
import { Finding, AiThreatAnalysis, FindingStatus } from '../types';
import { api } from '../api';

interface FindingDetailModalProps {
  finding: Finding | null;
  onClose: () => void;
  onStatusUpdated: () => void;
}

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({
  finding,
  onClose,
  onStatusUpdated,
}) => {
  if (!finding) return null;

  const [activeTab, setActiveTab] = useState<'evidence' | 'ai' | 'playbook' | 'raw'>('evidence');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiThreatAnalysis | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [vtData, setVtData] = useState<any | null>(null);
  const [loadingVt, setLoadingVt] = useState(false);

  const handleLookupVirusTotal = async () => {
    try {
      setLoadingVt(true);
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(finding.target_asset);
      const isHash = /^[a-fA-F0-9]{32,64}$/.test(finding.target_asset);
      const isUrl = finding.target_asset.startsWith('http');
      const type = isIp ? 'ip' : (isHash ? 'hash' : (isUrl ? 'url' : 'domain'));

      const res = await api.lookupVirusTotal(finding.target_asset, type);
      setVtData(res);
    } catch (err: any) {
      alert('VirusTotal lookup: ' + err.message);
    } finally {
      setLoadingVt(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunAiAnalysis = async () => {
    try {
      setLoadingAi(true);
      const res = await api.analyzeFindingWithAi(finding.id);
      setAiAnalysis(res.analysis);
      setActiveTab('ai');
    } catch (err: any) {
      alert('AI analysis failed: ' + err.message);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleStatusChange = async (newStatus: FindingStatus) => {
    try {
      setUpdatingStatus(true);
      await api.updateFindingStatus(finding.id, newStatus);
      finding.status = newStatus;
      onStatusUpdated();
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const severityBadgeClass = 
    finding.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
    finding.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
    finding.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' :
    'bg-blue-500/20 text-blue-300 border-blue-500/40';

  const verificationBadgeClass = 
    finding.verification_status === 'CONFIRMED_EXPOSURE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
    finding.verification_status === 'SUSPECTED_EXPOSURE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
    'bg-slate-700/50 text-slate-300 border-slate-600/50';

  // Generate Abuse Takedown Email Template
  const abuseEmailDraft = `Subject: URGENT: Abuse Notification & Takedown Request - Brand Infringement / Malicious Infrastructure [Ref: ${finding.evidence_ref}]

To: abuse-contact@registrar.example / abuse@hosting-provider.example
From: Security Operations Center <soc@darkwatch.security>
Date: ${new Date().toUTCString()}

Dear Abuse Desk & Legal Compliance Team,

We are writing on behalf of authorized brand protection operations regarding unauthorized malicious activity originating from the following infrastructure under your administration:

Target Asset / Domain: ${finding.target_asset}
Observed Threat Category: ${finding.category}
Evidence Reference: ${finding.evidence_ref}
First Observed Timestamp: ${finding.first_seen}
Telemetry Confidence: ${finding.confidence}% (${finding.verification_status})

Summary of Infringing Activity:
The aforementioned resource is actively facilitating phishing, credential harvesting, or brand impersonation, violating your Acceptable Use Policy (AUP) and applicable consumer protection statutes.

Requested Immediate Actions:
1. Immediately suspend DNS delegation for domain: ${finding.target_asset}
2. Null-route / terminate upstream hosting services.
3. Preserve server logs and registrant transaction records for forensic inquiry.

Thank you for your prompt assistance in neutralizing malicious cyber infrastructure.

Sincerely,
DarkWatch AI Cyber Threat Intelligence Unit
Incident ID: ${finding.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-2 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${severityBadgeClass}`}>
                {finding.severity}
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${verificationBadgeClass}`}>
                {finding.verification_status.replace(/_/g, ' ')}
              </span>
              {finding.is_demo ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  DEMO DATA
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE FEED VERIFIED
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono">
                {finding.id}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white leading-snug">{finding.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'evidence'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Evidence & Details</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>AI Threat Analyst (Gemini)</span>
            {aiAnalysis && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
          </button>

          <button
            onClick={() => setActiveTab('playbook')}
            className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'playbook'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Remediation & Takedown</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`py-3 px-4 border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'raw'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Raw JSON Telemetry</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EVIDENCE */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              {/* Demo Mode Notice */}
              {finding.is_demo ? (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200 flex items-center space-x-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-500/50 flex-shrink-0">
                    DEMO DATA
                  </span>
                  <span>
                    This finding is simulated authorized telemetry for platform evaluation and SOC operator training. No unapproved networks were accessed.
                  </span>
                </div>
              ) : null}

              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">Target Asset</div>
                  <div className="font-mono text-xs font-semibold text-cyan-300 truncate mt-1">
                    {finding.target_asset}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">Telemetry Source</div>
                  <div className="text-xs font-semibold text-slate-200 truncate mt-1">
                    {finding.source}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">Confidence Score</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs font-bold text-slate-200">{finding.confidence}%</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full"
                        style={{ width: `${finding.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">First Observed</div>
                  <div className="text-xs font-medium text-slate-300 truncate mt-1">
                    {new Date(finding.first_seen).toLocaleString()}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">Last Observed</div>
                  <div className="text-xs font-medium text-slate-300 truncate mt-1">
                    {new Date(finding.last_seen).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Evidence Reference Banner */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Cryptographic / Log Evidence Reference</span>
                  <span className="font-mono text-xs text-slate-200 select-all">{finding.evidence_ref}</span>
                </div>
                <button
                  onClick={() => handleCopy(finding.evidence_ref, 'ref')}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center space-x-1.5 transition-colors"
                >
                  {copiedKey === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'ref' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* VirusTotal Live Telemetry Check */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span>VirusTotal v3 Multi-Engine Telemetry</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Query 90+ security engines for target: <code className="text-cyan-300 font-mono">{finding.target_asset}</code>
                    </span>
                  </div>
                  <button
                    onClick={handleLookupVirusTotal}
                    disabled={loadingVt}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loadingVt ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Querying VT...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Query VirusTotal</span>
                      </>
                    )}
                  </button>
                </div>

                {vtData && vtData.available && (
                  <div className="pt-2 border-t border-slate-850 space-y-2">
                    <div className="flex items-center space-x-3 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        vtData.stats.malicious > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {vtData.stats.malicious > 0 ? `${vtData.stats.malicious} Flagged Malicious` : 'Clean / Harmless'}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Engines: {vtData.stats.harmless} Harmless • {vtData.stats.undetected} Undetected • {vtData.stats.suspicious} Suspicious
                      </span>
                      {vtData.jarm && (
                        <span className="text-[10px] text-slate-500 font-mono truncate ml-auto">
                          JARM: {vtData.jarm.substring(0, 16)}...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              {finding.ai_summary && (
                <div className="bg-gradient-to-r from-purple-950/30 to-blue-950/20 border border-purple-900/40 p-4 rounded-xl">
                  <div className="flex items-center space-x-2 text-purple-300 font-semibold text-xs mb-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Analyst Threat Summary</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{finding.ai_summary}</p>
                </div>
              )}

              {/* Evidence Details Key-Values */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 text-xs font-bold text-slate-300">
                  OBSERVED EVIDENCE ATTRIBUTES
                </div>
                <div className="divide-y divide-slate-850">
                  {Object.entries(finding.evidence_details || {}).map(([key, val]) => (
                    <div key={key} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between text-xs hover:bg-slate-900/20">
                      <span className="text-slate-400 font-medium capitalize sm:w-1/3">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-200 font-mono sm:w-2/3 truncate mt-1 sm:mt-0">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI THREAT ANALYST */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {!aiAnalysis && !loadingAi && (
                <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-slate-800 p-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Gemini Cyber Threat Intelligence Analysis</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Execute real-time generative threat reasoning on this finding: correlate MITRE ATT&CK techniques, evaluate false positive probability, and construct defensive countermeasures.
                    </p>
                  </div>
                  <button
                    onClick={handleRunAiAnalysis}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center space-x-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run Deep Gemini 3.8 Analysis</span>
                  </button>
                </div>
              )}

              {loadingAi && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-purple-300 font-medium animate-pulse">
                    Evaluating telemetry against MITRE ATT&CK framework with Gemini...
                  </p>
                </div>
              )}

              {aiAnalysis && (
                <div className="space-y-6">
                  {/* Model & Source Bar */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-950 px-3.5 py-2 rounded-lg border border-slate-800 text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-3.5 h-3.5 text-purple-400" />
                      <span>Intelligence Model: <strong className="text-slate-200">{aiAnalysis.model}</strong></span>
                    </div>
                    <button
                      onClick={handleRunAiAnalysis}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Re-Analyze</span>
                    </button>
                  </div>

                  {/* Executive Brief */}
                  <div className="bg-purple-950/20 border border-purple-900/50 p-4 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-purple-300 tracking-wider">EXECUTIVE THREAT BRIEF</span>
                    <p className="text-xs text-slate-200 leading-relaxed">{aiAnalysis.executiveBrief}</p>
                  </div>

                  {/* Technical Threat Breakdown */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white tracking-wider flex items-center space-x-1.5">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      <span>TECHNICAL VECTOR & EVIDENCE ANALYSIS</span>
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{aiAnalysis.technicalBreakdown}</p>
                  </div>

                  {/* MITRE ATT&CK Matrix Mapping */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-white tracking-wider flex items-center space-x-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MITRE ATT&CK ADVERSARY TECHNIQUES</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {aiAnalysis.mitreAttackTechniques.map((tech, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs flex items-center space-x-2"
                        >
                          <span className="font-mono text-cyan-400 font-bold">{tech.id}</span>
                          <span className="text-slate-200 font-medium">{tech.name}</span>
                          <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                            {tech.tactic}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prioritized Defensive Recommendations */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-white tracking-wider">
                      PRIORITIZED DEFENSIVE PLAYBOOK
                    </div>
                    <div className="divide-y divide-slate-850 p-2 space-y-2">
                      {aiAnalysis.defensiveRecommendations.map((rec, i) => (
                        <div key={i} className="p-3 bg-slate-900/50 rounded-lg space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              rec.priority === 'IMMEDIATE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              rec.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              {rec.priority}
                            </span>
                            <span className="text-xs font-bold text-slate-200">{rec.action}</span>
                          </div>
                          <p className="text-xs text-slate-400 pl-2">{rec.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* False Positive Evaluation */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-300">False Positive Assessment:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        aiAnalysis.falsePositiveEvaluation.likelihood === 'VERY_LOW' || aiAnalysis.falsePositiveEvaluation.likelihood === 'LOW'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {aiAnalysis.falsePositiveEvaluation.likelihood} LIKELIHOOD
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{aiAnalysis.falsePositiveEvaluation.reasoning}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REMEDIATION & TAKEDOWN */}
          {activeTab === 'playbook' && (
            <div className="space-y-6">
              {/* DNS Sinkhole Snippet */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">DNS Sinkhole Policy Rule (BIND / CoreDNS)</span>
                  <button
                    onClick={() => handleCopy(`zone "${finding.target_asset}" { type master; file "/etc/bind/sinkhole.empty"; };`, 'dns')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    {copiedKey === 'dns' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'dns' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono text-cyan-300 bg-slate-950 overflow-x-auto">
{`# DarkWatch Automated Defensive Rule: Sinkhole malicious domain
zone "${finding.target_asset}" {
    type master;
    file "/etc/bind/sinkhole.empty";
    notify no;
};`}
                </pre>
              </div>

              {/* RFC 2142 Abuse Email Generator */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-200">Pre-Drafted RFC 2142 Abuse Takedown Notification</span>
                    <span className="text-[10px] text-slate-400 block">Ready to transmit to hosting provider or registrar</span>
                  </div>
                  <button
                    onClick={() => handleCopy(abuseEmailDraft, 'abuse')}
                    className="px-3 py-1 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center space-x-1.5 transition-colors"
                  >
                    {copiedKey === 'abuse' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'abuse' ? 'Copied to Clipboard' : 'Copy Notice'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={abuseEmailDraft}
                  rows={12}
                  className="w-full bg-slate-950 p-4 text-xs font-mono text-slate-300 focus:outline-none resize-none border-t border-slate-800"
                />
              </div>
            </div>
          )}

          {/* TAB 4: RAW JSON TELEMETRY */}
          {activeTab === 'raw' && (
            <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 overflow-x-auto">
              <pre className="text-xs font-mono text-slate-300 select-all">
                {JSON.stringify(finding, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer / Triage Actions */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Incident Triage:</span>
            {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE'] as FindingStatus[]).map(st => (
              <button
                key={st}
                disabled={updatingStatus || finding.status === st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  finding.status === st
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
