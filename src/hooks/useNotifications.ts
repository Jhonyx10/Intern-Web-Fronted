import { useEffect, useState, useCallback } from 'react';
import { echo, type EvaluationNotificationPayload } from '../lib/echo';

export const useNotifications = (userId: number | null | undefined) => {
  const [notifications, setNotifications] = useState<EvaluationNotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;

    // Subscribe to private channel: App.Models.User.{userId}
    const channel = echo.private(`App.Models.User.${userId}`);

    // Listen for incoming broadcast notifications
    channel.notification((notification: EvaluationNotificationPayload) => {
      console.log('Real-time notification received:', notification);

      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    // Clean up channel listener when user logs out or component unmounts
    return () => {
      echo.leaveChannel(`App.Models.User.${userId}`);
    };
  }, [userId]);

  // Mark all local notifications as read
  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Clear specific notification from list
  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    notifications,
    unreadCount,
    markAllAsRead,
    clearNotification,
  };
};