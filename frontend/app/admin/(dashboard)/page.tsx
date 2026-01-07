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
            <div className={styles.header}>
                <h1 className={styles.title}>Dashboard Overview</h1>
                <p className={styles.subtitle}>Welcome back, Admin! Here&apos;s what&apos;s happening today.</p>
            </div>

            <div className={styles.statsGrid}>
                <StatsCard
                    title="Total Students"
                    value="2,543"
                    icon={Users}
                    trend={{ value: '12%', isPositive: true }}
                    color="#6366f1"
                />
                <StatsCard
                    title="Available Courses"
                    value="12"
                    icon={LibraryBig}
                    trend={{ value: '2', isPositive: true }}
                    color="#a855f7"
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
