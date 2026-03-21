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

const menuItems = [
    { label: "Students", path: "/admin/students" },
    { label: "Courses", path: "/admin/courses" },
    { label: "Evaluations", path: "/admin/evaluations" },
    { label: "AI Reports", path: "/admin/ai-evaluations" },
    { label: "Announcements", path: "/admin/announcements" },
    { label: "Profile", path: "/admin/profile" },
    { label: "Settings", path: "/admin/settings" },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE_URL}/admin/logout`, {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error("Logout failed:", error);
        }
        localStorage.removeItem("auth_token");
        localStorage.removeItem("role");
        localStorage.removeItem("admin_info");
        router.push("/admin/login");
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.navBrand}>
                <Link href="/admin" className={styles.logo}>
                    <BrainCircuit size={24} className={styles.logoIcon} />
                </Link>
                <button className={styles.hamburger} onClick={toggleMenu}>
                    {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
                </button>
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
