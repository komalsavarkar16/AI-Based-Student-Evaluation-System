"use client";
import React, { useState, useEffect } from "react";
import styles from "./notifications.module.css";
import {
    Bell, CheckCircle, Info, AlertTriangle,
    XOctagon, Clock, BookOpen, ChevronRight
} from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";
import { useRouter } from "next/navigation";

interface Notification {
    _id: string;
    type: string;
    studentId: string;
    courseId?: string;
    courseTitle: string;
    decision?: string;
    message: string;
    notes?: string;
    isRead: boolean;
    timestamp: string;
}

export default function StudentNotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentInfo, setStudentInfo] = useState<any>(null);

    useEffect(() => {
        const info = localStorage.getItem("student_info");
        if (info) {
            const parsed = JSON.parse(info);
            setStudentInfo(parsed);
            fetchNotifications(parsed.id);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchNotifications = async (studentId: string) => {
        try {
            const res = await fetch(`${API_BASE_URL}/student/notifications/${studentId}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            } else {
                toast.error("Failed to fetch notifications");
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            toast.error("Network error while fetching notifications");
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (notificationId: string, isRead: boolean) => {
        if (isRead) return; // Already read

        try {
            const res = await fetch(`${API_BASE_URL}/student/notifications/${notificationId}/read`, {
                method: "PUT"
            });
            if (res.ok) {
                // Instantly update UI instead of waiting for refetch
                setNotifications(prev => prev.map(n =>
                    n._id === notificationId ? { ...n, isRead: true } : n
                ));
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const getIconForDecision = (decision?: string, type?: string) => {
        if (decision === "Approved") return <CheckCircle className={styles.iconGreen} size={24} />;
        if (decision === "Bridge Course Recommended") return <BookOpen className={styles.iconBlue} size={24} />;
        if (decision === "Retry Required") return <XOctagon className={styles.iconRed} size={24} />;

        return <Info className={styles.iconGray} size={24} />;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
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
                                className={`${styles.notificationCard} ${!notif.isRead ? styles.unread : ''}`}
                                onClick={() => markAsRead(notif._id, notif.isRead)}
                            >
                                <div className={styles.cardIndicator} />
                                <div className={styles.cardHeader}>
                                    <div className={styles.titleArea}>
                                        <div className={styles.typeIcon}>
                                            {getIconForDecision(notif.decision, notif.type)}
                                        </div>
                                        <h4 className={styles.courseTitle}>{notif.courseTitle}</h4>
                                    </div>
                                    <span className={styles.timestamp}>
                                        <Clock size={14} className={styles.timeIcon} />
                                        {formatDate(notif.timestamp)}
                                    </span>
                                </div>

                                <div className={styles.cardBody}>
                                    <p className={styles.notifMessage}>{notif.message}</p>

                                    {notif.notes && (
                                        <div className={styles.notesBox}>
                                            <div className={styles.notesHeader}>
                                                <Info size={14} />
                                                <strong>Feedback from Evaluator:</strong>
                                            </div>
                                            <p className={styles.notesText}>{notif.notes}</p>
                                        </div>
                                    )}
                                </div>
                                {!notif.isRead && (
                                    <div className={styles.unreadBadgeWrapper}>
                                        <span className={styles.unreadText}>New</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
