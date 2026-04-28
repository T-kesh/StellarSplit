import { describe, expect, it, vi } from 'vitest';
import { formatActivityMessage } from './activityMessageFormatter';
import type { ApiActivityRecord } from './api-client';

describe('formatActivityMessage', () => {
    const mockSplitTitle = 'Dinner at Nobu';
    const mockT = vi.fn((key: string, params?: Record<string, string | number>) => {
        const translations: Record<string, string> = {
            'activityFeed.someone': 'Someone',
            'activityFeed.splitCreated': 'created {{title}}',
            'activityFeed.paymentMade': 'paid {{amount}} toward {{title}}',
            'activityFeed.paymentReceived': 'received a payment for {{title}}',
            'activityFeed.splitCompleted': 'marked {{title}} as completed',
            'activityFeed.splitEdited': 'updated {{title}}',
            'activityFeed.generic': 'added an update to {{title}}',
        };

        let result = translations[key] || key;
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                result = result.replace(`{{${paramKey}}}`, String(value));
            });
        }
        return result;
    });

    const createMockActivity = (
        activityType: string,
        metadata: Record<string, unknown> = {},
    ): ApiActivityRecord => ({
        id: 'activity-1',
        userId: 'user-123',
        activityType,
        splitId: 'split-123',
        metadata: {
            actorName: 'John Doe',
            title: mockSplitTitle,
            ...metadata,
        },
        isRead: false,
        createdAt: '2026-01-01T00:00:00.000Z',
    });

    describe('English locale (default)', () => {
        it('formats split_created activity', () => {
            const activity = createMockActivity('split_created');
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.id).toBe('activity-1');
            expect(result.type).toBe('custom');
            expect(result.userName).toBe('John Doe');
            expect(result.message).toBe('created Dinner at Nobu');
            expect(result.splitId).toBe('split-123');
        });

        it('formats payment_made activity with amount', () => {
            const activity = createMockActivity('payment_made', { amount: 25.50 });
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.type).toBe('payment-status');
            expect(result.message).toBe('paid 25.50 toward Dinner at Nobu');
        });

        it('formats payment_made activity without amount', () => {
            const activity = createMockActivity('payment_made', { amount: 0 });
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.type).toBe('payment-status');
            expect(result.message).toBe('paid 0.00 toward Dinner at Nobu');
        });

        it('formats payment_received activity', () => {
            const activity = createMockActivity('payment_received');
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.type).toBe('payment-status');
            expect(result.message).toBe('received a payment for Dinner at Nobu');
        });

        it('formats split_completed activity', () => {
            const activity = createMockActivity('split_completed');
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.type).toBe('payment-status');
            expect(result.message).toBe('marked Dinner at Nobu as completed');
        });

        it('formats split_edited activity', () => {
            const activity = createMockActivity('split_edited');
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.type).toBe('item-updated');
            expect(result.message).toBe('updated Dinner at Nobu');
        });

        it('formats unknown activity type as generic', () => {
            const activity = createMockActivity('unknown_type');
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.type).toBe('custom');
            expect(result.message).toBe('added an update to Dinner at Nobu');
        });

        it('uses metadata title when available', () => {
            const customTitle = 'Custom Split Title';
            const activity = createMockActivity('split_created', { title: customTitle });
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.message).toBe(`created ${customTitle}`);
        });

        it('uses split title as fallback when metadata title is missing', () => {
            const activity = createMockActivity('split_created', { title: null });
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.message).toBe(`created ${mockSplitTitle}`);
        });

        it('handles missing actor name with translation fallback', () => {
            const activity = createMockActivity('split_created', { actorName: null });
            const result = formatActivityMessage({ t: mockT, activity, splitTitle: mockSplitTitle });

            expect(result.userName).toBe('Someone');
        });
    });

    describe('French locale (secondary locale smoke test)', () => {
        const mockFrenchT = vi.fn((key: string, params?: Record<string, string | number>) => {
            const translations: Record<string, string> = {
                'activityFeed.someone': 'Quelqu\'un',
                'activityFeed.splitCreated': 'a créé {{title}}',
                'activityFeed.paymentMade': 'a payé {{amount}} pour {{title}}',
                'activityFeed.paymentReceived': 'a reçu un paiement pour {{title}}',
                'activityFeed.splitCompleted': 'a marqué {{title}} comme terminé',
                'activityFeed.splitEdited': 'a mis à jour {{title}}',
                'activityFeed.generic': 'a ajouté une mise à jour à {{title}}',
            };

            let result = translations[key] || key;
            if (params) {
                Object.entries(params).forEach(([paramKey, value]) => {
                    result = result.replace(`{{${paramKey}}}`, String(value));
                });
            }
            return result;
        });

        it('formats split_created activity in French', () => {
            const activity = createMockActivity('split_created');
            const result = formatActivityMessage({ t: mockFrenchT, activity, splitTitle: mockSplitTitle });

            expect(result.message).toBe('a créé Dinner at Nobu');
        });

        it('formats payment_made activity in French', () => {
            const activity = createMockActivity('payment_made', { amount: 25.50 });
            const result = formatActivityMessage({ t: mockFrenchT, activity, splitTitle: mockSplitTitle });

            expect(result.message).toBe('a payé 25.50 pour Dinner at Nobu');
        });

        it('formats payment_received activity in French', () => {
            const activity = createMockActivity('payment_received');
            const result = formatActivityMessage({ t: mockFrenchT, activity, splitTitle: mockSplitTitle });

            expect(result.message).toBe('a reçu un paiement pour Dinner at Nobu');
        });

        it('formats split_completed activity in French', () => {
            const activity = createMockActivity('split_completed');
            const result = formatActivityMessage({ t: mockFrenchT, activity, splitTitle: mockSplitTitle });

            expect(result.message).toBe('a marqué Dinner at Nobu comme terminé');
        });

        it('formats split_edited activity in French', () => {
            const activity = createMockActivity('split_edited');
            const result = formatActivityMessage({ t: mockFrenchT, activity, splitTitle: mockSplitTitle });

            expect(result.message).toBe('a mis à jour Dinner at Nobu');
        });
    });
});
