import { toast } from 'sonner';
import { ActivityLogService } from './activityLogService';
import { auth } from '../firebase';

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: number;
  onRetry?: (attempt: number, error: any) => void;
  context?: string;
}

export class ErrorRetryService {
  /**
   * Executes a function with automatic retry logic
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 2000,
      backoff = 2,
      onRetry,
      context = 'General'
    } = options;

    let lastError: any;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if it's a terminal error (e.g., auth failure, validation error)
        if (this.isTerminalError(error)) {
          throw error;
        }

        if (attempt <= maxRetries) {
          const userId = auth.currentUser?.uid;
          if (userId) {
            ActivityLogService.log(
              userId, 
              `Auto-retrying ${context} (Attempt ${attempt}/${maxRetries})`, 
              'warning', 
              'system', 
              { error: error.message || String(error) }
            );
          }

          if (onRetry) onRetry(attempt, error);
          
          toast.info(`Retrying ${context}... (Attempt ${attempt}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          currentDelay *= backoff;
        }
      }
    }

    const userId = auth.currentUser?.uid;
    if (userId) {
      ActivityLogService.log(
        userId, 
        `${context} failed after ${maxRetries} retries`, 
        'error', 
        'system', 
        { error: lastError.message || String(lastError) }
      );
    }

    throw lastError;
  }

  private static isTerminalError(error: any): boolean {
    const message = (error.message || String(error)).toLowerCase();
    const terminalKeywords = [
      'unauthorized',
      'forbidden',
      'invalid_argument',
      'permission-denied',
      'not-found',
      'already-exists'
    ];
    
    return terminalKeywords.some(keyword => message.includes(keyword));
  }
}
