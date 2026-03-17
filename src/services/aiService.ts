import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * S+ AI CORE - The Central Brain of the S+ Platform
 * Modular architecture for orchestration and intelligence.
 */

// 1. Command Interpreter & 2. Task Planner
export const orchestrateTask = async (command: string, context: { history?: any[], connectors?: string[], vault?: string[], goals?: string[] } = {}) => {
  const historyContext = context.history && context.history.length > 0 
    ? `User history: ${context.history.slice(-5).map(h => h.command).join(', ')}` 
    : '';
  
  const connectorContext = context.connectors && context.connectors.length > 0
    ? `Available Connected Platforms: ${context.connectors.join(', ')}`
    : 'No platforms connected yet.';

  const goalsContext = context.goals && context.goals.length > 0
    ? `Strategic Goals: ${context.goals.join(', ')}`
    : '';
  
  // 5. Decision Engine Logic: Decide which model to use based on task complexity
  const isCreativeTask = /generate|create|write|design|caption/i.test(command);
  const modelToUse = isCreativeTask ? "gemini-3.1-flash-lite-preview" : "gemini-3.1-pro-preview";

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents: `You are the S+ AI CORE, the central brain of the S+ Universal AI Connector Platform.
    Your role is to act as an orchestration layer above external tools.
    
    Current Context:
    ${historyContext}
    ${connectorContext}
    ${goalsContext}
    
    User Command: "${command}"
    
    Phase 1: Command Interpretation
    - Detect intent and classify task type.
    
    Phase 2: Task Planning
    - Break the command into logical, executable steps.
    - For each step, decide the best platform and tool.
    
    Phase 3: Decision Intelligence
    - Use past data to optimize platform selection and timing.
    
    Phase 4: Self-Awareness (System Monitor)
    - Provide self-healing instructions for each step in case of failure.
    
    Return a JSON object with:
    - intent: string (Classified intent)
    - reasoning: string[] (Detailed thought process of the Decision Engine)
    - steps: { 
        id: string,
        platform: string, 
        action: string, 
        description: string, 
        expectedOutput: string,
        priority: number,
        parallelizable: boolean
      }[]
    - summary: string (Brief execution summary)
    - selfHealing: { [errorCode: string]: string } (Specific recovery methods)
    - memoryInsight: string (What you've learned from the user's history that influenced this plan)
    - modelUsed: string (The AI engine selected for this task)
    
    Available platforms: YouTube, Instagram, Facebook, LinkedIn, Twitter, Notion, Google Drive, Gmail, Slack, Discord, GitHub, Shopify, Stripe, Local PC (via Bridge).`,
    config: {
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
                parallelizable: { type: Type.BOOLEAN }
              }
            }
          },
          summary: { type: Type.STRING },
          selfHealing: { type: Type.OBJECT },
          memoryInsight: { type: Type.STRING },
          modelUsed: { type: Type.STRING }
        }
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  return { ...result, modelUsed: modelToUse };
};

// 6. Memory System - Learning from history
export const getSmartSuggestions = async (history: any[] = []) => {
  const historyContext = history.length > 0 
    ? `Based on these past actions: ${history.slice(-10).map(h => h.command).join(', ')}` 
    : 'Based on general productivity trends';

  const response = await ai.models.generateContent({
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
  return JSON.parse(response.text || "[]");
};

// Hybrid AI Usage - Creative vs Reasoning
export const generateCreativeContent = async (prompt: string, type: 'caption' | 'hashtags' | 'summary') => {
  // S+ AI CORE decides to use Flash for fast creative generation
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `S+ AI CORE Creative Module: Generate a high-engagement ${type} for: ${prompt}.`,
  });
  return response.text;
};

/**
 * SECTION 2 & 3 — PROACTIVE AI & SMART RECOMMENDATION ENGINE
 */
export const getProactiveSuggestions = async (context: { 
  history: any[], 
  connectors: string[], 
  goals: any[],
  timeOfDay: string 
}) => {
  const historyContext = context.history.length > 0 
    ? `Recent Activity: ${context.history.slice(-10).map(h => h.command).join(', ')}` 
    : 'No recent activity.';
  
  const goalsContext = context.goals.length > 0
    ? `User Goals: ${context.goals.map(g => g.title).join(', ')}`
    : 'No specific goals set.';

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are the S+ Proactive AI Strategist.
    Analyze the user's behavior, connected platforms, and goals to suggest 4 proactive actions.
    
    Context:
    ${historyContext}
    Connected Platforms: ${context.connectors.join(', ')}
    ${goalsContext}
    Current Time: ${context.timeOfDay}
    
    Requirements:
    - Suggestions must be actionable and specific.
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

  return JSON.parse(response.text || "[]");
};

/**
 * SECTION 6 — DAILY AI INSIGHTS
 */
export const getDailyInsights = async (history: any[]) => {
  const today = new Date().toISOString().split('T')[0];
  const todaysHistory = history.filter(h => h.timestamp?.toDate?.().toISOString().startsWith(today) || h.timestamp?.startsWith?.(today));

  const response = await ai.models.generateContent({
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

  return JSON.parse(response.text || "{}");
};

/**
 * SECTION 1 & 2 — AUTONOMOUS OPPORTUNITY DETECTION
 */
export const detectAutonomousOpportunities = async (context: {
  history: any[],
  connectors: string[],
  goals: any[],
  lastActivity: string
}) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
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

  return JSON.parse(response.text || "[]");
};

/**
 * SECTION 3 & 5 — AUTO TASK GENERATION
 */
export const generateAutonomousTask = async (opportunity: any, context: { history: any[], connectors: string[], goals: any[] }) => {
  const response = await ai.models.generateContent({
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

  return JSON.parse(response.text || "{}");
};
