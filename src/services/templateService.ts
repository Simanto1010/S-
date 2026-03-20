import { db, collection, addDoc, getDocs, query, where, serverTimestamp } from "../firebase";

export interface AutomationTemplate {
  id?: string;
  name: string;
  description: string;
  trigger: string;
  steps: any[];
  userId: string;
  usageCount: number;
  lastUsed?: any;
}

export class TemplateService {
  static async saveAsTemplate(name: string, description: string, trigger: string, steps: any[], userId: string) {
    try {
      const docRef = await addDoc(collection(db, 'templates'), {
        name,
        description,
        trigger,
        steps,
        userId,
        usageCount: 0,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Failed to save template:", error);
      throw error;
    }
  }

  static async getTemplates(userId: string) {
    const q = query(collection(db, 'templates'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AutomationTemplate));
  }

  static async findMatchingTemplate(command: string, userId: string): Promise<AutomationTemplate | null> {
    const templates = await this.getTemplates(userId);
    // Simple keyword matching for now
    return templates.find(t => command.toLowerCase().includes(t.trigger.toLowerCase())) || null;
  }
}
