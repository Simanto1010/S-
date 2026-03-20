import { orchestrateTask } from "./aiService";
import { ExecutionService, ExecutionType, ExecutionTask } from "./executionService";
import { SaaSService } from "./saasService";
import { auth } from "../firebase";

export interface AutonomousConfig {
  enabled: boolean;
  maxRisk: 'low' | 'high';
  autoApproveLowRisk: boolean;
}

export class AutonomousAgent {
  private static config: AutonomousConfig = {
    enabled: true,
    maxRisk: 'low',
    autoApproveLowRisk: true
  };

  static setConfig(config: AutonomousConfig) {
    this.config = config;
  }

  /**
   * Main entry point for autonomous execution
   */
  static async processCommand(command: string, context: any = {}, userId?: string) {
    const uid = userId || auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    // Check SaaS limits
    const canExecute = await SaaSService.checkLimit(uid, 'ai_tasks');
    if (!canExecute) {
      throw new Error("SaaS limit reached: Please upgrade your plan.");
    }

    // 1. Orchestrate the task (get steps)
    const plan = await orchestrateTask(command, context);
    
    // 2. Process each step
    const results = [];
    for (const step of plan.steps) {
      const task: ExecutionTask = {
        userId: uid,
        type: this.determineExecutionType(step.platform),
        platform: step.platform,
        action: step.action,
        params: { ...step, expectedOutput: step.expectedOutput },
        status: 'pending',
        riskLevel: step.riskLevel || 'low',
        autonomous: this.config.enabled && (step.riskLevel === 'low' && this.config.autoApproveLowRisk)
      };

      if (task.autonomous) {
        // Auto-execute
        const result = await ExecutionService.execute(task);
        results.push({ stepId: step.id, status: 'success', result });
        await SaaSService.trackUsage(uid, 'ai_tasks');
      } else {
        // Request approval (in a real app, this would notify the user and wait)
        results.push({ 
          stepId: step.id, 
          status: 'pending_approval', 
          reason: step.riskLevel === 'high' ? 'High risk action' : 'Autonomous mode disabled' 
        });
      }
    }

    return { plan, results };
  }

  private static determineExecutionType(platform: string): ExecutionType {
    const localPlatforms = ['Desktop', 'File System', 'Local App'];
    const browserPlatforms = ['Instagram', 'LinkedIn', 'Twitter', 'Facebook', 'Web'];
    
    if (localPlatforms.includes(platform)) return ExecutionType.LOCAL;
    if (browserPlatforms.includes(platform)) return ExecutionType.BROWSER;
    return ExecutionType.API;
  }
}
