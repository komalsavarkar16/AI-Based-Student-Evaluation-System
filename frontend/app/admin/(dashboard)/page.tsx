"use client";
import React, { useEffect, useState } from 'react';
import { Users, BookOpen, BrainCircuit, LibraryBig, Percent, GraduationCap } from 'lucide-react';
import StatsCard from '../components/StatsCard/StatsCard';
import StudentManagementTable from '../components/StudentManagementTable/StudentManagementTable';
import EnrollmentChart from '../components/EnrollmentChart/EnrollmentChart';
import EvaluationReports from '../components/EvaluationReports/EvaluationReports';
import PendingDecisions from '../components/PendingDecisions/PendingDecisions';
import SkillGapAnalytics from '../components/SkillGapAnalytics/SkillGapAnalytics';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './dashboard.module.css';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<any>({
        totalStudents: 0,
        availableCourses: 0,
        passRate: 0,
        bridgeStudents: 0
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [studentsRes, coursesRes, statusRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/admin/students`, { credentials: "include" }),
                    fetch(`${API_BASE_URL}/courses/`, { credentials: "include" }),
                    fetch(`${API_BASE_URL}/admin/analytics/overall-status`, { credentials: "include" })
                ]);

                const students = studentsRes.ok ? await studentsRes.json() : [];
                const courses = coursesRes.ok ? await coursesRes.json() : [];
                const status = statusRes.ok ? await statusRes.json() : { passPercent: 0, bridge: 0 };

                setStats({
                    totalStudents: students.length,
                    availableCourses: courses.length,
                    passRate: status.passPercent,
                    bridgeStudents: status.bridge
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            }
        };
        fetchDashboardData();
    }, []);

    return (
        <div className={styles.mainContent}>
            <section className={styles.ctaSection}>
                <div className={styles.ctaText}>
                    <h2>Hello, Admin!</h2>
                    <p>The system is running smoothly. All student assessments are being processed in real-time with SkillBridge AI.</p>
                </div>
                <div className={styles.quickActions}>
                    <button className={styles.actionBtn} onClick={() => router.push('/admin/students')}>
                        <Users size={18} /> Manage Students
                    </button>
                </div>
            </section>

            <div className={styles.header}>
                <h1 className={styles.title}>System Overview</h1>
                <p className={styles.subtitle}>Real-time monitoring and advanced student analytics.</p>
            </div>

            <div className={styles.statsGrid}>
                <StatsCard
                    title="Total Students"
                    value={stats.totalStudents.toLocaleString()}
                    icon={Users}
                    trend={{ value: 'Real-time', isPositive: true }}
                    color="#57cc99"
                />
                <StatsCard
                    title="Available Courses"
                    value={stats.availableCourses.toString()}
                    icon={LibraryBig}
                    trend={{ value: 'Updated', isPositive: true }}
                    color="#38a3a5"
                />
                <StatsCard
                    title="Avg. Pass Rate"
                    value={`${stats.passRate}%`}
                    icon={Percent}
                    trend={{ value: 'AI Verified', isPositive: true }}
                    color="#80ed99"
                />
                <StatsCard
                    title="Bridge Course"
                    value={stats.bridgeStudents.toString()}
                    icon={GraduationCap}
                    trend={{ value: 'Requires Attention', isPositive: false }}
                    color="#ff9f1c"
                />
            </div>

            <div className={styles.mainGrid}>
                <StudentManagementTable />
            </div>

            <div className={styles.reportsGrid}>
                <SkillGapAnalytics />
            </div>

            <div className={styles.secondaryGrid}>
                <EnrollmentChart />
                <EvaluationReports />
            </div>
        </div>
    );
}
