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
    Close as CloseIcon
} from "@mui/icons-material";

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

    const handleLogout = () => {
        localStorage.removeItem("student_info");
        localStorage.removeItem("student_id");
        router.push("/student/login");
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const navItems = [
        { label: "Dashboard", path: "/student/dashboard" },
        { label: "My Course", path: "/student/courses" },
        { label: "Tests", path: "#" },
        { label: "Results", path: "#" },
        { label: "My profile", path: "/student/profile" },
    ];

    return (
        <nav className={styles.navbar}>
            <div className={styles.navBrand}>
                <Link href="/student/dashboard" className={styles.logo}>
                    🎓 Student Portal
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
                    <div className={styles.searchBar}>
                        <SearchIcon style={{ color: '#94a3b8', fontSize: 18 }} />
                        <input type="text" placeholder="Search..." className={styles.searchInput} />
                    </div>
                    <button className={styles.logout} onClick={handleLogout}>
                        <LogoutIcon fontSize="small" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            <div className={styles.actions}>
                <div className={styles.searchBar}>
                    <SearchIcon style={{ color: '#94a3b8', fontSize: 18 }} />
                    <input type="text" placeholder="Search..." className={styles.searchInput} />
                </div>

                <button className={styles.iconBtn}>
                    <BellIcon />
                    <span className={styles.badge}></span>
                </button>

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
