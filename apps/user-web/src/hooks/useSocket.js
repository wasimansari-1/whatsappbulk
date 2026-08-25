import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let globalSocket = null;

export function getSocket() {
  return globalSocket;
}

export function useSocket(onEvent) {
  const socketRef = useRef(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const activeOrgId = localStorage.getItem('active_org_id');
    if (!token) return;

    const socket = io('/', {
      auth: {
        token,
        organizationId: activeOrgId
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;
    globalSocket = socket;

    socket.on('connect', () => {
      console.log('[Socket.IO] Connected to live messaging server. Socket ID:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });

    const standardEvents = [
      'conversation.message',
      'message.status',
      'message.edited',
      'message.deleted',
      'message.deleted_for_everyone',
      'conversation.typing',
      'contact.opt_out',
      'lead.new',
      'lead.created',
      'lead.updated',
      'campaign.new',
      'campaign.updated',
      'meta.synced',
      'dashboard.stats'
    ];

    standardEvents.forEach((evt) => {
      socket.on(evt, (...args) => {
        if (!onEventRef.current) return;
        if (typeof onEventRef.current === 'function') {
          onEventRef.current(evt, ...args);
        } else if (typeof onEventRef.current === 'object' && onEventRef.current[evt]) {
          onEventRef.current[evt](...args);
        }
      });
    });

    // Catch-all listener for any custom/dynamic events
    socket.onAny((event, ...args) => {
      if (!standardEvents.includes(event) && onEventRef.current) {
        if (typeof onEventRef.current === 'function') {
          onEventRef.current(event, ...args);
        } else if (typeof onEventRef.current === 'object' && onEventRef.current[event]) {
          onEventRef.current[event](...args);
        }
      }
    });

    return () => {
      socket.disconnect();
      if (globalSocket === socket) {
        globalSocket = null;
      }
    };
  }, []);

  return socketRef.current;
}

export default useSocket;
