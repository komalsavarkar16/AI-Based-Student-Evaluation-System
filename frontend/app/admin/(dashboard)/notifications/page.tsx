"use client";

import React, { useState, useEffect } from "react";
import styles from "./notifications.module.css";
import {
    Bell, CheckCircle, Info, AlertTriangle,
    Eye, Clock, User, ChevronRight, X, Trash2, GraduationCap
} from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useAdminNotifications, AdminNotification } from "@/app/context/AdminNotificationContext";

export default function AdminNotificationsPage() {
    const router = useRouter();
    const { 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead, 
        refreshNotifications,
        loading 
    } = useAdminNotifications();

    const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

    const filteredNotifications = notifications.filter(n => {
        if (filter === "unread") return !n.isRead;
        if (filter === "read") return n.isRead;
        return true;
    });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const handleAction = (e: React.MouseEvent, notif: AdminNotification) => {
        e.stopPropagation();
        // Mark as read and Navigate to evaluations
        if (!notif.isRead) markAsRead(notif._id);
        router.push(`/admin/evaluations`);
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading admin alerts...</p>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.headerArea}>
                <div className={styles.headerContent}>
                    <div className={styles.iconWrapper}>
                        <Bell size={28} className={styles.titleIcon} />
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                    </div>
                    <div className={styles.headerText}>
                        <h1 className={styles.pageTitle}>Admin Notifications</h1>
                        <p className={styles.pageSubtitle}>Monitor student performance and recent video evaluations</p>
                    </div>
                </div>

                <div className={styles.headerActions}>
                    <div className={styles.filterGroup}>
                        <button 
                            className={`${styles.filterBtn} ${filter === 'all' ? styles.activeFilter : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All
                            <span className={styles.filterCount}>{notifications.length}</span>
                        </button>
                        <button 
                            className={`${styles.filterBtn} ${filter === 'unread' ? styles.activeFilter : ''}`}
                            onClick={() => setFilter('unread')}
                        >
                            Unread
                            <span className={styles.filterCount}>{unreadCount}</span>
                        </button>
                        <button 
                            className={`${styles.filterBtn} ${filter === 'read' ? styles.activeFilter : ''}`}
                            onClick={() => setFilter('read')}
                        >
                            Read
                            <span className={styles.filterCount}>{notifications.length - unreadCount}</span>
                        </button>
                    </div>
                    
                    {unreadCount > 0 && (
                        <button className={styles.markAllBtn} onClick={markAllAsRead}>
                            <CheckCircle size={16} />
                            Mark all as read
                        </button>
                    )}
                </div>
            </div>

            <main className={styles.mainContainer}>
                {filteredNotifications.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconCircle}>
                            <Bell size={48} className={styles.emptyIcon} />
                        </div>
                        <h3>No notifications found</h3>
                        <p>There are no current alerts matching your filter.</p>
                    </div>
                ) : (
                    <div className={styles.notificationGrid}>
                        {filteredNotifications.map((notif) => (
                            <div
                                key={notif._id}
                                className={`${styles.notificationCard} ${!notif.isRead ? styles.unreadCard : styles.readCard}`}
                                onClick={() => !notif.isRead && markAsRead(notif._id)}
                            >
                                <div className={styles.typeIcon}>
                                    <div className={styles.iconBackground}>
                                        <GraduationCap size={20} className={styles.itemIcon} />
                                    </div>
                                </div>

                                <div className={styles.contentArea}>
                                    <div className={styles.titleRow}>
                                        <div className={styles.notifTitle}>
                                            <h4>{notif.studentName}</h4>
                                            <span className={styles.courseTag}>{notif.courseTitle}</span>
                                        </div>
                                        <div className={styles.metaRow}>
                                            <span className={styles.timestamp}>{formatDate(notif.timestamp)}</span>
                                            {!notif.isRead && <div className={styles.unreadDot}></div>}
                                        </div>
                                    </div>

                                    <p className={styles.notifMessage}>
                                        {notif.message || `Evaluation completed for ${notif.courseTitle}. Student scored ${notif.score}/10.`}
                                    </p>

                                    <div className={styles.actionsRow}>
                                        <button className={styles.actionBtn} onClick={(e) => handleAction(e, notif)}>
                                            <Eye size={16} />
                                            View Report
                                        </button>
                                        
                                        {!notif.isRead && (
                                            <span className={styles.secondaryAction} onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notif._id);
                                            }}>
                                                Mark Read
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
