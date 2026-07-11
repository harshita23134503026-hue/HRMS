import { useEffect, useRef } from 'react';
import { BASE_URL } from './Config';

const getToken = () => localStorage.getItem('token');

export default function useNotificationStream(onNotificationEvent, enabled = true) {
  const callbackRef = useRef(onNotificationEvent);

  useEffect(() => {
    callbackRef.current = onNotificationEvent;
  }, [onNotificationEvent]);

  useEffect(() => {
    if (!enabled) return undefined;

    const token = getToken();
    if (!token) return undefined;

    const streamUrl = `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    const handleEvent = (event) => {
      try {
        const payload = JSON.parse(event.data || '{}');
        if (typeof callbackRef.current === 'function') {
          callbackRef.current(payload, event.type);
        }
      } catch (error) {
        console.error('Notification stream event parse error:', error);
      }
    };

    eventSource.addEventListener('notification.created', handleEvent);
    eventSource.addEventListener('notification.updated', handleEvent);

    eventSource.onerror = (error) => {
      console.error('Notification stream disconnected:', error);
    };

    return () => {
      eventSource.removeEventListener('notification.created', handleEvent);
      eventSource.removeEventListener('notification.updated', handleEvent);
      eventSource.close();
    };
  }, [enabled]);
}