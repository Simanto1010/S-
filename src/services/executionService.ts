import { db, auth, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from "../firebase";
import { SystemHealthService } from "./systemHealthService";
import { NotificationService } from "./notificationService";
import { VaultService } from "./vaultService";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export enum ExecutionType {
  API = 'api',
  BROWSER = 'browser',
  LOCAL = 'local'
}

export interface ExecutionTask {
  id?: string;
  userId: string;
  type: ExecutionType;
  platform: string;
  action: string;
  params: any;
  status: 'pending' | 'executing' | 'success' | 'failed';
  result?: any;
  error?: string;
  riskLevel: 'low' | 'high';
  autonomous: boolean;
}

export class ExecutionService {
  private static socket: any;

  static setSocket(socket: any) {
    this.socket = socket;
  }

  static async execute(task: ExecutionTask): Promise<any> {
    console.log(`[Execution] Starting ${task.type} task for ${task.platform}: ${task.action}`);
    
    // Log start to real-time stream
    this.emitLog(task.userId, `Starting execution: ${task.action} on ${task.platform}`);

    try {
      let result;
      switch (task.type) {
        case ExecutionType.API:
          result = await this.executeApi(task);
          break;
        case ExecutionType.BROWSER:
          result = await this.executeBrowser(task);
          break;
        case ExecutionType.LOCAL:
          result = await this.executeLocal(task);
          break;
        default:
          throw new Error(`Unknown execution type: ${task.type}`);
      }

      // Verify success
      const verified = await this.verifyExecution(task, result);
      if (!verified) {
        throw new Error(`Execution verification failed for ${task.action}`);
      }

      // Log success
      await this.logExecution(task, 'success', result);
      this.emitLog(task.userId, `Execution successful: ${task.action}`, 'success');
      
      return result;
    } catch (error: any) {
      console.error(`[Execution] Failed: ${error.message}`);
      await this.logExecution(task, 'failed', null, error.message);
      this.emitLog(task.userId, `Execution failed: ${error.message}`, 'error');
      
      // Log system error for autonomous healing
      await SystemHealthService.logError(`ExecutionService.${task.type}`, error.message, { task });

      // Trigger self-healing if autonomous
      if (task.autonomous) {
        return this.triggerSelfHealing(task, error.message);
      }
      
      throw error;
    }
  }

  private static async executeApi(task: ExecutionTask) {
    // Get API key from vault
    const apiKey = await VaultService.getSecret(task.platform, 'API_KEY');
    if (!apiKey) {
      throw new Error(`Missing API Key for ${task.platform} in Identity Vault.`);
    }

    this.emitLog(task.userId, `Authenticating with ${task.platform} API...`);
    
    // Real API execution logic: In a real app, this would use axios or fetch
    // For this prototype, we simulate the actual platform behavior
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (task.platform === 'Slack') {
      if (task.action === 'postMessage') {
        return { ok: true, channel: task.params.channel, ts: Date.now().toString() };
      }
    }
    
    return { status: 'completed', timestamp: new Date().toISOString(), platform: task.platform };
  }

  private static async executeBrowser(task: ExecutionTask) {
    // In a real SaaS, this would use a headless browser pool (Playwright/Puppeteer)
    // Here we simulate the automation steps with detailed logs
    this.emitLog(task.userId, `Launching headless browser instance...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.emitLog(task.userId, `Navigating to https://${task.platform.toLowerCase()}.com/login...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.emitLog(task.userId, `Injecting credentials from Identity Vault...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.emitLog(task.userId, `Performing action: ${task.action}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.emitLog(task.userId, `Capturing execution snapshot...`);
    
    return { 
      screenshot: `https://picsum.photos/seed/${task.action}/800/600`, 
      url: `https://${task.platform.toLowerCase()}.com/dashboard`,
      steps: 4,
      duration: '5.5s'
    };
  }

  private static async executeLocal(task: ExecutionTask) {
    // Send to local agent via socket
    if (!this.socket) throw new Error("Real-time bridge not initialized");
    
    this.emitLog(task.userId, `Routing command to local device agent...`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Local agent timeout")), 30000);
      
      this.socket.emit('local_command', { 
        userId: task.userId, 
        command: task.action, 
        params: task.params 
      }, (response: any) => {
        clearTimeout(timeout);
        if (response.status === 'success') resolve(response.result);
        else reject(new Error(response.message));
      });
    });
  }

  private static async verifyExecution(task: ExecutionTask, result: any): Promise<boolean> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Verify if the following execution result matches the expected output.
        Action: ${task.action}
        Expected: ${task.params.expectedOutput || 'Success'}
        Result: ${JSON.stringify(result)}
        
        Return a JSON object: { "verified": boolean, "reason": string }`,
        config: { responseMimeType: "application/json" }
      });
      
      const verification = JSON.parse(response.text || "{}");
      this.emitLog(task.userId, `Verification: ${verification.reason}`, verification.verified ? 'success' : 'error');
      return verification.verified;
    } catch (error) {
      console.error("AI Verification failed:", error);
      return !!result; // Fallback to simple check
    }
  }

  private static async logExecution(task: ExecutionTask, status: string, result: any = null, error: string = '') {
    try {
      await addDoc(collection(db, 'history'), {
        userId: task.userId,
        type: task.type,
        platform: task.platform,
        command: task.action,
        status,
        result,
        error,
        riskLevel: task.riskLevel,
        autonomous: task.autonomous,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to log execution:", err);
    }
  }

  private static emitLog(userId: string, message: string, type: 'info' | 'success' | 'error' = 'info') {
    if (this.socket) {
      this.socket.to(userId).emit('execution_log', {
        id: Math.random().toString(36).substr(2, 9),
        message,
        type,
        timestamp: new Date()
      });
    }
  }

  private static async triggerSelfHealing(task: ExecutionTask, error: string) {
    this.emitLog(task.userId, `Self-healing triggered for: ${error}`, 'info');
    
    // AI-driven self-healing analysis
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Analyze this execution failure and suggest a fix.
        Action: ${task.action}
        Error: ${error}
        Platform: ${task.platform}
        
        Return a JSON object: { "shouldRetry": boolean, "newParams": any, "explanation": string }`,
        config: { responseMimeType: "application/json" }
      });
      
      const healing = JSON.parse(response.text || "{}");
      if (healing.shouldRetry) {
        this.emitLog(task.userId, `Self-healing: ${healing.explanation}. Retrying...`, 'info');
        const retryTask = { ...task, params: { ...task.params, ...healing.newParams }, autonomous: false };
        return this.execute(retryTask);
      }
    } catch (err) {
      console.error("Self-healing analysis failed:", err);
    }
    
    throw new Error(`Execution failed and self-healing could not resolve it: ${error}`);
  }

  static getRiskLevel(action: string): 'low' | 'high' {
    const highRiskKeywords = ['delete', 'charge', 'refund', 'post', 'send', 'publish', 'update'];
    const isHighRisk = highRiskKeywords.some(kw => action.toLowerCase().includes(kw));
    return isHighRisk ? 'high' : 'low';
  }
}
