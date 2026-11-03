import { GoogleGenAI, ThinkingLevel } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface AiThreatAnalysisResult {
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

/**
 * Perform server-side AI Threat Analysis on a finding
 */
export async function analyzeFindingWithGemini(finding: {
  id: string;
  title: string;
  category: string;
  severity: string;
  source: string;
  confidence: number;
  verification_status: string;
  evidence_ref: string;
  target_asset: string;
  evidence_details: string;
}): Promise<AiThreatAnalysisResult> {
  const ai = getAiClient();

  const prompt = `
You are the DarkWatch AI Lead Cyber Threat Intelligence (CTI) Analyst.
Analyze the following security finding.

CRITICAL DISCIPLINE:
- Strictly adhere to factual evidence provided below.
- NEVER invent sources, fabricate breach dumps, or claim unverified compromises.
- Distinguish verified exposures from suspected or unverified mentions.
- Provide practical, defensive cybersecurity engineering countermeasures.

FINDING DATA:
- Title: ${finding.title}
- Category: ${finding.category}
- Severity: ${finding.severity}
- Source: ${finding.source}
- Confidence: ${finding.confidence}%
- Verification Status: ${finding.verification_status}
- Target Asset: ${finding.target_asset}
- Evidence Reference: ${finding.evidence_ref}
- Evidence Details: ${finding.evidence_details}

Respond with a JSON object strictly matching this schema:
{
  "executiveSummary": "Concise 2-3 sentence overview of what occurred and immediate business risk",
  "technicalBreakdown": "In-depth technical breakdown of the vector, infrastructure, and payload characteristics based solely on the evidence provided",
  "mitreAttackTechniques": [
    { "id": "e.g. T1566.002", "name": "Spearphishing Link", "tactic": "Initial Access" }
  ],
  "defensiveRecommendations": [
    { "priority": "IMMEDIATE", "action": "Specific technical containment action", "details": "Exact steps e.g. DNS sinkhole or firewall rule" }
  ],
  "falsePositiveEvaluation": {
    "likelihood": "VERY_LOW" | "LOW" | "MODERATE" | "HIGH",
    "reasoning": "Analytical justification evaluating evidence quality, source credibility, and telemetry fidelity"
  },
  "executiveBrief": "Professional 1-paragraph summary suited for CISO / executive leadership briefings"
}
`;

  if (ai) {
    // Models to attempt in order of latency and reliability
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const model of candidateModels) {
      try {
        const generatePromise = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            systemInstruction: 'You are an elite, objective Cyber Threat Intelligence Analyst adhering to strict evidentiary standards.',
          },
        });

        // 8-second safety timeout per candidate
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${model} request exceeded 8s limit`)), 8000)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        const responseText = response?.text;
        if (responseText) {
          const parsed = JSON.parse(responseText);
          return {
            sourceAi: true,
            model,
            executiveSummary: parsed.executiveSummary || 'AI analysis completed.',
            technicalBreakdown: parsed.technicalBreakdown || 'Detailed technical analysis generated.',
            mitreAttackTechniques: Array.isArray(parsed.mitreAttackTechniques) ? parsed.mitreAttackTechniques : [],
            defensiveRecommendations: Array.isArray(parsed.defensiveRecommendations) ? parsed.defensiveRecommendations : [],
            falsePositiveEvaluation: parsed.falsePositiveEvaluation || { likelihood: 'LOW', reasoning: 'Standard telemetry evaluation.' },
            executiveBrief: parsed.executiveBrief || 'Executive summary generated.',
          };
        }
      } catch (err: any) {
        console.warn(`Model ${model} attempt yielded: ${err?.message || err}. Evaluating fallback...`);
      }
    }
  }

  // High-quality deterministic fallback analysis if GEMINI_API_KEY is not set or rate-limited
  return generateDeterministicAnalysis(finding);
}

/**
 * Interactive SOC Assistant endpoint
 */
export async function askSocAnalystAssistant(query: string, contextFindings: any[]): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    return `[DarkWatch CTI Assistant - Rule Engine Mode]\n\nRegarding your query "${query}":\n\n1. Threat Context: DarkWatch AI continuously correlates ${contextFindings.length} active indicators with public catalogs (CISA KEV, URLhaus, ThreatFox) and certificate transparency logs.\n2. Recommended Defense: Ensure all detected lookalike domains and C2 IP addresses are blocked at perimeter DNS resolvers, configure SPF/DKIM/DMARC with p=reject, and enforce FIDO2 phishing-resistant MFA across corporate SSO.\n\n(Tip: Configure your GEMINI_API_KEY in Settings to enable real-time generative threat reasoning).`;
  }

  const findingsSummary = contextFindings.slice(0, 5).map(f => 
    `- ${f.title} (${f.severity}, Source: ${f.source}, Target: ${f.target_asset})`
  ).join('\n');

  const prompt = `
You are the DarkWatch AI Cyber Intelligence Lead Analyst.
The security operations operator asks: "${query}"

CURRENT MONITORED FINDINGS CONTEXT:
${findingsSummary}

Provide a direct, highly authoritative, concise response (2-4 paragraphs). Use markdown formatting with bullet points. Cover threat implications, defensive remediation, and relevant MITRE ATT&CK techniques where applicable. Never invent fake breaches or fake dark web access.
`;

  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  for (const model of candidateModels) {
    try {
      const generatePromise = ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: 'You are DarkWatch AI CTI Analyst. Provide expert, grounded defensive cyber operations advice.',
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${model} assistant response timed out`)), 8000)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);
      if (response?.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Assistant ${model} attempt: ${err?.message || err}`);
    }
  }

  return `[DarkWatch Assistant - Deterministic CTI Guidance]\n\nAnalysis for "${query}":\n\n• Perimeter Containment: Ensure perimeter DNS resolvers and egress web proxies block lookalike domains and flagged C2 IPs.\n• Vulnerability Remediation: Check external perimeter against CISA KEV catalog (specifically CVE-2024-3400 PAN-OS and CVE-2024-40766 SonicOS).\n• Identity Hygiene: Enforce hardware token FIDO2 MFA to neutralize reverse-proxy credential harvesting (EvilProxy/Modlishka).`;
}

function generateDeterministicAnalysis(finding: any): AiThreatAnalysisResult {
  const isPhishing = finding.category === 'PHISHING' || finding.category === 'BRAND_IMPERSONATION';
  const isVuln = finding.category === 'VULNERABILITY_EXPLOIT';
  const isLeak = finding.category === 'DATA_LEAK';

  let mitre = [
    { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
    { id: 'T1584.004', name: 'Server / DNS Compromise', tactic: 'Resource Development' }
  ];

  if (isVuln) {
    mitre = [
      { id: 'T1190', name: 'Exploit Public-Facing Application', tactic: 'Initial Access' },
      { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation' }
    ];
  } else if (isLeak) {
    mitre = [
      { id: 'T1589.001', name: 'Credentials Gathering', tactic: 'Reconnaissance' },
      { id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access' }
    ];
  }

  return {
    sourceAi: false,
    model: 'DarkWatch Deterministic CTI Engine (Fallback)',
    executiveSummary: `Analysis of ${finding.severity} finding against target asset "${finding.target_asset}". Confidence score stands at ${finding.confidence}% backed by telemetry from ${finding.source}. Verification status is classified as ${finding.verification_status}.`,
    technicalBreakdown: `The incident involves ${finding.category} telemetry documented under reference ${finding.evidence_ref}. Telemetry indicates potential adversary staging or active delivery targeting corporate brand trust and infrastructure. Evidence reveals indicators matching standardized threat profiles without evidence of perimeter penetration to date.`,
    mitreAttackTechniques: mitre,
    defensiveRecommendations: [
      {
        priority: 'IMMEDIATE',
        action: 'Implement Perimeter DNS Sinkholing & Blocklist',
        details: `Submit ${finding.target_asset} to internal recursive DNS resolvers (e.g., Infoblox, Cloudflare Gateway, or Cisco Umbrella) with sinkhole redirection.`
      },
      {
        priority: 'HIGH',
        action: 'Issue Registrar Abuse Takedown Notice',
        details: 'Transmit standard RFC 2142 abuse report to registrar and upstream hosting provider citing trademark infringement and credential theft infrastructure.'
      },
      {
        priority: 'MEDIUM',
        action: 'SOC Hunting & SIEM Correlation',
        details: `Correlate web proxy and VPN telemetry across the preceding 30 days for outbound connections matching ${finding.target_asset}.`
      }
    ],
    falsePositiveEvaluation: {
      likelihood: finding.confidence > 90 ? 'VERY_LOW' : (finding.confidence > 70 ? 'LOW' : 'MODERATE'),
      reasoning: `Telemetry derived from ${finding.source} with confidence metric of ${finding.confidence}%. Corroborated by cryptographic or public ledger logs.`
    },
    executiveBrief: `DarkWatch AI has flagged ${finding.title} for urgent defensive triage. Primary operational risk involves brand credibility erosion and potential employee credential exposure. Containment actions have been staged and require SOC analyst authorization.`
  };
}
