"use client";
import React, { useState, useEffect } from "react";
import styles from "./notifications.module.css";
import {
    Bell, CheckCircle, Info, AlertTriangle,
    XOctagon, Clock, BookOpen, ChevronRight, X
} from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";
import { useRouter } from "next/navigation";
import { useNotifications, Notification } from "@/app/context/NotificationContext";


export default function StudentNotificationsPage() {
    const router = useRouter();
    const { notifications, markAsRead: markAsReadGlobal, refreshNotifications } = useNotifications();
    const [loading, setLoading] = useState(true);
    const [studentInfo, setStudentInfo] = useState<any>(null);

    useEffect(() => {
        const info = localStorage.getItem("student_info");
        if (info) {
            setStudentInfo(JSON.parse(info));
        }
        // Data is now handled by NotificationContext
        setLoading(false);
    }, []);

    const markAsRead = async (notificationId: string, isRead: boolean) => {
        if (isRead) return; // Already read
        try {
            await markAsReadGlobal(notificationId);
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const getCardClass = (decision?: string, type?: string) => {
        if (type === "announcement") return styles.cardAnnouncement;
        if (decision === "Approved") return styles.cardSuccess;
        if (decision === "Bridge Course Recommended") return styles.cardInfo;
        if (decision === "Retry Required") return styles.cardWarning;
        return styles.notificationCard;
    };

    const getIconClass = (decision?: string, type?: string) => {
        if (type === "announcement") return styles.iconAnnouncement;
        if (decision === "Approved") return styles.iconSuccess;
        if (decision === "Bridge Course Recommended") return styles.iconInfo;
        if (decision === "Retry Required") return styles.iconWarning;
        return styles.iconInfo;
    };

    const getIconForDecision = (decision?: string, type?: string) => {
        if (type === "announcement") return <Bell className={getIconClass(decision, type)} size={20} />;
        if (decision === "Approved") return <CheckCircle className={getIconClass(decision, type)} size={20} />;
        if (decision === "Bridge Course Recommended") return <BookOpen className={getIconClass(decision, type)} size={20} />;
        if (decision === "Retry Required") return <AlertTriangle className={getIconClass(decision, type)} size={20} />;

        return <Info className={styles.iconInfo} size={20} />;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    const handleAction = (e: React.MouseEvent, type: string) => {
        e.stopPropagation();
        if (type === "view_data") {
            router.push("/student");
        } else if (type === "view_changelog") {
            router.push("/student/courses");
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading your notifications...</p>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.headerArea}>
                <div className={styles.headerContent}>
                    <div className={styles.iconWrapper}>
                        <Bell size={28} className={styles.titleIcon} />
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                    </div>
                    <div className={styles.headerText}>
                        <h1 className={styles.pageTitle}>Notifications</h1>
                        <p className={styles.pageSubtitle}>Stay updated on your evaluations and course progress</p>
                    </div>
                </div>
            </div>

            <main className={styles.mainContainer}>
                {notifications.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIconCircle}>
                            <Bell size={48} className={styles.emptyIcon} />
                        </div>
                        <h3>You're all caught up!</h3>
                        <p>We'll notify you here as soon as your evaluations are reviewed.</p>
                    </div>
                ) : (
                    <div className={styles.notificationGrid}>
                        {notifications.map((notif) => (
                            <div
                                key={notif._id}
                                className={`${styles.notificationCard} ${getCardClass(notif.decision, notif.type)}`}
                                onClick={() => markAsRead(notif._id, notif.isRead)}
                            >
                                <div className={styles.typeIcon}>
                                    {getIconForDecision(notif.decision, notif.type)}
                                </div>

                                <div className={styles.contentArea}>
                                    <div className={styles.titleRow}>
                                        <h4 className={styles.courseTitle}>
                                            {notif.type === "announcement" ? (notif.title || "Announcement") : notif.courseTitle}
                                        </h4>
                                        <div className={styles.actionsRow}>
                                            <span className={styles.timestamp}>{formatDate(notif.timestamp)}</span>
                                            <X size={16} className={styles.closeIcon} onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                markAsRead(notif._id, notif.isRead);
                                            }} />
                                        </div>
                                    </div>

                                    <p className={styles.notifMessage}>{notif.message}</p>

                                    <div className={styles.actionsRow}>
                                        {notif.type === "announcement" ? (
                                            <button className={styles.actionBtn} onClick={(e) => handleAction(e, "view_changelog")}>
                                                View details
                                            </button>
                                        ) : (
                                            <>
                                                <button className={styles.actionBtn} onClick={(e) => handleAction(e, "view_data")}>
                                                    View results
                                                </button>
                                                <span className={styles.actionLink} onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notif._id, true);
                                                }}>
                                                    Ok, I got it
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {notif.notes && (
                                        <div className={styles.notesBox}>
                                            <div className={styles.notesHeader}>
                                                <Info size={14} />
                                                <strong>Feedback:</strong>
                                            </div>
                                            <p className={styles.notesText}>{notif.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
