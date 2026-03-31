"use client";
import React, { useState, useEffect } from "react";
import styles from "./profile.module.css";
import StudentNavbar from "../../components/StudentNavbar/StudentNavbar";
import Link from "next/link";
import ProfileProgressBar from "../../components/ProgressBar/ProfileProgressBar";
import {
    Person as PersonIcon,
    School as SchoolIcon,
    MilitaryTech as SkillIcon,
    AutoStories as CourseIcon,
    BarChart as StatsIcon,
    TipsAndUpdates as AIPathsIcon,
    Settings as SettingsIcon,
    Edit as EditIcon
} from "@mui/icons-material";
import { API_BASE_URL } from "@/app/utils/api";
import { toast } from "react-toastify";

interface StudentInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    university?: string;
    major?: string;
    year?: string;
    gpa?: string;
    gender?: string;
    location?: string;
    dob?: string;
    profileImage?: string;
    skills?: string[];
}

export default function StudentProfile() {
    const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState<any>({
        enrolledCourses: [],
        avgScore: 0,
        testsTaken: 0,
        certificates: 0,
        recommendations: []
    });
    const [passwords, setPasswords] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [updating, setUpdating] = useState(false);

    const calculateProgress = (profile: StudentInfo) => {
        const fields = [
            profile.firstName,
            profile.lastName,
            profile.email,
            profile.phone,
            profile.university,
            profile.major,
            profile.year,
            profile.gpa,
            profile.gender,
            profile.location,
            profile.dob,
            profile.profileImage,
            profile.skills && profile.skills.length > 0 ? "filled" : ""
        ];

        const filledFields = fields.filter(
            (value) => value !== undefined && value !== null && value !== ""
        ).length;

        return Math.round((filledFields / fields.length) * 100);
    };

    useEffect(() => {
        const fetchProfile = async () => {
            const studentId = localStorage.getItem("student_id");
            if (!studentId) {
                setLoading(false);
                return;
            }

            try {
                const fetchOptions = { credentials: "include" as const };
                const [profileRes, statsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/student/profile/${studentId}`, fetchOptions),
                    fetch(`${API_BASE_URL}/student/dashboard-stats/${studentId}`, fetchOptions)
                ]);

                if (profileRes.ok) {
                    const data = await profileRes.json();
                    setStudentInfo(data);
                    setProgress(calculateProgress(data));
                }
                
                if (statsRes.ok) {
                    setStats(await statsRes.json());
                }
            } catch (err) {
                console.error("Error fetching profile data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        const studentId = localStorage.getItem("student_id");

        if (!passwords.oldPassword || !passwords.newPassword || !passwords.confirmPassword) {
            toast.error("All fields are required");
            return;
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setUpdating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/student/change-password/${studentId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldPassword: passwords.oldPassword,
                    newPassword: passwords.newPassword
                }),
                credentials: "include"
            });

            if (res.ok) {
                toast.success("Password updated successfully!");
                setPasswords({ oldPassword: "", newPassword: "", confirmPassword: "" });
            } else {
                const err = await res.json();
                toast.error(`Error: ${err.detail || "Update failed"}`);
            }
        } catch (err) {
            console.error("Update error:", err);
            toast.error("Connection error");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;
    if (!studentInfo) return <div className={styles.error}>Profile not found. Please log in again.</div>;

    const fullName = `${studentInfo.firstName} ${studentInfo.lastName}`;
    const displayValue = (val: string | undefined) => val && val.trim() !== "" ? val : "-";

    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>
                {/* Profile Header */}
                <header className={styles.profileHeader}>
                    <div className={styles.avatarWrapper}>
                        <div className={styles.avatar}>
                            {studentInfo.profileImage ? (
                                <img src={studentInfo.profileImage} alt={fullName} />
                            ) : (
                                studentInfo.firstName.charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>
                    <div className={styles.headerInfo}>
                        <div className={styles.nameHeader}>
                            <h1>{fullName}</h1>
                            <Link href="/student/profile/edit" className={styles.editBtn}>
                                <EditIcon fontSize="small" /> Edit Profile
                            </Link>
                        </div>
                        <p>{studentInfo.email}</p>
                        <ProfileProgressBar progress={progress} />
                    </div>
                </header>

                <div className={styles.grid}>
                    {/* Left Column */}
                    <div className={styles.leftCol}>

                        {/* Basic Info */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><PersonIcon /> Basic Info</h3>
                            </div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <label>Full Name</label>
                                    <p>{fullName}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Email Address</label>
                                    <p>{studentInfo.email}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Phone Number</label>
                                    <p>{displayValue(studentInfo.phone)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Gender</label>
                                    <p>{displayValue(studentInfo.gender)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Date of Birth</label>
                                    <p>{displayValue(studentInfo.dob)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Location</label>
                                    <p>{displayValue(studentInfo.location)}</p>
                                </div>
                            </div>
                        </section>

                        {/* Academic Details */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><SchoolIcon /> Academic Details</h3>
                            </div>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <label>University</label>
                                    <p>{displayValue(studentInfo.university)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Major / Course</label>
                                    <p>{displayValue(studentInfo.major)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Current Year/Semester</label>
                                    <p>{displayValue(studentInfo.year)}</p>
                                </div>
                                <div className={styles.infoItem}>
                                    <label>Overall GPA</label>
                                    <p>{displayValue(studentInfo.gpa)}</p>
                                </div>
                            </div>
                        </section>

                        {/* Skills & Interests */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><SkillIcon /> Skills & Interests</h3>
                            </div>
                            <div className={styles.skillsWrapper}>
                                {studentInfo.skills && studentInfo.skills.length > 0 ? (
                                    studentInfo.skills.map(skill => (
                                        <span key={skill} className={styles.skillTag}>{skill}</span>
                                    ))
                                ) : (
                                    <p className={styles.emptyText}>No skills added yet.</p>
                                )}
                            </div>
                        </section>

                        {/* Assessment Performance */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><StatsIcon /> Assessment Performance</h3>
                            </div>
                            <div className={styles.perfStats}>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{stats.testsTaken}</span>
                                    <span className={styles.statLabel}>Tests Taken</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{stats.avgScore}%</span>
                                    <span className={styles.statLabel}>Avg. Score</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statValue}>{stats.certificates}</span>
                                    <span className={styles.statLabel}>Certificates</span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className={styles.rightCol}>

                        {/* Enrolled Courses */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><CourseIcon /> Enrolled Courses</h3>
                            </div>
                            <div className={styles.courseList}>
                                {stats.enrolledCourses.length > 0 ? (
                                    stats.enrolledCourses.map((course: any, idx: number) => (
                                        <div key={idx} className={styles.courseItem}>
                                            <div className={styles.courseInfo}>
                                                <h4>{course.name}</h4>
                                                <span>{course.status}</span>
                                            </div>
                                            <div className={styles.courseProgress}>
                                                <strong>{course.progress}%</strong>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className={styles.emptyText}>No courses started yet.</p>
                                )}
                            </div>
                        </section>

                        {/* AI Recommendations */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><AIPathsIcon /> AI Recommendations</h3>
                            </div>
                            <div className={styles.recommendationList}>
                                {stats.recommendations && stats.recommendations.length > 0 ? (
                                    stats.recommendations.map((rec: any, idx: number) => (
                                        <div key={idx} className={styles.recommendationItem}>
                                            <AIPathsIcon className={styles.recIcon} />
                                            <div className={styles.recText}>
                                                <h4>{rec.title}</h4>
                                                <p>{rec.description}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.recommendationItem}>
                                        <AIPathsIcon className={styles.recIcon} />
                                        <div className={styles.recText}>
                                            <h4>Start Learning</h4>
                                            <p>Take your first test to get personalized AI recommendations.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Account Settings */}
                        <section className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3><SettingsIcon /> Account Settings</h3>
                            </div>
                            <form className={styles.settingsForm} onSubmit={handlePasswordChange}>
                                <div className={styles.formGroup}>
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        placeholder="Current Password"
                                        value={passwords.oldPassword}
                                        onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        placeholder="New Password"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Confirm Password</label>
                                    <input
                                        type="password"
                                        placeholder="Confirm New Password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className={styles.saveBtn}
                                    disabled={updating}
                                >
                                    {updating ? "Updating..." : "Update Account"}
                                </button>
                            </form>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
