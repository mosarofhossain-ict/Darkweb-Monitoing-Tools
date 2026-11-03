import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  ShieldCheck, 
  Terminal, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { Finding, AiThreatAnalysis } from '../types';
import { api } from '../api';

interface AiAnalystStudioViewProps {
  findings: Finding[];
  onSelectFinding: (findingId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAnalystStudioView: React.FC<AiAnalystStudioViewProps> = ({
  findings,
  onSelectFinding,
}) => {
  const [selectedFindingId, setSelectedFindingId] = useState<string>(findings[0]?.id || '');
  const [analyzingFinding, setAnalyzingFinding] = useState(false);
  const [findingAnalysis, setFindingAnalysis] = useState<AiThreatAnalysis | null>(null);

  // Chat Assistant State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `Hello Operator. I am your DarkWatch AI Lead Cyber Threat Intelligence Assistant (Gemini 3.8 Flash). 

I provide real-time reasoning grounded strictly in your authorized telemetry. Ask me to correlate findings, evaluate MITRE ATT&CK techniques, draft executive briefs, or generate defensive countermeasure policies.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);

  const promptSuggestions = [
    'How should we contain the active phishing lookalike apextech-login.com?',
    'Evaluate perimeter risk from current CISA KEV vulnerabilities',
    'Draft an Executive Threat Brief for the CISO regarding our exposure findings',
    'What DNS sinkholing and firewall rules should we stage for active IOCs?',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || sendingQuery) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setSendingQuery(true);

    try {
      const res = await api.askSocAnalyst(q);
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `[Analyst Assistant Note]: Unable to complete generative reasoning query (${err.message}). Ensure your GEMINI_API_KEY is configured in Settings.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setSendingQuery(false);
    }
  };

  const handleAnalyzeSelectedFinding = async () => {
    if (!selectedFindingId) return;
    try {
      setAnalyzingFinding(true);
      const res = await api.analyzeFindingWithAi(selectedFindingId);
      setFindingAnalysis(res.analysis);
    } catch (err: any) {
      alert('Analysis error: ' + err.message);
    } finally {
      setAnalyzingFinding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/30 border border-purple-900/40 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              AI Cyber Threat Intelligence Studio (Gemini 3.8 Flash)
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Server-side AI threat reasoning engine. Strict evidentiary boundaries: zero invented sources, grounded MITRE ATT&CK mapping, and actionable containment playbooks.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-purple-300 flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>Server-Side @google/genai SDK Integration Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Chat Assistant (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white tracking-wide">SOC ANALYST COPILOT</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Grounded CTI Reasoning</span>
            </span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex space-x-3 text-xs ${
                  m.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed space-y-1.5 ${
                    m.sender === 'user'
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                  }`}
                >
                  <div className="text-[10px] font-mono opacity-60 flex justify-between">
                    <span>{m.sender === 'user' ? 'Operator' : 'DarkWatch CTI Analyst'}</span>
                    <span>{m.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-line text-xs font-sans">
                    {m.text}
                  </div>
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white flex-shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {sendingQuery && (
              <div className="flex items-center space-x-2 text-xs text-purple-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 w-fit">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></div>
                <span>Analyzing telemetry and formulating mitigation steps...</span>
              </div>
            )}
          </div>

          {/* Prompt Suggestions Chips */}
          <div className="px-4 py-2 bg-slate-950/50 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto text-[11px]">
            <span className="text-slate-400 flex-shrink-0">Suggested:</span>
            {promptSuggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 whitespace-nowrap transition-colors flex-shrink-0"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-3 bg-slate-950 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask CTI Analyst about findings, MITRE tactics, or perimeter defense..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 bg-slate-900 text-slate-200 px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={sendingQuery || !inputQuery.trim()}
                className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Finding Deep Dive Inspector (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white tracking-wide">TARGET INCIDENT ANALYZER</span>
            </div>
            <button
              onClick={handleAnalyzeSelectedFinding}
              disabled={analyzingFinding || !selectedFindingId}
              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{analyzingFinding ? 'Analyzing...' : 'Run Analysis'}</span>
            </button>
          </div>

          <div className="p-4 border-b border-slate-800 bg-slate-950/40">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Select Monitored Finding to Dissect:
            </label>
            <select
              value={selectedFindingId}
              onChange={(e) => {
                setSelectedFindingId(e.target.value);
                setFindingAnalysis(null);
              }}
              className="w-full bg-slate-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {findings.map((f) => (
                <option key={f.id} value={f.id}>
                  [{f.severity}] {f.title} ({f.source})
                </option>
              ))}
            </select>
          </div>

          {/* Finding Analysis Output */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!findingAnalysis && !analyzingFinding && (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Select any finding above and click <strong className="text-purple-300">Run Analysis</strong> to invoke Gemini 3.8 Flash for instant MITRE ATT&CK mapping and technical remediation recommendations.
                </p>
              </div>
            )}

            {analyzingFinding && (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-purple-300 animate-pulse">Running Gemini threat reasoning...</p>
              </div>
            )}

            {findingAnalysis && (
              <div className="space-y-4">
                {/* Executive Brief */}
                <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-900/50 space-y-1">
                  <span className="text-[10px] font-bold text-purple-300 tracking-wider">EXECUTIVE THREAT SUMMARY</span>
                  <p className="text-xs text-slate-200 leading-relaxed">{findingAnalysis.executiveBrief}</p>
                </div>

                {/* MITRE Badges */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300">MITRE ATT&CK Mapping:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {findingAnalysis.mitreAttackTechniques.map((m, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded bg-slate-950 text-cyan-300 border border-slate-800 font-mono">
                        <strong>{m.id}</strong>: {m.name} ({m.tactic})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Technical Breakdown */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-300">Technical Breakdown:</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{findingAnalysis.technicalBreakdown}</p>
                </div>

                {/* Defensive Actions */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">Defensive Actions:</span>
                  {findingAnalysis.defensiveRecommendations.map((rec, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          rec.priority === 'IMMEDIATE' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {rec.priority}
                        </span>
                        <span className="font-semibold text-slate-200">{rec.action}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-2">{rec.details}</p>
                    </div>
                  ))}
                </div>

                {/* False Positive Check */}
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                  <span className="text-slate-400">False Positive Probability:</span>
                  <span className="font-bold text-emerald-400">{findingAnalysis.falsePositiveEvaluation.likelihood}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
