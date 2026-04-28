import type { Participant, Split } from '../types';
import type { ActivityFeedItem } from '../components/Collaboration';
import type { TFunction } from 'i18next';
import {
    fetchProfile,
    fetchReceiptSignedUrl,
    fetchSplitById,
    fetchSplitReceipts,
    fetchUserActivities,
    normalizeDecimal,
    type ApiActivityRecord,
    type ApiProfile,
    type ApiSplitParticipant,
} from '../utils/api-client';
import { getStoredSplitParticipantDirectory } from '../utils/session';
import { formatActivityMessage } from '../utils/activityMessageFormatter';

export interface SplitDetailViewModel {
    split: Split;
    activityItems: ActivityFeedItem[];
}

export interface SplitDetailRepositoryOptions {
    currentUserId: string | null;
    t?: TFunction;
}

class SplitDetailRepository {
    private shortId(value: string): string {
        return `${value.slice(0, 6)}...${value.slice(-4)}`;
    }

    private matchesCurrentUser(
        participant: ApiSplitParticipant,
        currentUserId: string | null,
    ): boolean {
        if (!currentUserId) {
            return false;
        }

        return participant.walletAddress === currentUserId || participant.userId === currentUserId;
    }

    private resolveParticipantName(
        participant: ApiSplitParticipant,
        splitId: string,
        currentUserId: string | null,
        profileMap: Record<string, ApiProfile>,
    ): string {
        if (this.matchesCurrentUser(participant, currentUserId)) {
            return 'You';
        }

        if (participant.walletAddress && profileMap[participant.walletAddress]?.displayName) {
            return profileMap[participant.walletAddress].displayName ?? this.shortId(participant.walletAddress);
        }

        const storedDirectory = getStoredSplitParticipantDirectory(splitId);
        if (storedDirectory[participant.userId]?.name) {
            return storedDirectory[participant.userId].name;
        }

        if (participant.walletAddress) {
            return this.shortId(participant.walletAddress);
        }

        return this.shortId(participant.userId);
    }

    private buildActivityMessage(
        activity: ApiActivityRecord,
        splitTitle: string,
        t?: TFunction,
    ): ActivityFeedItem {
        if (!t) {
            // Fallback to old behavior if t is not provided
            const metadataTitle =
                typeof activity.metadata.title === 'string' ? activity.metadata.title : splitTitle;
            const amount =
                typeof activity.metadata.amount === 'number' || typeof activity.metadata.amount === 'string'
                    ? normalizeDecimal(activity.metadata.amount as number | string)
                    : 0;
            const actor =
                typeof activity.metadata.actorName === 'string'
                    ? activity.metadata.actorName
                    : 'Someone';

            switch (activity.activityType) {
                case 'split_created':
                    return {
                        id: activity.id,
                        type: 'custom',
                        userName: actor,
                        message: `created ${metadataTitle}`,
                        timestamp: activity.createdAt,
                        splitId: activity.splitId,
                    };
                case 'payment_made':
                    return {
                        id: activity.id,
                        type: 'payment-status',
                        userName: actor,
                        message: `paid ${amount > 0 ? amount.toFixed(2) : ''} toward ${metadataTitle}`.trim(),
                        timestamp: activity.createdAt,
                        splitId: activity.splitId,
                    };
                case 'payment_received':
                    return {
                        id: activity.id,
                        type: 'payment-status',
                        userName: actor,
                        message: `received a payment for ${metadataTitle}`,
                        timestamp: activity.createdAt,
                        splitId: activity.splitId,
                    };
                case 'split_completed':
                    return {
                        id: activity.id,
                        type: 'payment-status',
                        userName: actor,
                        message: `marked ${metadataTitle} as completed`,
                        timestamp: activity.createdAt,
                        splitId: activity.splitId,
                    };
                case 'split_edited':
                    return {
                        id: activity.id,
                        type: 'item-updated',
                        userName: actor,
                        message: `updated ${metadataTitle}`,
                        timestamp: activity.createdAt,
                        splitId: activity.splitId,
                    };
                default:
                    return {
                        id: activity.id,
                        type: 'custom',
                        userName: actor,
                        message: `added an update to ${metadataTitle}`,
                        timestamp: activity.createdAt,
                        splitId: activity.splitId,
                    };
            }
        }

        // Use the formatter when t is provided
        return formatActivityMessage({
            t,
            activity,
            splitTitle,
        });
    }

    private roundCurrency(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private async fetchProfiles(
        walletAddresses: string[],
    ): Promise<Record<string, ApiProfile>> {
        const results = await Promise.allSettled(
            walletAddresses.map((walletAddress) => fetchProfile(walletAddress)),
        );

        return results.reduce<Record<string, ApiProfile>>((map, result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                map[walletAddresses[index]] = result.value;
            }
            return map;
        }, {});
    }

    private async fetchLatestReceiptUrl(
        splitId: string,
        currentUserId: string | null,
    ): Promise<string | null> {
        if (!currentUserId) {
            return null;
        }

        try {
            const receipts = await fetchSplitReceipts(splitId);
            const latestReceipt = [...receipts].sort(
                (left, right) =>
                    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            )[0];

            if (!latestReceipt) {
                return null;
            }

            return await fetchReceiptSignedUrl(latestReceipt.id);
        } catch {
            return null;
        }
    }

    private async fetchActivities(
        currentUserId: string | null,
        splitId: string,
    ): Promise<ApiActivityRecord[] | null> {
        if (!currentUserId) {
            return null;
        }

        try {
            const response = await fetchUserActivities(currentUserId, { splitId, limit: 20 });
            return response.data;
        } catch {
            return null;
        }
    }

    async getSplitDetail(
        splitId: string,
        options: SplitDetailRepositoryOptions,
    ): Promise<SplitDetailViewModel> {
        const { currentUserId } = options;

        const splitRecord = await fetchSplitById(splitId);

        const walletAddresses = Array.from(
            new Set(
                [splitRecord.creatorWalletAddress, ...splitRecord.participants.map((participant) => participant.walletAddress)]
                    .filter((walletAddress): walletAddress is string => Boolean(walletAddress)),
            ),
        );

        const [profileMap, latestReceiptUrl, activities] = await Promise.all([
            this.fetchProfiles(walletAddresses),
            this.fetchLatestReceiptUrl(splitId, currentUserId),
            this.fetchActivities(currentUserId, splitId),
        ]);

        const participants: Participant[] = splitRecord.participants.map((participant) => {
            const totalOwed = normalizeDecimal(participant.amountOwed);
            const amountPaid = normalizeDecimal(participant.amountPaid);
            return {
                id: participant.id,
                userId: participant.userId,
                name: this.resolveParticipantName(participant, splitRecord.id, currentUserId, profileMap),
                amountOwed: totalOwed,
                amountPaid,
                amountDue: Math.max(0, this.roundCurrency(totalOwed - amountPaid)),
                status: participant.status,
                isCurrentUser: this.matchesCurrentUser(participant, currentUserId),
                walletAddress: participant.walletAddress ?? undefined,
            };
        });

        const split: Split = {
            id: splitRecord.id,
            title: splitRecord.description?.trim() || `Split ${splitRecord.id.slice(0, 8)}`,
            totalAmount: normalizeDecimal(splitRecord.totalAmount),
            amountPaid: normalizeDecimal(splitRecord.amountPaid),
            currency: splitRecord.preferredCurrency || 'XLM',
            date: splitRecord.createdAt,
            status: splitRecord.status,
            receiptUrl: latestReceiptUrl ?? undefined,
            creatorWalletAddress: splitRecord.creatorWalletAddress ?? undefined,
            preferredCurrency: splitRecord.preferredCurrency ?? undefined,
            participants,
            items: (splitRecord.items ?? []).map((item) => ({
                id: item.id,
                name: item.name,
                price: normalizeDecimal(item.totalPrice),
                quantity: item.quantity,
                unitPrice: normalizeDecimal(item.unitPrice),
                assignedToIds: item.assignedToIds,
            })),
        };

        const activityItems = (activities ?? []).map((activity) =>
            this.buildActivityMessage(activity, split.title, options.t),
        );

        return {
            split,
            activityItems,
        };
    }
}

export const splitDetailRepository = new SplitDetailRepository();
