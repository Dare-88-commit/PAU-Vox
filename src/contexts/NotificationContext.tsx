import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { apiRequest } from "../lib/api";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: Date;
  feedbackId?: string;
  actionUrl?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
  refreshNotifications: () => Promise<void>;
}

type BackendNotification = {
  id: string;
  user_id: string;
  feedback_id?: string | null;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  created_at: string;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function mapNotification(item: BackendNotification): Notification {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    type: item.type,
    read: item.read,
    createdAt: new Date(item.created_at),
    feedbackId: item.feedback_id || undefined,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshNotifications = async () => {
    if (!token) {
      setNotifications([]);
      return;
    }
    try {
      const rows = await apiRequest<BackendNotification[]>("/notifications", { token });
      setNotifications(rows.map(mapNotification));
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    void refreshNotifications();
  }, [token]);

  const addNotification = (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const optimistic: Notification = {
      ...notification,
      id: `local-${Date.now()}`,
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) => [optimistic, ...prev]);

    switch (notification.type) {
      case "success":
        toast.success(notification.title, { description: notification.message });
        break;
      case "error":
        toast.error(notification.title, { description: notification.message });
        break;
      case "warning":
        toast.warning(notification.title, { description: notification.message });
        break;
      default:
        toast.info(notification.title, { description: notification.message });
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) {
      return;
    }
    await apiRequest<{ message: string }>(`/notifications/${id}/read`, {
      method: "PATCH",
      token,
    });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!token) {
      return;
    }
    await apiRequest<{ message: string }>("/notifications/read-all", {
      method: "PATCH",
      token,
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
