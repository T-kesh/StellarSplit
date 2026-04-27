import type { DraftType, DraftMetadata, DraftEntry, DraftStorage } from '../types/draft';

const DRAFT_STORAGE_KEY = 'stellarsplit_drafts';
const DRAFT_EXPIRY_DAYS = 30; // Drafts expire after 30 days
const CURRENT_VERSION = 1;

class DraftRegistry {
  private getStorage(): DraftStorage {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      let storage: DraftStorage;
      
      if (raw) {
        const parsed = JSON.parse(raw);
        
        // Version mismatch fallback
        if (!parsed.version || parsed.version !== CURRENT_VERSION) {
          // Clear incompatible storage
          storage = { version: CURRENT_VERSION, drafts: {} };
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(storage));
        } else {
          storage = parsed;
        }
      } else {
        storage = { version: CURRENT_VERSION, drafts: {} };
      }
      
      // Prune expired drafts
      const now = new Date();
      const expiryTime = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 30 days in ms
      
      Object.keys(storage.drafts).forEach(key => {
        const draft = storage.drafts[key];
        const updatedAt = new Date(draft.metadata.updatedAt);
        if (now.getTime() - updatedAt.getTime() > expiryTime) {
          delete storage.drafts[key];
        }
      });
      
      // Save pruned storage back if we had raw data
      if (raw) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(storage));
      }
      
      return storage;
    } catch {
      return { version: CURRENT_VERSION, drafts: {} };
    }
  }

  private setStorage(storage: DraftStorage): void {
    storage.version = CURRENT_VERSION;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(storage));
  }

  save(key: string, data: any, type: DraftType, title?: string): void {
    const storage = this.getStorage();
    storage.drafts[key] = {
      data,
      metadata: {
        key,
        type,
        updatedAt: new Date().toISOString(),
        title,
      },
    };
    this.setStorage(storage);
  }

  load(key: string): any | null {
    const storage = this.getStorage();
    const entry = storage.drafts[key];
    return entry ? entry.data : null;
  }

  list(): DraftMetadata[] {
    const storage = this.getStorage();
    return Object.values(storage.drafts).map(entry => entry.metadata);
  }

  delete(key: string): void {
    const storage = this.getStorage();
    delete storage.drafts[key];
    this.setStorage(storage);
  }

  // Migration helpers for existing drafts
  migrateWizardDraft(): void {
    const oldKey = 'splitwizard_draft';
    const raw = localStorage.getItem(oldKey);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        this.save('wizard', data, 'wizard', data.title || 'Split Wizard Draft');
        localStorage.removeItem(oldKey);
      } catch {
        // ignore
      }
    }
  }

  migrateReceiptDraft(splitId: string): void {
    const oldKey = `stellarsplit-receipt-draft:${splitId}`;
    const raw = localStorage.getItem(oldKey);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const title = data.imageName || data.manualEntry?.merchant || `Receipt Draft ${splitId}`;
        this.save(`receipt:${splitId}`, data, 'receipt', title);
        localStorage.removeItem(oldKey);
      } catch {
        // ignore
      }
    }
  }
}

export const draftRegistry = new DraftRegistry();