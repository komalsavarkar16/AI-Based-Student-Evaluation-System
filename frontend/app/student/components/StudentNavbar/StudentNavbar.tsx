"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './StudentNavbar.module.css';
import {
    Logout as LogoutIcon,
    Search as SearchIcon,
    NotificationsNone as BellIcon,
    Menu as MenuIcon,
    Close as CloseIcon,
    School as SchoolIcon
} from "@mui/icons-material";
import { API_BASE_URL } from "@/app/utils/api";

export default function StudentNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [studentName, setStudentName] = useState("Student");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    const navItems = [
        { label: "Courses", path: "/student/courses" },
        { label: "Tests", path: "/student/tests" },
        { label: "Results", path: "/student/results" },
        { label: "My profile", path: "/student/profile" },
    ];

    return (
        <nav className={styles.navbar}>
            <div className={styles.navBrand}>
                <Link href="/student" className={styles.logo}>
                    <div className={styles.logoIcon}>AI</div>
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
                            <BellIcon />
                            <span className={styles.badge}></span>
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

                <Link href="/student/notifications" className={styles.iconBtn}>
                    <BellIcon />
                    <span className={styles.badge}></span>
                </Link>

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
