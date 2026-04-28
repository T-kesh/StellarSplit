import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Share2, ChevronLeft, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { SplitHeader } from '../../components/Split/SplitHeader';
import { ParticipantList } from '../../components/Split/ParticipantList';
import { ItemList } from '../../components/Split/ItemList';
import {
    ReceiptCaptureFlow,
    ReceiptImage,
    type ParsedItem,
} from '../../components/Receipt';
import { PaymentButton } from '../../components/Payment/PaymentButton';
import { PaymentModal } from '../../components/Payment/PaymentModal';
import { ShareModal } from '../../components/Split/ShareModal';
import { signAndSubmitPayment } from '../../utils/stellar/wallet';
import { LoadingSkeleton } from '../../components/Split/LoadingSkeleton';
import { useCollaboration } from '../../hooks/useCollaboration';
import { ConflictResolver, LiveActivityFeed, PresenceIndicator, type ActivityFeedItem } from '../../components/Collaboration';
import type { Participant, Split } from '../../types';
import { useTranslation } from 'react-i18next';
import type { ParsedStellarPaymentURI } from '../../utils/stellar/paymentUri';
import { useWallet } from '../../hooks/use-wallet';
import {
    createActivityRecord,
    createItem,
    deleteItem,
    getApiErrorMessage,
    normalizeDecimal,
    submitSplitPayment,
    updateSplit,
} from '../../utils/api-client';
import { splitDetailRepository } from '../../services/splitDetailRepository';


export const SplitDetailPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id: splitId } = useParams();
    const {
        activeUserId,
        canTransact,
        horizonUrl,
        networkPassphrase,
        publicKey,
        signTransaction,
    } = useWallet();
    const [split, setSplit] = useState<Split | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isNotFound, setIsNotFound] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [showReceiptUpload, setShowReceiptUpload] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
    const [activityItems, setActivityItems] = useState<ActivityFeedItem[]>([]);

    const { joinSplit, leaveSplit, sendUpdate, updateCursor, presence } = useCollaboration();

    const loadSplit = useCallback(async () => {
        if (!splitId) {
            setIsNotFound(true);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setLoadError(null);
        setIsNotFound(false);

        try {
            const viewModel = await splitDetailRepository.getSplitDetail(splitId, {
                currentUserId: activeUserId,
                t,
            });

            setSplit(viewModel.split);
            setActivityItems(viewModel.activityItems);
        } catch (error) {
            const message = getApiErrorMessage(error);
            if (message.toLowerCase().includes('not found')) {
                setIsNotFound(true);
            } else {
                setLoadError(message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [activeUserId, splitId]);

    // Track local cursor
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            updateCursor(e.clientX, e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [updateCursor]);

    useEffect(() => {
        void loadSplit();
    }, [loadSplit]);

    useEffect(() => {
        if (!split || !activeUserId) {
            return;
        }

        joinSplit(split.id, {
            userId: activeUserId,
            name: publicKey === activeUserId ? t('common.you') : shortId(activeUserId),
            activeView: 'split-details',
        });

        return () => {
            leaveSplit();
        };
    }, [activeUserId, joinSplit, leaveSplit, publicKey, split, t]);

    const currentUser = useMemo(
        () => split?.participants.find((participant) => participant.isCurrentUser) ?? null,
        [split],
    );
    const shouldShowPayment = !!currentUser && (currentUser.amountDue ?? currentUser.amountOwed) > 0 && !!split?.creatorWalletAddress;

    const setToastState = (status: 'idle' | 'success' | 'error', message?: string) => {
        setPaymentStatus(status);
        setPaymentMessage(message ?? null);
    };

    const processPayment = useCallback(async (
        destination: string,
        amount: number,
        scannedPayment?: ParsedStellarPaymentURI,
    ) => {
        if (!split || !currentUser || !publicKey) {
            throw new Error('Connect your wallet before paying this split.');
        }

        if (!canTransact) {
            throw new Error('Resolve your wallet network before paying this split.');
        }

        setIsProcessingPayment(true);

        try {
            const result = await signAndSubmitPayment({
                amount,
                destination,
                sourceAccount: publicKey,
                networkPassphrase,
                horizonUrl,
                memo: split.id.slice(0, 28),
                memoType: 'text',
                signTransaction,
            });

            if (!result.success || !result.txHash) {
                throw new Error(result.error ?? 'Payment submission failed.');
            }

            const confirmation = await submitSplitPayment({
                splitId: split.id,
                participantId: currentUser.id,
                stellarTxHash: result.txHash,
            });

            if (!confirmation.success) {
                throw new Error(confirmation.message);
            }

            await createActivityRecord({
                userId: activeUserId ?? publicKey,
                activityType: 'payment_made',
                splitId: split.id,
                metadata: {
                    actorName: t('common.you'),
                    title: split.title,
                    amount,
                    currency: split.currency,
                    txHash: result.txHash,
                },
            }).catch(() => undefined);

            if (split.creatorWalletAddress && split.creatorWalletAddress !== (activeUserId ?? publicKey)) {
                await createActivityRecord({
                    userId: split.creatorWalletAddress,
                    activityType: 'payment_received',
                    splitId: split.id,
                    metadata: {
                        actorName: t('common.you'),
                        title: split.title,
                        amount,
                        currency: split.currency,
                        txHash: result.txHash,
                    },
                }).catch(() => undefined);
            }

            sendUpdate({
                type: 'payment-status',
                payload: {
                    status: 'paid',
                    amount,
                    destination,
                    txHash: result.txHash,
                    scanned: Boolean(scannedPayment),
                },
                userId: activeUserId ?? publicKey,
            });

            await loadSplit();
            setToastState('success', confirmation.message);
            window.setTimeout(() => {
                setIsPaymentModalOpen(false);
                setToastState('idle');
            }, 1800);
        } catch (error) {
            const message = getApiErrorMessage(error);
            setToastState('error', message);
            window.setTimeout(() => setToastState('idle'), 3200);
            throw error;
        } finally {
            setIsProcessingPayment(false);
        }
    }, [
        activeUserId,
        canTransact,
        currentUser,
        horizonUrl,
        loadSplit,
        networkPassphrase,
        publicKey,
        sendUpdate,
        signTransaction,
        split,
        t,
    ]);

    const handlePayment = async () => {
        if (!split?.creatorWalletAddress || !currentUser) {
            return;
        }

        await processPayment(
            split.creatorWalletAddress,
            currentUser.amountDue ?? currentUser.amountOwed,
        );
    };

    const handleScannedPayment = async (payment: ParsedStellarPaymentURI) => {
        if (!currentUser) {
            throw new Error('You are not part of this split.');
        }

        if (payment.splitId && payment.splitId !== split?.id) {
            throw new Error('This QR code belongs to a different split.');
        }

        const amount = payment.amount ?? currentUser.amountDue ?? currentUser.amountOwed;
        if (amount <= 0) {
            throw new Error('Scanned payment does not include a valid amount.');
        }

        await processPayment(payment.destination, amount, payment);
    };

    const handleReceiptApply = async ({
        items,
        receiptTotal,
    }: {
        imageUrl?: string;
        items: ParsedItem[];
        receiptTotal: number;
    }) => {
        if (!split) {
            return;
        }

        const currentItems = split.items ?? [];
        await Promise.all([
            ...currentItems
                .filter((item) => item.id)
                .map((item) => deleteItem(item.id as string)),
            ...items.map((item) =>
                createItem({
                    splitId: split.id,
                    name: item.name.trim(),
                    quantity: Math.max(1, item.quantity),
                    unitPrice: item.price,
                    totalPrice: roundCurrency(item.quantity * item.price),
                    assignedToIds: [],
                }),
            ),
            updateSplit(split.id, {
                totalAmount: receiptTotal > 0 ? receiptTotal : split.totalAmount,
            }),
        ]);

        if (activeUserId) {
            await createActivityRecord({
                userId: activeUserId,
                activityType: 'split_edited',
                splitId: split.id,
                metadata: {
                    actorName: t('common.you'),
                    title: split.title,
                    itemCount: items.length,
                    totalAmount: receiptTotal,
                    source: 'receipt-review',
                },
            }).catch(() => undefined);
        }

        sendUpdate({
            type: 'item-updated',
            payload: {
                total: receiptTotal,
                itemCount: items.length,
            },
            userId: activeUserId ?? 'viewer',
        });

        await loadSplit();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 pt-16">
                <LoadingSkeleton />
            </div>
        );
    }

    if (isNotFound || !split) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-20">
                <div className="mx-auto max-w-xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Split not found</h1>
                    <p className="mt-3 text-sm text-gray-600">
                        This link does not match an existing split, or the split has been removed.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
                        >
                            Back to dashboard
                        </button>
                        <button
                            type="button"
                            onClick={() => void loadSplit()}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-20">
                <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900">Could not load this split</h1>
                    <p className="mt-3 text-sm text-red-700">{loadError}</p>
                    <button
                        type="button"
                        onClick={() => void loadSplit()}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                        <RefreshCw size={16} />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-32 md:pb-12">
            {paymentStatus !== 'idle' && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${paymentStatus === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {paymentStatus === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-bold">
                        {paymentMessage ?? (paymentStatus === 'success' ? t('common.settledSuccessfully') : t('common.paymentFailed'))}
                    </span>
                </div>
            )}

            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex justify-between items-center px-4 py-3 md:hidden">
                <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <span className="font-bold text-gray-900">{t('common.splitDetails')}</span>
                <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="p-2 -mr-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                >
                    <Share2 size={24} />
                </button>
            </div>

            <div className="max-w-lg mx-auto p-4 md:p-8">
                <div className="hidden md:flex justify-between items-center mb-8">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                    >
                        <div className="p-1 rounded-full bg-gray-100"><ChevronLeft size={20} /></div>
                        {t('common.backToDashboard')}
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void loadSplit()}
                            className="flex items-center gap-2 text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-bold transition-colors"
                        >
                            <RefreshCw size={18} /> Refresh
                        </button>
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="flex items-center gap-2 text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl font-bold transition-colors"
                        >
                            <Share2 size={18} /> {t('common.shareSplit')}
                        </button>
                    </div>
                </div>

                <SplitHeader split={split} />

                <div className="mb-6">
                    <PresenceIndicator />
                </div>

                <ReceiptImage imageUrl={split.receiptUrl} />

                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => setShowReceiptUpload((value) => !value)}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                        {showReceiptUpload ? 'Hide receipt review flow' : 'Scan or replace receipt'}
                    </button>
                    {showReceiptUpload && (
                        <div className="mt-3">
                            <ReceiptCaptureFlow
                                splitId={split.id}
                                currency={split.currency}
                                onApply={(result) => {
                                    void handleReceiptApply(result).catch((error) => {
                                        setToastState('error', getApiErrorMessage(error));
                                        window.setTimeout(() => setToastState('idle'), 3200);
                                    });
                                }}
                            />
                        </div>
                    )}
                </div>

                <ItemList
                    items={split.items || []}
                    currency={split.currency}
                />

                <ParticipantList
                    participants={split.participants}
                    currency={split.currency}
                />

                {shouldShowPayment && currentUser && (
                    <PaymentButton
                        amount={currentUser.amountDue ?? currentUser.amountOwed}
                        currency={split.currency}
                        onClick={() => setIsPaymentModalOpen(true)}
                    />
                )}

                <div className="mt-8">
                    <LiveActivityFeed activities={activityItems} />
                </div>
            </div>

            {shouldShowPayment && currentUser && split.creatorWalletAddress && (
                <PaymentModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => setIsPaymentModalOpen(false)}
                    amount={currentUser.amountDue ?? currentUser.amountOwed}
                    currency={split.currency}
                    destination={split.creatorWalletAddress}
                    splitId={split.id}
                    onConfirm={() => {
                        void handlePayment();
                    }}
                    onConfirmScannedPayment={handleScannedPayment}
                    isProcessing={isProcessingPayment}
                />
            )}

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                splitLink={`${window.location.origin}/split/${split.id}`}
            />

            <ConflictResolver />

            {Object.values(presence).map((user) => {
                if (!user.cursor || user.userId === activeUserId) return null;
                return (
                    <div
                        key={user.userId}
                        className="fixed pointer-events-none z-50 transition-all duration-75 ease-linear flex flex-col items-start gap-1"
                        style={{ left: user.cursor.x, top: user.cursor.y }}
                    >
                        <svg width="18" height="24" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 0L17.5 15H11.5L8.5 24L2.5 0Z" fill="#A855F7" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                        <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                            {user.name}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};
