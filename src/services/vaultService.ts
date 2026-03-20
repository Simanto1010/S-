import { db, auth, collection, query, where, getDocs, handleFirestoreError, OperationType } from '../firebase';

export interface VaultItem {
  id?: string;
  userId: string;
  name: string;
  service: string;
  value: string;
  status: 'active' | 'revoked';
  lastUsed?: any;
}

export class VaultService {
  /**
   * Retrieves a secret from the user's vault.
   */
  static async getSecret(service: string, name: string): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const q = query(
        collection(db, 'vault'),
        where('userId', '==', user.uid),
        where('service', '==', service),
        where('name', '==', name),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const item = snapshot.docs[0].data() as VaultItem;
      return item.value;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'vault');
      return null;
    }
  }

  /**
   * Lists all services in the user's vault.
   */
  static async listServices(): Promise<string[]> {
    const user = auth.currentUser;
    if (!user) return [];

    try {
      const q = query(collection(db, 'vault'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const services = new Set<string>();
      snapshot.forEach(doc => services.add((doc.data() as VaultItem).service));
      return Array.from(services);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'vault');
      return [];
    }
  }
}
