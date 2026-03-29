"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "@/app/utils/api";

export interface Notification {
  _id: string;
  type: "admin_decision" | "announcement";
  studentId: string;
  courseTitle: string;
  message: string;
  title?: string;
  isRead: boolean;
  timestamp: string;
  decision?: "Approved" | "Bridge Course Recommended" | "Retry Required";
  notes?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const info = localStorage.getItem("student_info");
      if (!info) {
          setNotifications([]);
          setLoading(false);
          return;
      }
      
      const studentId = JSON.parse(info).id;
      if (!studentId) return;

      const res = await fetch(`${API_BASE_URL}/student/notifications/${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const info = localStorage.getItem("student_info");
      if (!info) return;
      const studentId = JSON.parse(info).id;

      const res = await fetch(`${API_BASE_URL}/student/notifications/${notificationId}/read?student_id=${studentId}`, {
        method: "PUT",
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
        // Refresh to ensure sync with backend
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const info = localStorage.getItem("student_info");
      if (!info) return;
      const studentId = JSON.parse(info).id;

      const res = await fetch(`${API_BASE_URL}/student/notifications/${studentId}/read-all`, {
        method: "PUT",
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        await fetchNotifications();
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Optional: Add polling
    const interval = setInterval(fetchNotifications, 30000); // 30s
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NotificationContext.Provider
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
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
