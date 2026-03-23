import { db } from '../firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

export interface AppVersion {
  version: string;
  minVersion: string;
  releaseDate: string;
  critical: boolean;
  message?: string;
}

const CURRENT_VERSION = '2.1.0'; // Current app version
const VERSION_DOC_PATH = 'system/config';

export class VersionService {
  static getCurrentVersion() {
    return CURRENT_VERSION;
  }

  /**
   * Listens for version changes in Firestore
   */
  static subscribeToVersion(callback: (version: AppVersion) => void) {
    return onSnapshot(doc(db, VERSION_DOC_PATH), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AppVersion);
      }
    }, (error) => {
      // Log error but don't crash, especially for permission issues on public docs
      console.warn('Version subscription error:', error.message);
    });
  }

  static async initializeVersionDoc(isAdmin: boolean) {
    if (!isAdmin) return;
    try {
      const versionDoc = doc(db, VERSION_DOC_PATH);
      const snap = await getDoc(versionDoc);
      if (!snap.exists()) {
        await setDoc(versionDoc, {
          version: CURRENT_VERSION,
          minVersion: '2.0.0',
          releaseDate: new Date().toISOString(),
          critical: false,
          message: 'System stable.'
        });
      }
    } catch (err) {
      console.error('Failed to initialize version doc:', err);
    }
  }

  /**
   * Checks if the current version is compatible with the minimum required version
   */
  static isCompatible(current: string, minRequired: string): boolean {
    const parse = (v: string) => v.split('.').map(Number);
    const c = parse(current);
    const m = parse(minRequired);

    for (let i = 0; i < 3; i++) {
      if (c[i] > m[i]) return true;
      if (c[i] < m[i]) return false;
    }
    return true;
  }
}
