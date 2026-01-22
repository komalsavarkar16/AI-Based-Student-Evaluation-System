"use client";
import React, { useState, useEffect } from "react";
import styles from "./dashboard.module.css";
import Link from "next/link";
import {
  WarningAmber as GapIcon,
  Lightbulb as IdeaIcon
} from "@mui/icons-material";
import StudentNavbar from "../components/StudentNavbar/StudentNavbar";

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");

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

  // Mock Data
  const assessmentHistory = [
    { id: 101, name: "Python Basics", date: "Oct 24, 2024", score: "85%", status: "completed" },
    { id: 102, name: "Data Structures", date: "Oct 28, 2024", score: "-", status: "pending" },
    { id: 103, name: "React Fundamentals", date: "Nov 02, 2024", score: "92%", status: "completed" },
  ];

  return (
    <div className={styles.container}>
      <StudentNavbar />

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        <div className={styles.dashboardContent}>
          {/* Header Section */}
          <div className={styles.contentHeader}>
            <div className={styles.welcomeMsg}>
              <h2>Hello, {studentName} 👋</h2>
              <p>Here's what's happening with your learning today.</p>
            </div>
          </div>
          {/* 2. STATS ROW (Profile | Skill | Score) */}
          <section className={styles.statsRow}>
            {/* Profile Card */}
            <div className={`${styles.card} ${styles.profileWidget}`}>
              <div className={styles.largeAvatar}>
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div className={styles.profileInfo}>
                <h3>{studentName}</h3>
                <span>Computer Science Student</span>
                <span>Year: 3rd Semester</span>
              </div>
            </div>

            {/* Skill Status */}
            <div className={`${styles.card} ${styles.skillWidget}`}>
              <h3>Skill Status</h3>

              <div className={styles.skillItem}>
                <div className={styles.skillMeta}>
                  <span>Python</span>
                  <span>85%</span>
                </div>
                <div className={styles.progressBarBack}>
                  <div className={styles.progressBarFill} style={{ width: '85%' }}></div>
                </div>
              </div>

              <div className={styles.skillItem}>
                <div className={styles.skillMeta}>
                  <span>React</span>
                  <span>92%</span>
                </div>
                <div className={styles.progressBarBack}>
                  <div className={styles.progressBarFill} style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. CTA BANNER */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaText}>
              <h2>Explore New Horizons!</h2>
              <p>Browse through our extensive library of courses and find the perfect path to enhance your skills and knowledge.</p>
            </div>
            <Link href="/student/courses" className={styles.startBtn}>
              Browse Courses
            </Link>
          </section>

          {/* 4. INSIGHTS ROW (Gap Analysis | Recommendations) */}
          <section className={styles.insightsRow}>
            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Skill Gap Analysis</h3>
              </div>
              <div className={styles.gapList}>
                <div className={styles.gapItem}>
                  <GapIcon className={styles.gapIcon} />
                  <div className={styles.gapDetails}>
                    <h4>Data Structures - Heaps</h4>
                    <p>Score below 60% in recent test</p>
                  </div>
                </div>
                <div className={styles.gapItem}>
                  <GapIcon className={styles.gapIcon} />
                  <div className={styles.gapDetails}>
                    <h4>React - Hooks</h4>
                    <p>Needs more practical application</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Learning Recommendations</h3>
              </div>
              <div className={styles.recList}>
                <div className={styles.recItem}>
                  <IdeaIcon className={styles.recIcon} />
                  <div className={styles.recDetails}>
                    <h4>Mastering Binary Heaps</h4>
                    <p>Recommended Article • 10 min read</p>
                  </div>
                </div>
                <div className={styles.recItem}>
                  <IdeaIcon className={styles.recIcon} />
                  <div className={styles.recDetails}>
                    <h4>React Hooks Deep Dive</h4>
                    <p>Video Course • 45 mins</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 5. HISTORY TABLE */}
          <section className={styles.historySection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Assessment History</h3>
              <Link href="#" className={styles.viewLink}>View All</Link>
            </div>

            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Assessment Name</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {assessmentHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.date}</td>
                    <td>{item.score}</td>
                    <td>
                      <span className={`${styles.statusTag} ${item.status === 'completed' ? styles.completed : styles.pending}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <Link href="#" className={styles.actionLink}>View Report</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

      </main>
    </div>
  );
}