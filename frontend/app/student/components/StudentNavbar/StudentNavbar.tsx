"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './StudentNavbar.module.css';
import {
    Logout as LogoutIcon,
    Search as SearchIcon,
    NotificationsNone as BellIcon,
    Menu as MenuIcon,
    Close as CloseIcon,
    School as SchoolIcon,
    ChevronRight as ChevronRightIcon,
    NotificationsActive as BellActiveIcon
} from "@mui/icons-material";
import { API_BASE_URL } from "@/app/utils/api";
import { useNotifications } from "@/app/context/NotificationContext";

export default function StudentNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [studentName, setStudentName] = useState("Student");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const storedInfo = localStorage.getItem("student_info");
        if (storedInfo) {
            try {
                const parsed = JSON.parse(storedInfo);
                if (parsed.firstName) {
                    setStudentName(`${parsed.firstName} ${parsed.lastName}`);
                }
            } catch (e) {
                console.error("Failed to parse user info", e);
            }
        }
    }, []);

    // Close notifications on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/student/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error("Logout failed:", error);
        }
        localStorage.removeItem("student_info");
        localStorage.removeItem("student_id");
        localStorage.removeItem("auth_token");
        router.push("/student/login");
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleNotificationClick = async (notifId: string, isRead: boolean) => {
        if (!isRead) {
            await markAsRead(notifId);
        }
        setShowNotifications(false);
        router.push("/student/notifications");
    };

    const navItems = [
        { label: "Courses", path: "/student/courses" },
        { label: "Tests", path: "/student/tests" },
        { label: "Results", path: "/student/results" },
        { label: "My profile", path: "/student/profile" },
    ];

    // Get up to 5 unread notifications for the modal
    const unreadNotifications = notifications.filter(n => !n.isRead);
    const recentNotifications = unreadNotifications.slice(0, 5);

    return (
        <nav className={styles.navbar}>
            <div className={styles.navBrand}>
                <Link href="/student" className={styles.logo}>
                    <div className={styles.logoIcon}>AI</div>
                    <span className={styles.logoText}>SkillBridge AI</span>
                </Link>
                <button className={styles.hamburger} onClick={toggleMenu}>
                    {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
            </div>

            <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksMobile : ''}`}>
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.path}
                        className={`${styles.menuItem} ${pathname === item.path ? styles.active : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <span>{item.label}</span>
                    </Link>
                ))}

                <div className={styles.mobileActions}>
                    <div className={styles.mobileUtility}>
                        <Link href="/student/notifications" className={styles.iconBtn} onClick={() => setIsMenuOpen(false)}>
                            {unreadCount > 0 ? <BellActiveIcon sx={{ color: '#ef4444' }} /> : <BellIcon />}
                            {unreadCount > 0 && <span className={styles.badge}></span>}
                        </Link>
                        <Link href="/student/profile" className={styles.profilePic} onClick={() => setIsMenuOpen(false)}>
                            {studentName.charAt(0).toUpperCase()}
                        </Link>
                    </div>

                    <button className={styles.logout} onClick={handleLogout}>
                        <LogoutIcon fontSize="small" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <div className={styles.actions}>
                <div className={styles.notificationWrapper} ref={notificationRef}>
                    <button
                        className={styles.iconBtn}
                        onClick={() => setShowNotifications(!showNotifications)}
                        title="Notifications"
                    >
                        {unreadCount > 0 ? <BellActiveIcon sx={{ color: '#8c52ff' }} /> : <BellIcon />}
                        {unreadCount > 0 && <span className={styles.badge}></span>}
                    </button>

                    {showNotifications && (
                        <div className={styles.notificationPopover}>
                            <div className={styles.popoverHeader}>
                                <div className={styles.headerLeft}>
                                    <h3>Notifications</h3>
                                    {unreadCount > 0 && <span className={styles.unreadCountLabel}>{unreadCount} new</span>}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        className={styles.clearAllBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAllAsRead();
                                        }}
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            <div className={styles.popoverList}>
                                {unreadCount === 0 ? (
                                    <div className={styles.emptyPopover}>
                                        <BellIcon sx={{ fontSize: 40, opacity: 0.1, mb: 1, color: '#94a3b8' }} />
                                        <p>No new notifications</p>
                                        <span>We'll let you know when something arrives</span>
                                    </div>
                                ) : (
                                    recentNotifications.map((notif) => (
                                        <div
                                            key={notif._id}
                                            className={`${styles.popoverItem} ${!notif.isRead ? styles.unreadItem : ''}`}
                                            onClick={() => handleNotificationClick(notif._id, notif.isRead)}
                                        >
                                            <div className={styles.notifDot}></div>
                                            <div className={styles.notifContent}>
                                                <p className={styles.notifMessage}>{notif.message}</p>
                                                <span className={styles.notifTime}>
                                                    {new Date(notif.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <ChevronRightIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
                                        </div>
                                    ))
                                )}
                            </div>

                            <Link
                                href="/student/notifications"
                                className={styles.viewAllBtn}
                                onClick={() => setShowNotifications(false)}
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>

                <Link href="/student/profile" className={styles.profilePic} title={studentName}>
                    {studentName.charAt(0).toUpperCase()}
                </Link>

                <button className={styles.logout} onClick={handleLogout}>
                    <LogoutIcon fontSize="small" />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    );
}
