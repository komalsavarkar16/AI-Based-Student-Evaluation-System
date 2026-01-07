'use client';
import styles from "./styles/home.module.css";
import Link from 'next/link';
import { GraduationCap, ShieldCheck, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      <main className={styles.mainWrapper}>
        <header className={styles.header}>
          <h1>Welcome</h1>
          <p>Choose your workspace to manage your academic journey.</p>
        </header>

        <div className={styles.selectionGrid}>
          {/* Student Card */}
          <div  className={styles.card}>
            <div className={`${styles.iconBox} ${styles.studentIcon}`}>
              <GraduationCap size={32} />
            </div>
            <h2 className={styles.cardTitle}>Student</h2>
            <p className={styles.cardDescription}>
              View your courses, track assignments, and access learning materials.
            </p>
            <Link href="/student/login" className={`${styles.actionButton} ${styles.studentBtn}`}>
              Continue as Student <ChevronRight size={18} />
            </Link>
          </div>

          {/* Admin Card */}
          <div  className={styles.card}>
            <div className={`${styles.iconBox} ${styles.adminIcon}`}>
              <ShieldCheck size={32} />
            </div>
            <h2 className={styles.cardTitle}>Administrator</h2>
            <p className={styles.cardDescription}>
              Manage enrollments, generate reports, and configure system settings.
            </p>
            <Link href="/admin/login" className={`${styles.actionButton} ${styles.adminBtn}`}>
              Continue as Admin <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}