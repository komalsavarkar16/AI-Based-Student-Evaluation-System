"use client";
import React, { useState, useEffect } from "react";
import styles from "./dashboard.module.css";
import { API_BASE_URL } from "@/app/utils/api";
import WelcomeHeader from "../components/Dashboard/WelcomeHeader/WelcomeHeader";
import StatsRow from "../components/Dashboard/StatsRow/StatsRow";
import CtaBanner from "../components/Dashboard/CtaBanner/CtaBanner";
import InsightsRow from "../components/Dashboard/InsightsRow/InsightsRow";
import HistoryTable from "../components/Dashboard/HistoryTable/HistoryTable";

export default function StudentDashboard() {
  const [studentInfo, setStudentInfo] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gaps, setGaps] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const studentId = localStorage.getItem("student_id");
    // token is now handled via HttpOnly cookie

    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      const fetchOptions = { credentials: "include" as const };
      const [profileRes, statsRes, announcementsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/student/profile/${studentId}`, fetchOptions),
        fetch(`${API_BASE_URL}/student/dashboard-stats/${studentId}`, fetchOptions),
        fetch(`${API_BASE_URL}/student/announcements/${studentId}`, fetchOptions)
      ]);

      let profileData = {};
      if (profileRes.ok) {
        profileData = await profileRes.ok ? await profileRes.json() : {};
        setStudentInfo(profileData);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        
        // Map History from enrolledCourses
        const historyList = statsData.enrolledCourses.map((c: any, idx: number) => ({
          id: idx,
          name: c.name,
          date: c.status === "Approved" ? "Completed" : "In Progress",
          score: c.status === "Approved" ? "Passed" : (c.status === "Pending" ? "Pending AI Eval" : "-"),
          status: c.status.toLowerCase().includes("approve") ? "completed" : "pending"
        }));
        
        setHistory(historyList);
        setGaps(statsData.skillGaps || []);
        setRecommendations(statsData.recommendations || []);
        
        // Use profileData directly instead of studentInfo state
        const profileSkills = (profileData as any).skills || [];
        setSkills(profileSkills.map((s: string) => ({ name: s, percentage: statsData.avgScore || 0 })));
      }

      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json();
        setAnnouncements(announcementsData);
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const studentName = studentInfo.firstName
    ? `${studentInfo.firstName} ${studentInfo.lastName}`
    : "Student";

  return (
    <div className={styles.container}>
      <main className={styles.mainContent}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#888" }}>
            <div className={styles.spinner} style={{ margin: "0 auto", marginBottom: "15px", width: "30px", height: "30px" }}></div>
            Loading your personalized dashboard...
          </div>
        ) : (
          <div className={styles.dashboardContent}>
            <WelcomeHeader studentName={studentName} />
            <CtaBanner />
            <StatsRow
              studentName={studentName}
              major={studentInfo.major}
              year={studentInfo.year}
              skills={skills}
            />
            <InsightsRow
              gaps={gaps}
              recommendations={recommendations}
            />

            <HistoryTable history={history} />

            {/* Announcements Section */}
            <div className={styles.announcementsSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Recent Announcements</h3>
              </div>
              
              <div className={styles.announcementList}>
                {announcements.length > 0 ? (
                  announcements.map((announcement) => (
                    <div key={announcement.id} className={styles.announcementItem}>
                      <div className={styles.announcementHeader}>
                        <h4 className={styles.announcementTitle}>{announcement.title}</h4>
                        <span className={styles.announcementDate}>
                          {new Date(announcement.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={styles.announcementBody}>{announcement.message}</p>
                    </div>
                  ))
                ) : (
                  <div className={styles.noAnnouncements}>
                    No recent announcements for you.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}