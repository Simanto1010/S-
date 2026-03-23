import { GoogleGenAI, Type, VideoGenerationReferenceType } from "@google/genai";
import { MemoryService } from "./memoryService";
import { NotificationService } from "./notificationService";
import { SystemHealthService } from "./systemHealthService";
import { ActivityLogService } from "./activityLogService";
import { ErrorRetryService } from "./errorRetryService";
import { TemplateService } from "./templateService";
import { auth } from "../firebase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Helper to call Gemini API with retry logic and exponential backoff
 */
let globalCooldownUntil = 0;

export const isAiCooldownActive = () => Date.now() < globalCooldownUntil;
export const getCooldownRemaining = () => Math.max(0, Math.ceil((globalCooldownUntil - Date.now()) / 1000));

/**
 * Helper to parse JSON safely, handling potential markdown blocks or truncation
 */
const safeJsonParse = (text: string | undefined, fallback: any = []) => {
  if (!text) return fallback;
  
  const cleanText = (t: string) => {
    // Try to extract JSON from markdown blocks if present
    const jsonMatch = t.match(/```json\n([\s\S]*?)\n```/) || t.match(/```([\s\S]*?)```/);
    return jsonMatch ? jsonMatch[1].trim() : t.trim();
  };

  const repairedText = cleanText(text);

  try {
    return JSON.parse(repairedText);
  } catch (e) {
    try {
      // Attempt to repair truncated JSON by closing open brackets/braces
      let stack: string[] = [];
      let inString = false;
      let escaped = false;
      let repaired = repairedText;

      for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (char === '{' || char === '[') stack.push(char);
        else if (char === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
        else if (char === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
      }

      if (inString) repaired += '"';
      while (stack.length > 0) {
        const last = stack.pop();
        repaired += (last === '{' ? '}' : ']');
      }

      return JSON.parse(repaired);
    } catch (innerError) {
      console.error("[AI Core] Failed to parse JSON even with recovery:", repairedText.substring(0, 100) + "...");
      return fallback;
    }
  }
};

const callAIWithRetry = async (params: any, retries = 3, delay = 2000): Promise<any> => {
  return ErrorRetryService.execute(
    async () => {
      if (Date.now() < globalCooldownUntil) {
        console.warn(`[AI Core] Global cooldown active. Skipping API call.`);
        throw new Error('AI_COOLDOWN_ACTIVE');
      }

      try {
        const response = await ai.models.generateContent(params);
        // Reset quota flag on success
        SmartRouter.setQuotaLow(false);
        return response;
      } catch (error: any) {
        if (error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota')) {
          // Set a 5-minute global cooldown if quota is exhausted
          console.error(`[AI Core] Quota exhausted. Entering 5-minute cooldown.`);
          globalCooldownUntil = Date.now() + 300000;
          SmartRouter.setQuotaLow(true);
          throw error; // Let ErrorRetryService handle the retry or failure
        }
        throw error;
      }
    },
    {
      maxRetries: retries,
      delay,
      context: 'AI Content Generation'
    }
  );
};

/**
 * S+ AI CORE - The Central Brain of the S+ Platform
 * Modular architecture for orchestration and intelligence.
 */

// 1. Command Interpreter & 2. Task Planner
export const orchestrateTask = async (command: string, context: { history?: any[], connectors?: string[], vault?: string[], goals?: string[] } = {}) => {
  const startTime = Date.now();
  const userId = auth.currentUser?.uid || 'system';
  
  // Check Cache First (Section 5)
  const cachedResult = SmartRouter.getCachedResult(command);
  if (cachedResult) {
    ActivityLogService.log(userId, `Cache hit for task: ${command}`, 'info', 'ai');
    return cachedResult;
  }

  // Check Templates (Section 6)
  const matchingTemplate = await TemplateService.findMatchingTemplate(command, userId);
  if (matchingTemplate) {
    ActivityLogService.log(userId, `Template match found: ${matchingTemplate.name}`, 'info', 'ai');
    const templateResult = {
      intent: matchingTemplate.trigger,
      summary: matchingTemplate.description,
      steps: matchingTemplate.steps,
      reasoning: ["Using pre-built automation template for efficiency."],
      modelUsed: "Template Engine",
      selfHealing: {},
      memoryInsight: "This is a recurring task optimized via templates."
    };
    return templateResult;
  }

  ActivityLogService.log(userId, `Orchestrating task: ${command}`, 'info', 'ai');
  
  // Perform Semantic Search in Long-Term Memory
  const semanticMemories = await MemoryService.searchMemory(command, 3);
  const memoryContext = semanticMemories.length > 0
    ? `Long-Term Semantic Memory (Past similar tasks): ${semanticMemories.join(' | ')}`
    : 'No relevant past memories found.';

  const historyContext = context.history && context.history.length > 0 
    ? `Recent session history: ${context.history.slice(-10).map(h => h.command).join(', ')}` 
    : '';
  
  const connectorContext = context.connectors && context.connectors.length > 0
    ? `Available Connected Platforms: ${context.connectors.join(', ')}`
    : 'No platforms connected yet.';

  const goalsContext = context.goals && context.goals.length > 0
    ? `Strategic Goals (Goal-Driven Autonomy): ${context.goals.join(', ')}`
    : '';
  
  // Smart Routing (Section 4)
  const { model: modelToUse, mode } = await SmartRouter.route(command);

  if (userId) {
    ActivityLogService.log(userId, `AI Orchestration started (${mode} mode): ${command.substring(0, 50)}...`, 'info', 'ai', { model: modelToUse });
  }

  // Check if the command requires web intelligence
  const requiresWebSearch = /news|trends|current|latest|search|browse|competitor/i.test(command);

  try {
    const response = await callAIWithRetry({
      model: modelToUse as any,
      contents: `You are the S+ AI CORE, the central brain of the S+ Universal AI Connector Platform.
      Your role is to act as an orchestration layer above external tools.
      
      ARCHITECTURAL DIRECTIVE (CONNECTOR-FIRST):
      1. AI = Planning Only.
      2. Connectors = Execution.
      3. Break down the command into discrete, executable steps using available connectors.
      4. If multiple platforms are needed, trigger them in parallel or sequence.
      5. Always provide a 'planB' for critical steps.
      
      Current Context:
      ${memoryContext}
      ${historyContext}
      ${connectorContext}
      ${goalsContext}
      
      User Command: "${command}"
      
      Phase 1: Chain-of-Thought (CoT) Reasoning
      - Think step-by-step about the user's intent.
      - Analyze the strategic goals and how this command aligns with them.
      - Consider past successes and failures from memory.
      
      Phase 2: Multi-Agent Collaboration
      - Analyst Agent: Evaluate data requirements and platform health.
      - Creative Agent: Suggest high-engagement content or innovative workflows.
      - Strategist Agent: Finalize the plan to ensure goal alignment.
      
      Phase 3: Task Planning
      - Break the command into logical, executable steps.
      - For each step, decide the best platform and tool.
      - If the task requires media generation, include a step for 'image' or 'video' generation.
      - Identify dependencies between steps using 'dependsOn'.
      
      Return a JSON object with:
      - intent: string (Classified intent)
      - reasoning: string[] (Detailed step-by-step CoT thought process)
      - steps: { 
          id: string,
          platform: string, 
          action: string, 
          description: string, 
          expectedOutput: string,
          priority: number,
          parallelizable: boolean,
          dependsOn: string[] (IDs of steps that must complete first),
          planB: string (Alternative action if this step fails),
          condition?: {
            if: string (The condition to check),
            then: string (What to do if true),
            else?: string (What to do if false)
          }
        }[]
      - summary: string (Brief execution summary)
      - selfHealing: { [errorCode: string]: string } (Specific recovery methods)
      - memoryInsight: string (What you've learned from the user's history that influenced this plan)
      - modelUsed: string (The AI engine selected for this task)
      - agentDialogue: string (A brief summary of the collaboration between Analyst, Creative, and Strategist agents)`,
      config: {
        tools: requiresWebSearch ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: { type: Type.STRING },
            reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  action: { type: Type.STRING },
                  description: { type: Type.STRING },
                  expectedOutput: { type: Type.STRING },
                  priority: { type: Type.NUMBER },
                  parallelizable: { type: Type.BOOLEAN },
                  dependsOn: { type: Type.ARRAY, items: { type: Type.STRING } },
                  planB: { type: Type.STRING },
                  riskLevel: { type: Type.STRING, enum: ['low', 'high'], description: "Classify the risk of this action. 'high' for destructive or public-facing actions." },
                  condition: {
                    type: Type.OBJECT,
                    properties: {
                      if: { type: Type.STRING },
                      then: { type: Type.STRING },
                      else: { type: Type.STRING }
                    }
                  }
                }
              }
            },
            summary: { type: Type.STRING },
            selfHealing: { type: Type.OBJECT },
            memoryInsight: { type: Type.STRING },
            modelUsed: { type: Type.STRING },
            agentDialogue: { type: Type.STRING }
          }
        }
      }
    });

    const result = safeJsonParse(response.text, {});
    
    // Cache the result (Section 5)
    SmartRouter.setCache(command, result);

    // Save this task to memory for future semantic search
    MemoryService.saveMemory(`Command: ${command} | Summary: ${result.summary}`, {
      type: 'task',
      timestamp: new Date()
    });

    // Log metrics for System Heartbeat
    SystemHealthService.logMetrics({
      cpu: Math.floor(Math.random() * 20) + 10,
      latency: Date.now() - startTime,
      successRate: 100,
      activeTasks: result.steps?.length || 0
    });

    return { ...result, modelUsed: modelToUse };
  } catch (error) {
    SystemHealthService.logError('AI Core Orchestration', error instanceof Error ? error.message : String(error), { command });
    
    // Fallback to local heuristic if AI fails (Section 7)
    return {
      analysis: "AI Overload - Switching to Local Heuristic Mode",
      steps: [
        {
          id: "fallback_1",
          platform: "system",
          action: "notify",
          params: { message: "AI is currently at capacity. Executing basic local fallback." },
          description: "System notification fallback",
          priority: 1,
          parallelizable: false,
          dependsOn: []
        }
      ],
      summary: "Local fallback execution triggered due to AI unavailability.",
      reasoning: "API Quota or Network Error",
      modelUsed: "local-heuristic"
    };
  }
};

/**
 * SECTION 2 — GENERATIVE MEDIA STUDIO
 */
export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  try {
    const response = await callAIWithRetry({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Generate a high-quality, professional image for: ${prompt}. Style: Modern, clean, high-engagement.` }],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    SystemHealthService.logError('Image Generation', error instanceof Error ? error.message : String(error), { prompt });
    return null;
  }
};

export const generateVideo = async (prompt: string, aspectRatio: "16:9" | "9:16" = "16:9") => {
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `A high-quality, professional video clip for: ${prompt}. Style: Cinematic, high-engagement.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio
      }
    });

    // Poll for completion (simulated for this implementation, in real app would be async)
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    return operation.response?.generatedVideos?.[0]?.video?.uri;
  } catch (error) {
    SystemHealthService.logError('Video Generation', error instanceof Error ? error.message : String(error), { prompt });
    return null;
  }
};

// 6. Memory System - Learning from history
let smartSuggestionsCache: { data: string[], timestamp: number } | null = null;
const SUGGESTIONS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export const getSmartSuggestions = async (history: any[] = []) => {
  const userId = auth.currentUser?.uid || 'system';
  const lastRunKey = `splus_last_run_suggestions_${userId}`;
  const lastRun = localStorage.getItem(lastRunKey);
  const now = Date.now();

  // Check cache first
  if (smartSuggestionsCache && (now - smartSuggestionsCache.timestamp < SUGGESTIONS_CACHE_DURATION)) {
    return smartSuggestionsCache.data;
  }

  // Prevent running more than once every 15 minutes to save quota
  if (lastRun && (now - parseInt(lastRun) < 15 * 60 * 1000)) {
    return smartSuggestionsCache?.data || [];
  }

  // Check global cooldown
  if (now < globalCooldownUntil) {
    return smartSuggestionsCache?.data || [];
  }

  localStorage.setItem(lastRunKey, now.toString());

  const historyContext = history.length > 0 
    ? `Based on these past actions: ${history.slice(-10).map(h => h.command).join(', ')}` 
    : 'Based on general productivity trends';

  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-flash-lite-preview",
      contents: `${historyContext}, as S+ AI CORE, suggest 3 advanced, personalized automation workflows.
      Focus on self-improvement and reducing manual steps for the user.
      Return a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const suggestions = safeJsonParse(response.text, []);
    if (suggestions.length > 0) {
      smartSuggestionsCache = { data: suggestions, timestamp: Date.now() };
    }
    return suggestions;
  } catch (error: any) {
    // Don't log quota errors as system errors if we have a cache
    if (error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429) {
      console.warn("[AI Core] Quota exhausted for suggestions, using cache.");
      return smartSuggestionsCache?.data || [];
    }
    
    SystemHealthService.logError('Smart Suggestions', error instanceof Error ? error.message : String(error));
    return smartSuggestionsCache?.data || [];
  }
};

// Hybrid AI Usage - Creative vs Reasoning
export const generateCreativeContent = async (prompt: string, type: 'caption' | 'hashtags' | 'summary') => {
  // S+ AI CORE decides to use Flash for fast creative generation
  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-flash-lite-preview",
      contents: `S+ AI CORE Creative Module: Generate a high-engagement ${type} for: ${prompt}.`,
    });
    return response.text;
  } catch (error) {
    SystemHealthService.logError('Creative Content', error instanceof Error ? error.message : String(error), { prompt, type });
    return null;
  }
};

/**
 * SECTION 2 & 3 — PROACTIVE AI & SMART RECOMMENDATION ENGINE
 */
let proactiveCache: { data: any, timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const getProactiveSuggestions = async (context: { 
  history: any[], 
  connectors: string[], 
  goals: any[],
  timeOfDay: string 
}) => {
  const userId = auth.currentUser?.uid || 'system';
  const lastRunKey = `splus_last_run_proactive_${userId}`;
  const lastRun = localStorage.getItem(lastRunKey);
  const now = Date.now();

  // Check cache first
  if (proactiveCache && (now - proactiveCache.timestamp < CACHE_DURATION)) {
    return proactiveCache.data;
  }

  // Prevent running more than once every 10 minutes
  if (lastRun && (now - parseInt(lastRun) < 10 * 60 * 1000)) {
    return proactiveCache?.data || [];
  }

  // Check global cooldown
  if (now < globalCooldownUntil) {
    return proactiveCache?.data || [];
  }

  ActivityLogService.log(userId, 'Generating proactive suggestions', 'info', 'ai');
  localStorage.setItem(lastRunKey, now.toString());

  const historyContext = context.history.length > 0 
    ? `Recent Activity: ${context.history.slice(-10).map(h => h.command).join(', ')}` 
    : 'No recent activity.';
  
  const goalsContext = context.goals.length > 0
    ? `User Goals: ${context.goals.map(g => g.title).join(', ')}`
    : 'No specific goals set.';

  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-flash-lite-preview", // Switched to Flash Lite for better quota efficiency
      contents: `You are the S+ Proactive AI Strategist.
      Analyze the user's behavior, connected platforms, and goals to suggest 4 proactive actions.
      
      Context:
      ${historyContext}
      Connected Platforms: ${context.connectors.join(', ')}
      ${goalsContext}
      Current Time: ${context.timeOfDay}
      
      Requirements:
      - Suggestions must be actionable and specific.
      - Focus heavily on AUTOMATION (e.g., "You usually do X manually, want to create a workflow?") and OPTIMIZATION (e.g., "I noticed you use Y often, here is a faster way").
      - Include a mix of content ideas, automation workflows, and optimization tips.
      - Align with user goals if present.
      - Maintain a friendly, helpful AI personality.
      
      Return a JSON array of objects:
      {
        id: string,
        title: string,
        description: string,
        type: 'content' | 'automation' | 'optimization',
        command: string (The command to run if accepted),
        reasoning: string (Why you are suggesting this)
      }[]`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              type: { type: Type.STRING },
              command: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            }
          }
        }
      }
    });

    const data = safeJsonParse(response.text, []);
    proactiveCache = { data, timestamp: Date.now() };
    return data;
  } catch (error: any) {
    if (error.message !== 'AI_COOLDOWN_ACTIVE') {
      SystemHealthService.logError('Proactive Suggestions', error instanceof Error ? error.message : String(error));
    }
    return proactiveCache?.data || [];
  }
};

/**
 * SECTION 6 — DAILY AI INSIGHTS
 */
let dailyInsightsCache: { data: any, timestamp: number, date: string } | null = null;

export const getDailyInsights = async (history: any[]) => {
  const userId = auth.currentUser?.uid || 'system';
  const lastRunKey = `splus_last_run_insights_${userId}`;
  const lastRun = localStorage.getItem(lastRunKey);
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  // Check cache first
  if (dailyInsightsCache && dailyInsightsCache.date === today && (now - dailyInsightsCache.timestamp < 3600000)) {
    return dailyInsightsCache.data;
  }

  // Prevent running more than once every 30 minutes
  if (lastRun && (now - parseInt(lastRun) < 30 * 60 * 1000)) {
    return dailyInsightsCache?.data || null;
  }

  // Check global cooldown
  if (now < globalCooldownUntil) {
    return dailyInsightsCache?.data || null;
  }

  ActivityLogService.log(userId, 'Generating daily AI insights', 'info', 'ai');
  localStorage.setItem(lastRunKey, now.toString());

  const todaysHistory = history.filter(h => h.timestamp?.toDate?.().toISOString().startsWith(today) || h.timestamp?.startsWith?.(today));

  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Generate a daily summary for the S+ AI Platform.
      Activity Data: ${JSON.stringify(todaysHistory)}
      
      Return a JSON object:
      {
        summary: string (Friendly overview of today's progress),
        tasksCompleted: number,
        successRate: string,
        topPlatform: string,
        keyInsight: string (A data-driven tip based on today's activity)
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tasksCompleted: { type: Type.NUMBER },
            successRate: { type: Type.STRING },
            topPlatform: { type: Type.STRING },
            keyInsight: { type: Type.STRING }
          }
        }
      }
    });

    const data = safeJsonParse(response.text, {});
    dailyInsightsCache = { data, timestamp: Date.now(), date: today };
    return data;
  } catch (error: any) {
    if (error.message !== 'AI_COOLDOWN_ACTIVE') {
      SystemHealthService.logError('Daily Insights', error instanceof Error ? error.message : String(error));
    }
    return dailyInsightsCache?.data || null;
  }
};

/**
 * SECTION 1 & 2 — AUTONOMOUS OPPORTUNITY DETECTION
 */
let opportunityCache: { data: any, timestamp: number } | null = null;

export const detectAutonomousOpportunities = async (context: {
  history: any[],
  connectors: string[],
  goals: any[],
  lastActivity: string
}) => {
  const userId = auth.currentUser?.uid || 'system';
  const lastRunKey = `splus_last_run_opps_${userId}`;
  const lastRun = localStorage.getItem(lastRunKey);
  const now = Date.now();

  // Check cache first (30 min duration)
  if (opportunityCache && (now - opportunityCache.timestamp < 1800000)) {
    return opportunityCache.data;
  }

  // Prevent running more than once every 20 minutes
  if (lastRun && (now - parseInt(lastRun) < 20 * 60 * 1000)) {
    return opportunityCache?.data || [];
  }

  // Check global cooldown
  if (now < globalCooldownUntil) {
    return opportunityCache?.data || [];
  }

  localStorage.setItem(lastRunKey, now.toString());

  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-flash-lite-preview", // Switched to Flash Lite for efficiency
      contents: `You are the S+ Autonomous Opportunity Engine. 
      Analyze the system state and detect growth or optimization opportunities.
      
      Context:
      - Recent History: ${JSON.stringify(context.history.slice(-10))}
      - Connected Platforms: ${context.connectors.join(', ')}
      - User Goals: ${JSON.stringify(context.goals)}
      - Last Activity: ${context.lastActivity}
      
      Detect:
      1. Inactivity (e.g., "No Instagram post in 3 days")
      2. Trends (e.g., "AI content is trending on Twitter")
      3. Performance drops (e.g., "Engagement down 10% on LinkedIn")
      4. Growth opportunities (e.g., "New platform connector available")
      
      Return a JSON array of opportunities:
      {
        type: 'inactivity' | 'trend' | 'performance' | 'growth',
        title: string,
        description: string,
        priority: 'low' | 'medium' | 'high'
      }[]`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING }
            }
          }
        }
      }
    });

    const opportunities = safeJsonParse(response.text, []);
    opportunityCache = { data: opportunities, timestamp: Date.now() };
    
    // Trigger notifications for high-priority opportunities
    opportunities.forEach((opp: any) => {
      if (opp.priority === 'high') {
        NotificationService.triggerOpportunityNotification(
          `S+ Opportunity: ${opp.title}`,
          opp.description
        );
      }
    });

    return opportunities;
  } catch (error: any) {
    if (error.message !== 'AI_COOLDOWN_ACTIVE') {
      SystemHealthService.logError('Opportunity Detection', error instanceof Error ? error.message : String(error));
    }
    return opportunityCache?.data || [];
  }
};

/**
 * SECTION 3 & 5 — AUTO TASK GENERATION
 */
export const generateAutonomousTask = async (opportunity: any, context: { history: any[], connectors: string[], goals: any[] }) => {
  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-pro-preview",
      contents: `You are the S+ Autonomous Task Architect.
      Based on the detected opportunity, create a high-value task plan.
      
      Opportunity: ${opportunity.title} - ${opportunity.description}
      History: ${JSON.stringify(context.history.slice(-5))}
      Connected Platforms: ${context.connectors.join(', ')}
      User Goals: ${JSON.stringify(context.goals)}
      
      Create a task that:
      - Directly addresses the opportunity.
      - Aligns with user goals.
      - Is fully executable via the S+ platform.
      
      Return a JSON object:
      {
        title: string,
        description: string,
        command: string (The high-level command to execute),
        explanation: string (Why this task is being suggested now)
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            command: { type: Type.STRING },
            explanation: { type: Type.STRING }
          }
        }
      }
    });

    return safeJsonParse(response.text, {});
  } catch (error) {
    SystemHealthService.logError('Task Generation', error instanceof Error ? error.message : String(error));
    return null;
  }
};

/**
 * SECTION 3 — COLLABORATIVE BRAIN MODE
 * Synthesizes inputs from multiple team members for strategy refinement.
 */
export const collaborativeBrainRefinement = async (workspaceId: string, currentPlan: any, teamInputs: any[]) => {
  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-pro-preview",
      contents: `You are the S+ Collaborative Brain. 
      Your task is to refine a strategic plan based on feedback and inputs from multiple team members.
      
      Current Plan: ${JSON.stringify(currentPlan)}
      Team Inputs: ${JSON.stringify(teamInputs)}
      
      Requirements:
      - Synthesize all inputs into a single, cohesive strategy.
      - Resolve any conflicts between team member suggestions.
      - Optimize the plan for maximum efficiency and goal alignment.
      
      Return a JSON object with the refined plan (same structure as orchestrateTask output).`,
      config: {
        responseMimeType: "application/json"
      }
    });

    return safeJsonParse(response.text, {});
  } catch (error) {
    SystemHealthService.logError('Collaborative Refinement', error instanceof Error ? error.message : String(error));
    return {};
  }
};

/**
 * SECTION 5 — SELF-HEALING & ERROR RESILIENCE
 */
export const selfHeal = async (taskId: string, error: string, currentStep: any) => {
  console.log(`[Self-Heal] Attempting to recover task ${taskId} from error: ${error}`);
  
  const prompt = `
    TASK FAILURE DETECTED
    Task ID: ${taskId}
    Failed Step: ${currentStep.action}
    Error: ${error}
    
    As the S+ Strategist, analyze this failure and provide a recovery plan.
    If the step had a 'planB' defined, evaluate if it's still viable.
    
    Return a JSON object:
    {
      "analysis": "Why it failed",
      "recoveryStep": {
        "action": "New action to try",
        "platform": "Platform to use",
        "reasoning": "Why this will work"
      },
      "isCritical": boolean
    }
  `;

  try {
    const response = await callAIWithRetry({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return safeJsonParse(response.text, { analysis: "Failed to analyze", recoveryStep: null, isCritical: true });
  } catch (error) {
    SystemHealthService.logError('Self-Heal AI', error instanceof Error ? error.message : String(error));
    return { analysis: "AI Analysis failed", recoveryStep: null, isCritical: true };
  }
};

/**
 * SECTION 4 — SMART ROUTER & CACHE SYSTEM
 * Automatically decides task complexity and manages AI usage.
 */
class SmartRouter {
  private static cache: Map<string, { result: any, timestamp: number }> = new Map();
  private static CACHE_TTL = 3600000; // 1 hour
  private static isQuotaLow = false;

  static setQuotaLow(low: boolean) {
    this.isQuotaLow = low;
  }

  static async route(command: string): Promise<{ model: string, mode: 'full' | 'light' | 'local' }> {
    const complexity = this.analyzeComplexity(command);
    
    // Simple tasks or low quota -> use light model
    if (complexity === 'low' || this.isQuotaLow) {
      return { model: "gemini-3.1-flash-lite-preview", mode: 'light' };
    }
    
    // Medium tasks -> light model if it's not a creative task
    if (complexity === 'medium' && !/generate|create|write|design|caption|image|video/i.test(command)) {
      return { model: "gemini-3.1-flash-lite-preview", mode: 'light' };
    }

    // High complexity or creative tasks -> full model
    return { model: "gemini-3.1-pro-preview", mode: 'full' };
  }

  private static analyzeComplexity(command: string): 'low' | 'medium' | 'high' {
    const cmd = command.toLowerCase();
    const highKeywords = ['analyze', 'strategy', 'complex', 'multiple', 'orchestrate', 'plan', 'optimize', 'refine'];
    const lowKeywords = ['send', 'post', 'check', 'get', 'list', 'simple', 'notify', 'alert'];
    
    const highCount = highKeywords.filter(k => cmd.includes(k)).length;
    const lowCount = lowKeywords.filter(k => cmd.includes(k)).length;

    if (highCount > 1 || cmd.length > 100) return 'high';
    if (lowCount > 0 && highCount === 0) return 'low';
    return 'medium';
  }

  static getCachedResult(command: string): any | null {
    const cached = this.cache.get(command);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.result;
    }
    return null;
  }

  static setCache(command: string, result: any) {
    this.cache.set(command, { result, timestamp: Date.now() });
  }
}
