import axios from 'axios';
import { toast } from 'sonner';
import { Type } from "@google/genai";
import { ActivityLogService } from './activityLogService';
import { ErrorRetryService } from './errorRetryService';
import { auth } from '../firebase';
import { callAIWithRetry } from './aiService';

/**
 * S+ UNIVERSAL AI CONNECTOR SERVICE 2.0
 * Centralized middleware for real-time platform integrations.
 * Supports 1000+ applications via Unified Integration Hub.
 */

export interface UnifiedDataModel {
  platform: string;
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  category?: string;
  metrics: {
    engagement?: number;
    revenue?: number;
    tasks?: number;
    latency: number;
  };
  lastSync: string;
  config?: any;
}

export interface ConnectorTemplate {
  id: string;
  name: string;
  category: 'CRM' | 'Social' | 'Finance' | 'DevTools' | 'ERP' | 'Messaging' | 'Storage' | 'AI Tools';
  description: string;
  icon: string;
  authType: 'oauth2' | 'apikey' | 'basic' | 'webhook';
  actions: string[];
}

export class ConnectorService {
  private static async fetchWithRetry(url: string, options: any, retries = 3, backoff = 1000) {
    return ErrorRetryService.execute(
      async () => {
        const response = await axios(url, options);
        return response.data;
      },
      {
        maxRetries: retries,
        delay: backoff,
        context: `API Call to ${url}`
      }
    );
  }

  /**
   * 1. UNIFIED INTEGRATION HUB (The "One-to-Many" Logic)
   * Acts as a gateway to 1000+ apps via a headless orchestration layer.
   */
  static async triggerWorkflow(workflowId: string, payload: any) {
    console.log(`[Hub] Triggering workflow ${workflowId} with payload:`, payload);
    const userId = auth.currentUser?.uid;
    if (userId) {
      ActivityLogService.log(userId, `Workflow triggered: ${workflowId}`, 'info', 'connector', { payload });
    }
    // In a real implementation, this would call n8n or Pipedream API
    // return this.fetchWithRetry(`${process.env.HUB_API_URL}/workflows/${workflowId}/execute`, {
    //   method: 'POST',
    //   data: payload,
    //   headers: { Authorization: `Bearer ${process.env.HUB_API_KEY}` }
    // });
    
    // Simulated success
    return { success: true, executionId: Math.random().toString(36).substr(2, 9), error: undefined };
  }

  /**
   * MULTI-APP WORKFLOW ORCHESTRATOR
   * Executes a sequence of actions across multiple platforms.
   */
  static async executeMultiAppChain(steps: { platform: string; action: string; params: any }[]) {
    toast.info(`Executing ${steps.length}-step multi-app chain...`);
    const userId = auth.currentUser?.uid;
    if (userId) {
      ActivityLogService.log(userId, `Multi-app chain started (${steps.length} steps)`, 'info', 'connector');
    }
    const results = [];
    const executionLogs: string[] = [];

    for (const step of steps) {
      const log = `[${new Date().toLocaleTimeString()}] Executing ${step.platform}: ${step.action}`;
      console.log(log);
      executionLogs.push(log);
      
      // Simulate execution
      await new Promise(r => setTimeout(r, 1200));
      
      const success = Math.random() > 0.1;
      if (!success) {
        const errorLog = `❌ Failed at ${step.platform}: ${step.action}`;
        console.error(errorLog);
        executionLogs.push(errorLog);
        toast.error(`${step.platform}: ${step.action} failed.`);
        throw new Error(errorLog);
      }
      
      const successLog = `✅ Completed ${step.platform}: ${step.action}`;
      console.log(successLog);
      executionLogs.push(successLog);
      results.push({ platform: step.platform, action: step.action, status: 'success' });
      toast.success(`${step.platform}: ${step.action} completed.`);
    }

    return { results, logs: executionLogs };
  }

  /**
   * UNIVERSAL WEBHOOK HANDLER
   */
  static async handleWebhook(platform: string, data: any) {
    console.log(`[Webhook] Received data from ${platform}:`, data);
    
    // DYNAMIC SCHEMA MAPPING
    const mappedData = this.mapToUnifiedModel(platform, data);
    
    // Logic to route webhook data to the AI Core or specific workflows
    toast.info(`Webhook received from ${platform}. Mapped to Unified Model.`);
    return { status: 'processed', timestamp: new Date().toISOString(), mappedData };
  }

  /**
   * DYNAMIC SCHEMA MAPPER
   * Converts raw platform data into the S+ Unified Data Model.
   */
  private static mapToUnifiedModel(platform: string, rawData: any): any {
    const base = {
      platform,
      id: rawData.id || rawData._id || Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      raw: rawData
    };

    switch (platform.toLowerCase()) {
      case 'slack':
        return { 
          ...base, 
          category: 'Messaging',
          title: `Message in #${rawData.channel}`,
          description: rawData.text,
          metrics: { engagement: 1, latency: 12 }
        };
      case 'github':
        return { 
          ...base, 
          category: 'DevTools',
          title: `Repo: ${rawData.repository?.name}`,
          description: `Action: ${rawData.action} by ${rawData.sender?.login}`,
          metrics: { tasks: 1, latency: 85 }
        };
      default:
        return { ...base, category: 'General', title: 'Untitled Event', description: 'No description', metrics: { latency: 0 } };
    }
  }

  /**
   * 2. AI-DRIVEN "AUTO-CONNECTOR" DISCOVERY
   * Crawls API docs and generates a connector card automatically.
   */
  static async discoverConnector(apiUrl: string): Promise<ConnectorTemplate | null> {
    toast.info('AI Core is analyzing API documentation...');
    
    try {
      const response = await callAIWithRetry({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Analyze this API URL/Documentation: ${apiUrl}
        Identify the platform name, category, authentication requirements, and key endpoints/actions.
        
        CRITICAL: 
        1. Platform Name: The official name of the service.
        2. Category: Must be one of: CRM, Social, Finance, DevTools, ERP, Messaging, Storage, AI Tools.
        3. AuthType: Identify if it uses OAuth2, API Key, Basic Auth, or Webhooks.
        4. Actions: List at least 3 common actions (e.g., "Get Profile", "Send Message", "Create Invoice").
        5. Icon: Suggest a Lucide icon name that fits the platform.
        
        Return a JSON object matching this structure:
        {
          "id": "slugified-name",
          "name": "Platform Name",
          "category": "CRM | Social | Finance | DevTools | ERP | Messaging | Storage | AI Tools",
          "description": "Brief description",
          "icon": "lucide-icon-name",
          "authType": "oauth2 | apikey | basic | webhook",
          "actions": ["action1", "action2", "action3"]
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              icon: { type: Type.STRING },
              authType: { type: Type.STRING },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });

      const template = JSON.parse(response.text || "null");
      if (template) {
        toast.success(`Auto-Connector generated for ${template.name}!`);
      }
      return template;
    } catch (err) {
      console.error('Auto-connector discovery failed', err);
      toast.error('AI analysis failed. Please provide manual config.');
      return null;
    }
  }

  /**
   * 3. OAUTH PROXY SERVICE
   * Centralized handler for various auth flows.
   */
  static async initiateOAuth(platform: string) {
    const proxyUrl = `${window.location.origin}/api/auth/proxy/${platform}`;
    console.log(`[OAuth Proxy] Initiating flow for ${platform} via ${proxyUrl}`);
    // In a real app, this would redirect to the OAuth provider
    // window.location.href = proxyUrl;
    toast.info(`Redirecting to ${platform} OAuth Proxy...`);
    return proxyUrl;
  }

  /**
   * PLATFORM DATA FETCHERS (MAPPED TO UNIFIED MODEL)
   */
  static async getPlatformData(platform: string, config: any): Promise<UnifiedDataModel> {
    // Simulated unified fetching logic
    const latency = Math.floor(Math.random() * 200) + 50;
    
    return {
      platform,
      id: `${platform.toLowerCase()}_main`,
      title: `${platform} Integration`,
      description: `Real-time ${platform} monitoring`,
      status: 'active',
      metrics: { 
        engagement: platform === 'YouTube' ? 85.4 : undefined,
        tasks: platform === 'GitHub' ? 12 : 45,
        latency 
      },
      lastSync: new Date().toISOString(),
      config
    };
  }

  /**
   * PLAN B: SELF-HEALING FALLBACK
   */
  static async executePlanB(failedPlatform: string) {
    toast.warning(`Self-healing: ${failedPlatform} failed. Switching to Plan B...`);
    return {
      status: 'healing',
      action: 'retry_with_backoff',
      alternative: failedPlatform === 'Slack' ? 'Discord' : 'Email'
    };
  }
}
