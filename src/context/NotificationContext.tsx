import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/components/Toaster";

export interface NotificationItem {
  id: string;
  type: string;
  data: {
    title?: string;
    message?: string;
    [key: string]: any;
  };
  read_at: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  userId,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { addToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      // Adjusted to use apiRequest generic call for GET
      const data = await apiRequest<NotificationItem[]>(
        "/notifications/unread"
      );
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      // No one logged in yet (or just logged out) — clear stale
      // notifications from a previous session instead of showing them.
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    fetchNotifications();

    // Poll every 60 seconds for updates
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  const markAsRead = async () => {
    try {
      // Adjusted to use apiRequest with method: "POST"
      await apiRequest("/notifications/mark-read", {
        method: "POST",
      });

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
    } catch (error) {
      addToast(
        "error",
        "Action Failed",
        "Could not mark notifications as read."
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
