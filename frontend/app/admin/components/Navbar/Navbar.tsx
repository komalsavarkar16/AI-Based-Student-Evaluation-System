'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { BrainCircuit } from 'lucide-react';
import { API_BASE_URL } from "@/app/utils/api";
import { useAdminNotifications } from "@/app/context/AdminNotificationContext";
import BellIcon from "@mui/icons-material/NotificationsNone";
import BellActiveIcon from "@mui/icons-material/NotificationsActive";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const menuItems = [
    { label: "Students", path: "/admin/students" },
    { label: "Courses", path: "/admin/courses" },
    { label: "Evaluations", path: "/admin/evaluations" },
    { label: "Announcements", path: "/admin/announcements" },
    { label: "Export", path: "/admin/export" },
    { label: "Profile", path: "/admin/profile" },
    { label: "Settings", path: "/admin/settings" },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = React.useRef<HTMLDivElement>(null);

    // Close notifications on outside click
    React.useEffect(() => {
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
            await fetch(`${API_BASE_URL}/admin/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error("Logout failed:", error);
        }
        localStorage.removeItem("role");
        localStorage.removeItem("admin_info");
        router.push("/admin/login");
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleNotificationClick = async (notifId: string, isRead: boolean) => {
        if (!isRead) {
            await markAsRead(notifId);
        }
        setShowNotifications(false);
        // Navigate to the evaluation page (since evaluations triggered the notification)
        router.push("/admin/evaluations");
    };

    const unreadNotifications = notifications.filter(n => !n.isRead);
    const recentNotifications = unreadNotifications.slice(0, 5);

    return (
        <nav className={styles.navbar}>
            <div className={styles.navBrand}>
                <Link href="/admin" className={styles.logo}>
                    <div className={styles.logoIcon}>AI</div>
                    <span className={styles.logoText}>SkillBridge AI</span>
                </Link>
                
                <div className={styles.mobileNavGroup}>
                    <div className={styles.notificationWrapper} ref={notificationRef}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setShowNotifications(!showNotifications)}
                            title="Notifications"
                        >
                            {unreadCount > 0 ? <BellActiveIcon sx={{ color: '#38a3a5' }} /> : <BellIcon />}
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
                                            <p>No new evaluations</p>
                                            <span>You'll be alerted when students complete tests</span>
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
                                                    <p className={styles.notifMessage}>
                                                        <strong>{notif.studentName}</strong> completed evaluation for {notif.courseTitle}
                                                    </p>
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
                                    href="/admin/evaluations"
                                    className={styles.viewAllBtn}
                                    onClick={() => setShowNotifications(false)}
                                >
                                    View all evaluations
                                </Link>
                            </div>
                        )}
                    </div>
                    <button className={styles.hamburger} onClick={toggleMenu}>
                        {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                    </button>
                </div>
            </div>

            <div className={`${styles.navLinks} ${isMenuOpen ? styles.navLinksMobile : ''}`}>
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`${styles.menuItem} ${pathname === item.path ? styles.active : ''}`}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {item.label}
                    </Link>
                ))}
                <div className={styles.mobileActions}>
                    <button className={styles.logout} onClick={handleLogout}>
                        <LogoutIcon fontSize="small" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <div className={styles.actions}>
                <button className={styles.logout} onClick={handleLogout}>
                    <LogoutIcon fontSize="small" />
                    <span>Logout</span>
                </button>
            </div>
        </nav>
    );
}
