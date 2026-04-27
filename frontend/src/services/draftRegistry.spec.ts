import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { draftRegistry } from './draftRegistry';
import type { DraftType } from '../types/draft';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('DraftRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    // Clear any existing drafts by simulating empty storage
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ version: 1, drafts: {} }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('save', () => {
    it('should save a wizard draft with correct metadata', () => {
      const wizardData = {
        title: 'Test Split',
        currency: 'USD',
        totalAmount: 100,
        splitMethod: 'equal' as const,
        participants: [],
        items: [],
        taxAmount: 0,
        tipAmount: 0,
      };

      draftRegistry.save('wizard', wizardData, 'wizard', 'Test Split');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"wizard"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"type":"wizard"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"title":"Test Split"')
      );
    });

    it('should save a receipt draft with correct metadata', () => {
      const receiptData = {
        step: 'review' as const,
        method: 'camera' as const,
        receiptTotal: 50,
        items: [],
        progress: 100,
        updatedAt: new Date().toISOString(),
      };

      draftRegistry.save('receipt:123', receiptData, 'receipt', 'Receipt Draft');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"receipt:123"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"type":"receipt"')
      );
    });
  });

  describe('load', () => {
    it('should load a saved draft', () => {
      const wizardData = {
        title: 'Test Split',
        currency: 'USD',
        totalAmount: 100,
        splitMethod: 'equal' as const,
        participants: [],
        items: [],
        taxAmount: 0,
        tipAmount: 0,
      };

      // Mock the storage to return the saved data
      const storageData = {
        version: 1,
        drafts: {
          wizard: {
            data: wizardData,
            metadata: {
              key: 'wizard',
              type: 'wizard' as DraftType,
              updatedAt: new Date().toISOString(),
              title: 'Test Split',
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageData));

      const loaded = draftRegistry.load('wizard');

      expect(loaded).toEqual(wizardData);
    });

    it('should return null for non-existent draft', () => {
      const loaded = draftRegistry.load('nonexistent');
      expect(loaded).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all saved drafts with metadata', () => {
      const wizardData = {
        title: 'Test Split',
        currency: 'USD',
        totalAmount: 100,
        splitMethod: 'equal' as const,
        participants: [],
        items: [],
        taxAmount: 0,
        tipAmount: 0,
      };

      const receiptData = {
        step: 'review' as const,
        method: 'camera' as const,
        receiptTotal: 50,
        items: [],
        progress: 100,
        updatedAt: new Date().toISOString(),
      };

      // Mock storage with both drafts
      const storageData = {
        version: 1,
        drafts: {
          wizard: {
            data: wizardData,
            metadata: {
              key: 'wizard',
              type: 'wizard' as DraftType,
              updatedAt: new Date().toISOString(),
              title: 'Test Split',
            },
          },
          'receipt:123': {
            data: receiptData,
            metadata: {
              key: 'receipt:123',
              type: 'receipt' as DraftType,
              updatedAt: new Date().toISOString(),
              title: 'Receipt Draft',
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageData));

      const drafts = draftRegistry.list();

      expect(drafts).toHaveLength(2);
      expect(drafts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'wizard',
            type: 'wizard',
            title: 'Test Split',
          }),
          expect.objectContaining({
            key: 'receipt:123',
            type: 'receipt',
            title: 'Receipt Draft',
          }),
        ])
      );
    });

    it('should return empty array when no drafts exist', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ version: 1, drafts: {} }));
      const drafts = draftRegistry.list();
      expect(drafts).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a specific draft', () => {
      const wizardData = {
        title: 'Test Split',
        currency: 'USD',
        totalAmount: 100,
        splitMethod: 'equal' as const,
        participants: [],
        items: [],
        taxAmount: 0,
        tipAmount: 0,
      };

      // Mock storage with the draft
      const storageData = {
        version: 1,
        drafts: {
          wizard: {
            data: wizardData,
            metadata: {
              key: 'wizard',
              type: 'wizard' as DraftType,
              updatedAt: new Date().toISOString(),
              title: 'Test Split',
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageData));

      // Verify it exists
      expect(draftRegistry.load('wizard')).toEqual(wizardData);

      // Delete it
      draftRegistry.delete('wizard');

      // Verify setItem was called to update storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        JSON.stringify({ version: 1, drafts: {} })
      );
    });

    it('should not throw when deleting non-existent draft', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ version: 1, drafts: {} }));
      expect(() => draftRegistry.delete('nonexistent')).not.toThrow();
    });
  });

  describe('migration', () => {
    it('should migrate existing wizard draft', () => {
      const wizardData = {
        title: 'Old Split',
        currency: 'USD',
        totalAmount: 200,
        splitMethod: 'equal' as const,
        participants: [],
        items: [],
        taxAmount: 0,
        tipAmount: 0,
      };

      // Simulate old localStorage format
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'splitwizard_draft') {
          return JSON.stringify(wizardData);
        }
        return JSON.stringify({ version: 1, drafts: {} });
      });

      draftRegistry.migrateWizardDraft();

      // Should have saved to new format
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"wizard"')
      );

      // Should have removed old key
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('splitwizard_draft');
    });

    it('should migrate existing receipt draft', () => {
      const receiptData = {
        step: 'review' as const,
        method: 'camera' as const,
        receiptTotal: 75,
        items: [],
        progress: 100,
        updatedAt: new Date().toISOString(),
      };

      // Simulate old localStorage format
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'stellarsplit-receipt-draft:456') {
          return JSON.stringify(receiptData);
        }
        return JSON.stringify({ version: 1, drafts: {} });
      });

      draftRegistry.migrateReceiptDraft('456');

      // Should have saved to new format
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"receipt:456"')
      );

      // Should have removed old key
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('stellarsplit-receipt-draft:456');
    });

    it('should handle corrupt migration data gracefully', () => {
      // Simulate corrupt data
      localStorageMock.getItem.mockReturnValue('invalid json');

      expect(() => draftRegistry.migrateWizardDraft()).not.toThrow();
      // Should not have saved anything
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('expiry pruning', () => {
    it('should prune expired drafts', () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 31); // 31 days ago

      const expiredData = {
        title: 'Expired Split',
        currency: 'USD',
        totalAmount: 100,
        splitMethod: 'equal' as const,
        participants: [],
        items: [],
        taxAmount: 0,
        tipAmount: 0,
      };

      const freshData = {
        title: 'Fresh Split',
        currency: 'USD',
        totalAmount: 200,
        splitMethod: 'equal' as const,
        participants: [],
        items: [],
        taxAmount: 0,
        tipAmount: 0,
      };

      // Mock storage with expired and fresh drafts
      const storageData = {
        version: 1,
        drafts: {
          expired: {
            data: expiredData,
            metadata: {
              key: 'expired',
              type: 'wizard' as DraftType,
              updatedAt: expiredDate.toISOString(),
              title: 'Expired Split',
            },
          },
          fresh: {
            data: freshData,
            metadata: {
              key: 'fresh',
              type: 'wizard' as DraftType,
              updatedAt: new Date().toISOString(),
              title: 'Fresh Split',
            },
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storageData));

      // Trigger pruning by calling list()
      const drafts = draftRegistry.list();

      // Should only return fresh draft
      expect(drafts).toHaveLength(1);
      expect(drafts[0].key).toBe('fresh');

      // Should have saved pruned storage
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.stringContaining('"fresh"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        expect.not.stringContaining('expired')
      );
    });
  });

  describe('version mismatch fallback', () => {
    it('should clear storage on version mismatch', () => {
      const oldVersionData = {
        version: 0, // Old version
        drafts: {
          old: {
            data: { some: 'data' },
            metadata: {
              key: 'old',
              type: 'wizard' as DraftType,
              updatedAt: new Date().toISOString(),
              title: 'Old Draft',
            },
          },
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldVersionData));

      // Trigger version check by calling list()
      const drafts = draftRegistry.list();

      // Should return empty array
      expect(drafts).toEqual([]);

      // Should have cleared and saved new version
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        JSON.stringify({ version: 1, drafts: {} })
      );
    });

    it('should handle missing version field', () => {
      const noVersionData = {
        drafts: {
          old: {
            data: { some: 'data' },
            metadata: {
              key: 'old',
              type: 'wizard' as DraftType,
              updatedAt: new Date().toISOString(),
              title: 'Old Draft',
            },
          },
        },
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(noVersionData));

      // Trigger version check
      const drafts = draftRegistry.list();

      // Should return empty array
      expect(drafts).toEqual([]);

      // Should have cleared and saved new version
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'stellarsplit_drafts',
        JSON.stringify({ version: 1, drafts: {} })
      );
    });
  });
});