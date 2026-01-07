"use client";
import { useState, useEffect } from "react";
import styles from "./dashboard.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dashboard as DashboardIcon,
  Assignment as AssessmentIcon,
  Timeline as PerformanceIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  ChevronRight as ToggleIcon,
  NotificationsNone as BellIcon,
  WarningAmber as GapIcon,
  Lightbulb as IdeaIcon
} from "@mui/icons-material";

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = () => {
    router.push("/student/login");
  };

  // Mock Data
  const assessmentHistory = [
    { id: 101, name: "Python Basics", date: "Oct 24, 2024", score: "85%", status: "completed" },
    { id: 102, name: "Data Structures", date: "Oct 28, 2024", score: "-", status: "pending" },
    { id: 103, name: "React Fundamentals", date: "Nov 02, 2024", score: "92%", status: "completed" },
  ];

  return (
    <div className={styles.container}>
      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${!isSidebarOpen ? styles.minimized : ''}`}>
        <button className={styles.toggleBtn} onClick={toggleSidebar}>
          <ToggleIcon style={{ fontSize: '18px' }} />
        </button>

        <div className={styles.logoContainer}>
          <div className={styles.logoBox}>ES</div>
          <div className={styles.logoText}>
            Evaluation System
            <span className={styles.logoSubtext}>Student</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'Dashboard' ? styles.active : ''}`} onClick={() => setActiveTab('Dashboard')}>
            <div className={styles.navIcon}><DashboardIcon /></div>
            <span className={styles.navItemText}>Dashboard</span>
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'Assessments' ? styles.active : ''}`} onClick={() => setActiveTab('Assessments')}>
            <div className={styles.navIcon}><AssessmentIcon /></div>
            <span className={styles.navItemText}>My Assessments</span>
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'Performance' ? styles.active : ''}`} onClick={() => setActiveTab('Performance')}>
            <div className={styles.navIcon}><PerformanceIcon /></div>
            <span className={styles.navItemText}>Performance</span>
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'Profile' ? styles.active : ''}`} onClick={() => setActiveTab('Profile')}>
            <div className={styles.navIcon}><ProfileIcon /></div>
            <span className={styles.navItemText}>My Profile</span>
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'Settings' ? styles.active : ''}`} onClick={() => setActiveTab('Settings')}>
            <div className={styles.navIcon}><SettingsIcon /></div>
            <span className={styles.navItemText}>Settings</span>
          </Link>
        </nav>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          <div className={styles.navIcon}><LogoutIcon /></div>
          <span className={styles.logoutText}>Logout</span>
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>

        {/* 1. TOP BAR (Restored) */}
        <header className={styles.topBar}>
          <div className={styles.welcomeMsg}>
            <h2>Hello, {studentName} 👋</h2>
            <p>Here's what's happening with your learning today.</p>
          </div>

          <div className={styles.profileSection}>
            <div className={styles.searchBar}>
              <SearchIcon style={{ color: '#ccc', fontSize: 20 }} />
              <input type="text" placeholder="Search..." className={styles.searchInput} />
            </div>

            <button className={styles.iconBtn}>
              <BellIcon />
              <span className={styles.badge}></span>
            </button>

            <div className={styles.profilePic}>
              {studentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className={styles.dashboardContent}>
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

            {/* Score Card */}
            <div className={`${styles.card} ${styles.scoreWidget}`}>
              <div className={styles.scoreCircle}>
                A
              </div>
              <div className={styles.scoreLabel}>Overall Grade</div>
            </div>
          </section>

          {/* 3. CTA BANNER */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaText}>
              <h2>Ready to test your skills?</h2>
              <p>Take a new AI-powered assessment to evaluate your knowledge and get personalized recommendations.</p>
            </div>
            <Link href="#" className={styles.startBtn}>
              Start Assessment
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