import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

window.Pusher = Pusher;

export interface EvaluationNotificationPayload {
  id: string;
  evaluation_id: number;
  student_id: number;
  student_name: string;
  progress: number;
  message: string;
  action_url: string;
  read_at: string | null;
  created_at: string;
}

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;

if (!pusherKey) {
  console.error("VITE_PUSHER_APP_KEY is missing in your .env file!");
}

export const echo = new Echo({
  broadcaster: 'pusher',
  key: pusherKey || '',
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
  forceTLS: true,
  authorizer: (channel: { name: string }) => ({
    authorize: (socketId: string, callback: Function) => {
      const token = localStorage.getItem('token');

      fetch('http://localhost:8000/api/broadcasting/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({
          socket_id: socketId,
          channel_name: channel.name,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Auth failed with status ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          callback(false, data);
        })
        .catch((error) => {
          callback(true, error);
        });
    },
  }),
});