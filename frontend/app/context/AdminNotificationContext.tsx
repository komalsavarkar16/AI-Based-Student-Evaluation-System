"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/app/utils/api";

export interface AdminNotification {
  _id: string;
  type: "video_test_evaluation";
  studentId: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  message?: string;
  score: number;
  status: "unread" | "read";
  isRead: boolean;
  timestamp: string;
}

interface AdminNotificationContextType {
  notifications: AdminNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export const AdminNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const info = localStorage.getItem("admin_info");
      if (!info) {
          setNotifications([]);
          setLoading(false);
          return;
      }
      
      const res = await fetch(`${API_BASE_URL}/admin/notifications`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch admin notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/notifications/${notificationId}/read`, {
        method: "PUT",
        credentials: "include"
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true, status: "read" } : n))
        );
        // Refresh to ensure sync with backend
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark admin notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/notifications/read-all`, {
        method: "PUT",
        credentials: "include"
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, status: "read" })));
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark all admin notifications as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optional: Add polling
    const interval = setInterval(fetchNotifications, 60000); // 1 min for admin
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AdminNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifications,
        loading,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
};

export const useAdminNotifications = () => {
  const context = useContext(AdminNotificationContext);
  if (context === undefined) {
    throw new Error("useAdminNotifications must be used within an AdminNotificationProvider");
  }
  return context;
};
