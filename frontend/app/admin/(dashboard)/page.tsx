import React from 'react';
import { Users, BookOpen, BrainCircuit, LibraryBig } from 'lucide-react';
import StatsCard from '../components/StatsCard/StatsCard';
import StudentManagementTable from '../components/StudentManagementTable/StudentManagementTable';
import EnrollmentChart from '../components/EnrollmentChart/EnrollmentChart';
import EvaluationReports from '../components/EvaluationReports/EvaluationReports';
import PendingDecisions from '../components/PendingDecisions/PendingDecisions';
import SkillGapAnalytics from '../components/SkillGapAnalytics/SkillGapAnalytics';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
    return (
        <div className={styles.mainContent}>
            <section className={styles.ctaSection}>
                <div className={styles.ctaText}>
                    <h2>Hello, Admin! 👋</h2>
                    <p>The system is running smoothly. All student assessments are being processed in real-time with EduBridge AI.</p>
                </div>
                <div className={styles.quickActions}>
                    <button className={styles.actionBtn}>
                        <BrainCircuit size={18} /> System Check
                    </button>
                    <button className={styles.actionBtn}>
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
                    value="2,543"
                    icon={Users}
                    trend={{ value: '12%', isPositive: true }}
                    color="#57cc99"
                />
                <StatsCard
                    title="Available Courses"
                    value="12"
                    icon={LibraryBig}
                    trend={{ value: '2', isPositive: true }}
                    color="#38a3a5"
                />
            </div>

            <div className={styles.mainGrid}>
                <StudentManagementTable />
                <PendingDecisions />
            </div>

            <div className={styles.secondaryGrid}>
                <EnrollmentChart />
                <EvaluationReports />
            </div>

            <div className={styles.reportsGrid}>
                <SkillGapAnalytics />
            </div>
        </div>
    );
}
