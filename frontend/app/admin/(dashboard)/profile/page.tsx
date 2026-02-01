"use client";
import React, { useState, useEffect } from "react";
import styles from "./profile.module.css";
import Link from "next/link";
import {
    Person as PersonIcon,
    Work as WorkIcon,
    MilitaryTech as ExpertiseIcon,
    Business as DeptIcon,
    Badge as DesignationIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    CheckCircle as ActiveIcon,
    Edit as EditIcon
} from "@mui/icons-material";

interface AdminInfo {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    experience?: string;
    expertise?: string[];
    department?: string;
    designation?: string;
    phone?: string;
    profileImage?: string;
    isActive: boolean;
}

export default function AdminProfile() {
    const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const adminData = localStorage.getItem("admin_info");
            if (!adminData) {
                setLoading(false);
                return;
            }

            try {
                const { id } = JSON.parse(adminData);
                const res = await fetch(`http://localhost:8000/admin/profile/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setAdminInfo(data);
                }
            } catch (err) {
                console.error("Error fetching admin profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) return <div className={styles.loading}>Loading Premium Experience...</div>;

    if (!adminInfo) {
        return (
            <div className={styles.error}>
                <p>Profile not found. Please log in again.</p>
                <Link href="/admin/login">Go to Login</Link>
            </div>
        );
    }

    const fullName = `${adminInfo.firstName} ${adminInfo.lastName}`;
    const displayValue = (val: string | undefined) => val && val.trim() !== "" ? val : "Not Specified";

    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>
                {/* Profile Header */}
                <header className={styles.profileHeader}>
                    <div className={styles.avatar}>
                        {adminInfo.profileImage ? (
                            <img src={adminInfo.profileImage} alt={fullName} />
                        ) : (
                            adminInfo.firstName.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className={styles.headerInfo}>
                        <div className={styles.nameHeader}>
                            <h1>{fullName}</h1>
                            <Link href="/admin/profile/edit" className={styles.editBtn}>
                                <EditIcon fontSize="small" /> Edit your Profile
                            </Link>
                        </div>
                        <p className={styles.emailText}>{adminInfo.email}</p>
                        <div className={styles.statusBadge}>
                            <ActiveIcon fontSize="small" /> {adminInfo.isActive ? "Active" : "Inactive"}
                        </div>
                    </div>
                </header>

                <div className={styles.grid}>
                    {/* Left Column */}
                    <div className={styles.leftCol}>
                        {/* Basic Information */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><PersonIcon /> Basic Information</h3>
                            </div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <label>First Name</label>
                                    <p>{adminInfo.firstName}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Last Name</label>
                                    <p>{adminInfo.lastName}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Email Address</label>
                                    <p>{adminInfo.email}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Phone Number</label>
                                    <p>{displayValue(adminInfo.phone)}</p>
                                </div>
                            </div>
                        </section>

                        {/* Professional Details */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><WorkIcon /> Professional Details</h3>
                            </div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <label><DeptIcon fontSize="small" /> Department</label>
                                    <p>{displayValue(adminInfo.department)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label><DesignationIcon fontSize="small" /> Designation</label>
                                    <p>{displayValue(adminInfo.designation)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label><WorkIcon fontSize="small" /> Experience</label>
                                    <p>{displayValue(adminInfo.experience)}</p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className={styles.rightCol}>
                        {/* Expertise */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><ExpertiseIcon /> Areas of Expertise</h3>
                            </div>
                            <div className={styles.expertiseWrapper}>
                                {adminInfo.expertise && adminInfo.expertise.length > 0 ? (
                                    adminInfo.expertise.map((skill, index) => (
                                        <span key={index} className={styles.expertiseTag}>{skill}</span>
                                    ))
                                ) : (
                                    <p className={styles.emptyText}>No expertise areas added yet.</p>
                                )}
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3>Quick Actions</h3>
                            </div>
                            <div className={styles.infoGrid}>
                                <Link href="/admin/courses" className={styles.editBtn} style={{ color: '#1e293b', background: '#f1f5f9' }}>
                                    Manage Courses
                                </Link>
                                <Link href="/admin/dashboard" className={styles.editBtn} style={{ color: '#1e293b', background: '#f1f5f9' }}>
                                    View Analytics
                                </Link>
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
