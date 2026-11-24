import { useState, useEffect, useRef, useCallback } from 'react';
import { AttendanceEvent } from '../../../shared/types/attendance';

export type WebSocketStatus = 'connected' | 'connecting' | 'disconnected';

export function useAttendanceWebSocket() {
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<AttendanceEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const connect = useCallback(() => {
    // Avoid reconnecting if already open or connecting
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    if (!isMountedRef.current) return;
    setStatus('connecting');

    // Connect directly to backend port 8000 to avoid Vite HMR proxy collision
    const host = window.location.hostname || '127.0.0.1';
    const wsUrl = `ws://${host}:8000/ws/attendance`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus('connected');

        // Ping every 25 seconds for keepalive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        if (event.data === 'pong') return;

        try {
          const parsed: AttendanceEvent = JSON.parse(event.data);
          if (parsed && parsed.employee_id) {
            setLatestEvent(parsed);
            setEvents((prev) => [parsed, ...prev.slice(0, 49)]);
          }
        } catch {
          // Ignore non-json
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Reconnect after 3 seconds without tight spamming
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      if (isMountedRef.current) {
        setStatus('disconnected');
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    status,
    events,
    latestEvent,
    reconnect: connect,
  };
}
