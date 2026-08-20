import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(onEvent) {
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Socket connected
    });

    if (onEvent) {
      Object.entries(onEvent).forEach(([eventName, handler]) => {
        socket.on(eventName, handler);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}

export default useSocket;
