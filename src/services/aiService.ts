import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const orchestrateTask = async (command: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are the S+ (S Plus) Universal AI Orchestrator. 
    Analyze the following user command and break it down into a logical multi-step execution plan.
    
    Command: "${command}"
    
    Return a JSON object with:
    - reasoning: string[] (Your thought process)
    - steps: { platform: string, action: string, description: string }[]
    - summary: string (A brief summary of what will happen)
    
    Available platforms: YouTube, Instagram, Facebook, LinkedIn, Twitter, Notion, Google Drive, Gmail, Slack, Discord, GitHub, Shopify, Stripe, etc.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                platform: { type: Type.STRING },
                action: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          },
          summary: { type: Type.STRING }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const generateContent = async (prompt: string, type: 'caption' | 'hashtags' | 'summary') => {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Generate a ${type} for the following: ${prompt}`,
  });
  return response.text;
};
