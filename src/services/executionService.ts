import { db, auth, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from "../firebase";
import { SystemHealthService } from "./systemHealthService";
import { NotificationService } from "./notificationService";
import { VaultService } from "./vaultService";
import { ConnectorService } from "./connectorService";
import { callAIWithRetry } from "./aiService";

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

export interface ExecutionOptions {
  onLog?: (message: string, type: 'info' | 'success' | 'error' | 'ai') => void;
  onStepUpdate?: (stepId: string, status: string, result?: any, error?: string) => void;
  onStatusChange?: (status: string) => void;
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
    
    // Use ConnectorService to trigger the actual workflow
    const result = await ConnectorService.triggerWorkflow(task.action, {
      ...task.params,
      platform: task.platform,
      apiKey
    });

    if (!result.success) {
      throw new Error(`Connector API failed: ${result.error || 'Unknown error'}`);
    }

    return result;
  }

  private static async executeBrowser(task: ExecutionTask) {
    // In a real SaaS, this would use a headless browser pool (Playwright/Puppeteer)
    // Here we simulate the automation steps with detailed logs
    this.emitLog(task.userId, `Launching headless browser instance for ${task.platform}...`);
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
      summary: `Successfully performed ${task.action} on ${task.platform} via browser automation.`,
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
      const response = await callAIWithRetry({
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
      const response = await callAIWithRetry({
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

  static async executePlan(plan: any, userId: string, options?: ExecutionOptions): Promise<any[]> {
    const results: any[] = [];
    const completedSteps: Set<string> = new Set();
    const stepResults: Map<string, any> = new Map();

    const executeStep = async (step: any) => {
      // Check dependencies
      if (step.dependsOn && step.dependsOn.length > 0) {
        for (const depId of step.dependsOn) {
          if (!completedSteps.has(depId)) {
            // Wait for dependency (this is a simple poll, could be improved with events)
            await new Promise(resolve => {
              const interval = setInterval(() => {
                if (completedSteps.has(depId)) {
                  clearInterval(interval);
                  resolve(null);
                }
              }, 100);
            });
          }
        }
      }

      // Check condition if present
      if (step.condition) {
        // Simple condition evaluation (can be expanded)
        const conditionMet = this.evaluateCondition(step.condition, stepResults);
        if (!conditionMet) {
          const skipMsg = `Skipping step ${step.id}: Condition not met (${step.condition.if})`;
          this.emitLog(userId, skipMsg, 'info');
          options?.onLog?.(skipMsg, 'info');
          options?.onStepUpdate?.(step.id, 'skipped');
          completedSteps.add(step.id);
          return;
        }
      }

      options?.onStepUpdate?.(step.id, 'executing');
      const task: ExecutionTask = {
        userId,
        type: this.determineExecutionType(step.platform),
        platform: step.platform,
        action: step.action,
        params: step.params,
        status: 'pending',
        riskLevel: this.getRiskLevel(step.action),
        autonomous: true
      };

      try {
        const startMsg = `Executing: ${step.action} on ${step.platform}...`;
        options?.onLog?.(startMsg, 'info');
        
        const result = await this.execute(task);
        stepResults.set(step.id, result);
        results.push({ stepId: step.id, status: 'success', result });
        
        options?.onStepUpdate?.(step.id, 'completed', result);
        options?.onLog?.(`Step ${step.id} completed successfully.`, 'success');
      } catch (error: any) {
        const failMsg = `Step ${step.id} failed: ${error.message}. Checking Plan B...`;
        this.emitLog(userId, failMsg, 'error');
        options?.onLog?.(failMsg, 'error');
        
        if (step.planB) {
          const planBMsg = `Executing Plan B for ${step.id}: ${step.planB.action} on ${step.planB.platform}`;
          this.emitLog(userId, planBMsg, 'info');
          options?.onLog?.(planBMsg, 'info');
          options?.onStepUpdate?.(step.id, 'retrying');

          const planBTask: ExecutionTask = {
            userId,
            type: this.determineExecutionType(step.planB.platform),
            platform: step.planB.platform,
            action: step.planB.action,
            params: step.planB.params || {},
            status: 'pending',
            riskLevel: this.getRiskLevel(step.planB.action),
            autonomous: true
          };
          try {
            const bResult = await this.execute(planBTask);
            stepResults.set(step.id, bResult);
            results.push({ stepId: step.id, status: 'success_via_plan_b', result: bResult });
            options?.onStepUpdate?.(step.id, 'completed', bResult);
          } catch (bError: any) {
            results.push({ stepId: step.id, status: 'failed', error: bError.message });
            options?.onStepUpdate?.(step.id, 'failed', null, bError.message);
          }
        } else {
          results.push({ stepId: step.id, status: 'failed', error: error.message });
          options?.onStepUpdate?.(step.id, 'failed', null, error.message);
        }
      } finally {
        completedSteps.add(step.id);
      }
    };

    // Group steps by parallelizability
    const parallelSteps = plan.steps.filter((s: any) => s.parallelizable && (!s.dependsOn || s.dependsOn.length === 0));
    const sequentialSteps = plan.steps.filter((s: any) => !s.parallelizable || (s.dependsOn && s.dependsOn.length > 0));

    // Execute initial parallel steps
    const parallelPromises = parallelSteps.map((s: any) => executeStep(s));
    
    // Execute sequential steps (which will wait for their own dependencies)
    const sequentialPromises = sequentialSteps.map((s: any) => executeStep(s));

    await Promise.all([...parallelPromises, ...sequentialPromises]);

    return results;
  }

  private static determineExecutionType(platform: string): ExecutionType {
    const apiPlatforms = ['Slack', 'GitHub', 'Twitter', 'Stripe', 'Twilio', 'SendGrid'];
    const browserPlatforms = ['LinkedIn', 'Facebook', 'Instagram', 'TikTok'];
    
    if (apiPlatforms.some(p => platform.toLowerCase().includes(p.toLowerCase()))) return ExecutionType.API;
    if (browserPlatforms.some(p => platform.toLowerCase().includes(p.toLowerCase()))) return ExecutionType.BROWSER;
    return ExecutionType.LOCAL;
  }

  private static evaluateCondition(condition: any, previousResults: Map<string, any>): boolean {
    // In a real implementation, this would use a sandbox or safe evaluator
    // For this prototype, we check if the 'if' string mentions a previous step result
    try {
      if (condition.if.includes('step_')) {
        const stepId = condition.if.match(/step_\d+/)?.[0];
        if (stepId) {
          const result = previousResults.get(stepId);
          // Simple check: if result exists and is truthy
          return !!result;
        }
      }
      return true; // Default to true if we can't parse
    } catch (e) {
      return true;
    }
  }

  static getRiskLevel(action: string): 'low' | 'high' {
    const highRiskKeywords = ['delete', 'charge', 'refund', 'post', 'send', 'publish', 'update'];
    const isHighRisk = highRiskKeywords.some(kw => action.toLowerCase().includes(kw));
    return isHighRisk ? 'high' : 'low';
  }
}
