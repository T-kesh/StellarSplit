import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { PresenceUser, ActivityEvent, ConflictInfo, CollaborationState, SplitUpdate } from '../../types/collaboration';
import { BASE_API_URL } from '../../constants/api';

export interface CollaborationContextType extends CollaborationState {
    joinSplit: (splitId: string, user: Partial<PresenceUser>) => void;
    leaveSplit: () => void;
    setTyping: (isTyping: boolean) => void;
    sendUpdate: (update: Omit<SplitUpdate, 'timestamp'>) => void;
    resolveConflict: (field: string, resolution: 'local' | 'remote' | 'merge') => void;
    updateCursor: (x: number, y: number) => void;
}

export const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function CollaborationProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [presence, setPresence] = useState<Record<string, PresenceUser>>({});
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

    const currentSplitId = useRef<string | null>(null);
    const currentUser = useRef<Partial<PresenceUser>>({});

    useEffect(() => {
        const url = new URL(BASE_API_URL.startsWith('http') ? BASE_API_URL : window.location.origin);     
        const socketUrl = `${url.protocol}//${url.host}`;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

        const newSocket = io(socketUrl, {
            path: '/socket.io',
            auth: { token }, 
            autoConnect: true,
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            setConnected(true);
            if (currentSplitId.current) {
                newSocket.emit('join_split', { 
                    splitId: currentSplitId.current,
                    user: currentUser.current 
                });
            }
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
        });

        // --- Protocol Alignment: Presence & Activity ---
        newSocket.on('participant_joined', (user: PresenceUser) => {
            setPresence((prev) => ({ ...prev, [user.userId]: user }));
        });

        newSocket.on('participant_left', (userId: string) => {
            setPresence((prev) => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        });

        newSocket.on('split_activity', (activity: ActivityEvent) => {
            setActivities((prev) => [activity, ...prev].slice(0, 50));
        });

        newSocket.on('split_updated', (update: any) => {
            console.log('Received split update:', update);
        });

        // Listen for cursor movements from others
        newSocket.on('cursor_updated', ({ userId, coords }: { userId: string, coords: { x: number, y: number } }) => {
            setPresence((prev) => ({
                ...prev,
                [userId]: { ...prev[userId], cursor: coords }
            }));
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const joinSplit = useCallback((splitId: string, user: Partial<PresenceUser>) => {
        currentSplitId.current = splitId;
        currentUser.current = user;

        if (socket && socket.connected) {
            socket.emit('join_split', { splitId, user });
        }
    }, [socket]);

    const leaveSplit = useCallback(() => {
        if (socket && currentSplitId.current) {
            socket.emit('leave_split', { splitId: currentSplitId.current });
        }
        currentSplitId.current = null;
        setPresence({});
        setActivities([]);
    }, [socket]);

    const setTyping = useCallback((isTyping: boolean) => {
        if (socket && currentSplitId.current) {
            socket.emit('split_activity', {
                splitId: currentSplitId.current,
                activity: { 
                    type: 'custom', 
                    message: isTyping ? 'is typing...' : '', 
                    isTyping, 
                    userId: currentUser.current?.userId 
                }
            });
        }
    }, [socket]);

    const sendUpdate = useCallback((update: Omit<SplitUpdate, 'timestamp'>) => {
        if (socket && currentSplitId.current) {
            const fullUpdate: SplitUpdate = { ...update, timestamp: new Date() };
            socket.emit('split_activity', { splitId: currentSplitId.current, activity: fullUpdate });
        }
    }, [socket]);

    const resolveConflict = useCallback((field: string, _resolution: 'local' | 'remote' | 'merge') => {    
        setConflicts((prev) => prev.filter(c => c.field !== field));
    }, []);

    const updateCursor = useCallback((x: number, y: number) => {
        if (socket && currentSplitId.current) {
            socket.emit('cursor_move', {
                splitId: currentSplitId.current,
                userId: currentUser.current?.userId,
                coords: { x, y }
            });
        }
    }, [socket]);

    const value: CollaborationContextType = {
        connected,
        presence,
        activities,
        conflicts,
        joinSplit,
        leaveSplit,
        setTyping,
        sendUpdate,
        resolveConflict,
        updateCursor,
    };

    return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>;
}
