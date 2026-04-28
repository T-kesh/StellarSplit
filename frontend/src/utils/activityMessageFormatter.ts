import type { TFunction } from 'i18next';
import { normalizeDecimal } from './api-client';
import type { ApiActivityRecord } from './api-client';
import type { ActivityFeedItem } from '../components/Collaboration';

export interface ActivityMessageFormatterOptions {
    t: TFunction;
    activity: ApiActivityRecord;
    splitTitle: string;
}

/**
 * Formats activity messages using translation keys for localization.
 * Maps backend activity types to translation keys and interpolation data.
 */
export function formatActivityMessage({
    t,
    activity,
    splitTitle,
}: ActivityMessageFormatterOptions): ActivityFeedItem {
    const metadataTitle =
        typeof activity.metadata.title === 'string' ? activity.metadata.title : splitTitle;
    const amount =
        typeof activity.metadata.amount === 'number' || typeof activity.metadata.amount === 'string'
            ? normalizeDecimal(activity.metadata.amount as number | string)
            : 0;
    const actor =
        typeof activity.metadata.actorName === 'string'
            ? activity.metadata.actorName
            : t('activityFeed.someone');

    const translationKey = getActivityTranslationKey(activity.activityType);
    const translationParams = getActivityTranslationParams(
        activity.activityType,
        metadataTitle,
        amount,
    );

    const message = t(translationKey, translationParams);
    const activityType = getActivityFeedType(activity.activityType);

    return {
        id: activity.id,
        type: activityType,
        userName: actor,
        message,
        timestamp: activity.createdAt,
        splitId: activity.splitId,
    };
}

function getActivityTranslationKey(activityType: string): string {
    switch (activityType) {
        case 'split_created':
            return 'activityFeed.splitCreated';
        case 'payment_made':
            return 'activityFeed.paymentMade';
        case 'payment_received':
            return 'activityFeed.paymentReceived';
        case 'split_completed':
            return 'activityFeed.splitCompleted';
        case 'split_edited':
            return 'activityFeed.splitEdited';
        default:
            return 'activityFeed.generic';
    }
}

function getActivityTranslationParams(
    activityType: string,
    metadataTitle: string,
    amount: number,
): Record<string, string | number> {
    const params: Record<string, string | number> = { title: metadataTitle };
    
    if (activityType === 'payment_made' && amount > 0) {
        params.amount = amount.toFixed(2);
    }
    
    return params;
}

function getActivityFeedType(activityType: string): ActivityFeedItem['type'] {
    switch (activityType) {
        case 'payment_made':
        case 'payment_received':
        case 'split_completed':
            return 'payment-status';
        case 'split_edited':
            return 'item-updated';
        default:
            return 'custom';
    }
}
