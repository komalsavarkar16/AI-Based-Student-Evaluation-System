'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Navbar.module.css';
import LogoutIcon from "@mui/icons-material/Logout";

const menuItems = [
    { label: "Dashboard", path: "/admin" },
    { label: "Students", path: "/admin/students" },
    { label: "Assessments", path: "/admin/assessments" },
    { label: "Courses", path: "/admin/courses" },
    { label: "AI Eval", path: "/admin/ai-evaluations" },
    { label: "Analytics", path: "/admin/analytics" },
    { label: "Reports", path: "/admin/reports" },
    { label: "Announce", path: "/admin/announcements" },
    { label: "Profile", path: "/admin/profile" },
    { label: "Settings", path: "/admin/settings" },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        router.push("/admin/login");
    };

    return (
        <nav className={styles.navbar}>
            <Link href="/admin" className={styles.logo}>
                🎓 Admin Panel
            </Link>

            <div className={styles.navLinks}>
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`${styles.menuItem} ${pathname === item.path ? styles.active : ''}`}
                    >
                        {item.label}
                    </Link>
                ))}
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
