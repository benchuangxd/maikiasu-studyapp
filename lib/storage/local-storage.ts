export class LocalStorageAdapter<T> {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  get(): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(this.key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading localStorage (${this.key}):`, error);
      return null;
    }
  }

  set(value: T): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Export data and clear old questions.');
      } else {
        console.error(`Error writing localStorage (${this.key}):`, error);
      }
      return false;
    }
  }

  remove(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      console.error(`Error removing localStorage (${this.key}):`, error);
    }
  }

  exists(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.key) !== null;
  }
}

export const STORAGE_KEYS = {
  QUESTIONS: 'maikiasu:questions',
  REVIEW_METADATA: 'maikiasu:review-metadata',
  SESSIONS: 'maikiasu:sessions',
  SETTINGS: 'maikiasu:settings',
  ACTIVE_SESSION: 'maikiasu:active-session',
  LOADED_MODULES: 'maikiasu:loaded-modules',
} as const;
