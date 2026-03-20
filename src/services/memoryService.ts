import { 
  db, auth, collection, addDoc, query, where, getDocs, serverTimestamp, 
  handleFirestoreError, OperationType 
} from '../firebase';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface MemoryEntry {
  id?: string;
  userId: string;
  content: string;
  embedding: number[];
  metadata: {
    type: 'task' | 'feedback' | 'reasoning';
    platform?: string;
    outcome?: string;
    timestamp: any;
  };
}

export class MemoryService {
  /**
   * Converts text into a vector embedding using text-embedding-004
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [text],
      });
      return result.embeddings[0].values;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return [];
    }
  }

  /**
   * Saves a new memory entry to Firestore
   */
  static async saveMemory(content: string, metadata: MemoryEntry['metadata']) {
    const user = auth.currentUser;
    if (!user) return;

    const embedding = await this.generateEmbedding(content);
    if (embedding.length === 0) return;

    try {
      await addDoc(collection(db, 'memories'), {
        userId: user.uid,
        content,
        embedding,
        metadata: {
          ...metadata,
          timestamp: serverTimestamp(),
        }
      });
      console.log('[Memory] New insight indexed successfully.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'memories');
    }
  }

  /**
   * Performs a semantic search in the user's long-term memory.
   * Uses Firestore Vector Search (VectorQuery) with a fallback to manual ranking.
   */
  static async searchMemory(queryText: string, limit: number = 3): Promise<string[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const queryEmbedding = await this.generateEmbedding(queryText);
    if (queryEmbedding.length === 0) return [];

    try {
      // Fallback: Fetch recent memories and rank them manually
      const q = query(collection(db, 'memories'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const memories = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          content: data.content,
          embedding: data.embedding
        };
      });
      
      if (memories.length === 0) return [];

      // Simple Cosine Similarity ranking
      const ranked = memories
        .filter(m => Array.isArray(m.embedding))
        .map(m => ({
          content: m.content,
          similarity: this.cosineSimilarity(queryEmbedding, m.embedding)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      return ranked.map(r => r.content);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'memories');
      return [];
    }
  }

  private static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}
