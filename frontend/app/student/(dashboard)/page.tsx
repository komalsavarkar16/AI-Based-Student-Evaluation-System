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
  const [loading, setLoading] = useState(true);
  const [gaps, setGaps] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const studentId = localStorage.getItem("student_id");
    const token = localStorage.getItem("auth_token");

    if (!studentId || !token) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch Profile
      const profileRes = await fetch(`${API_BASE_URL}/student/profile/${studentId}`);
      let profileData: any = {};
      if (profileRes.ok) {
        profileData = await profileRes.json();
        setStudentInfo(profileData);
      }

      // 2. Fetch Courses
      const coursesRes = await fetch(`${API_BASE_URL}/courses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const coursesData = await coursesRes.json();

      // 3. Fetch History (Real Data Integration)
      const historyList = [];
      const userSkillScores: { [key: string]: number } = {};
      const generatedGaps = [];
      const generatedRecs = [];

      for (const course of coursesData) {
        const statusRes = await fetch(
          `${API_BASE_URL}/student/check-test-status/${studentId}/${course._id}`
        );

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const score = statusData.score || 0;

          if (statusData.completed) {
            historyList.push({
              id: course._id,
              name: course.title,
              date: "Completed recently", // Replace with real date if API supports
              score: `${score}%`,
              status: statusData.passed ? "completed" : "failed",
            });

            // If score is less than 70, register as a gap
            if (score < 70) {
              generatedGaps.push({
                id: course._id,
                title: `${course.title} Fundamentals`,
                description: `Score below 70% in recent assessment (${score}%)`,
              });
              generatedRecs.push({
                id: course._id,
                title: `Review ${course.category} Basics`,
                description: `Review the syllabus for ${course.title} to improve your domain knowledge.`,
              });
            }

            // Map course score to skills
            if (course.skills_required && Array.isArray(course.skills_required)) {
              course.skills_required.forEach((skill: string) => {
                if (!userSkillScores[skill] || score > userSkillScores[skill]) {
                  userSkillScores[skill] = score; // Store highest score for the skill
                }
              });
            }
          } else {
            historyList.push({
              id: course._id,
              name: course.title,
              date: "-",
              score: "-",
              status: "pending",
            });
          }
        }
      }
      setHistory(historyList);
      setGaps(generatedGaps.slice(0, 3)); // Show top 3 gaps
      setRecommendations(generatedRecs.slice(0, 3)); // Show top 3 recs

      // 4. Transform Skills for UI (fallback to dummy percentage if no tests taken)
      const profileSkills = profileData.skills || [];
      const formattedSkills = profileSkills.map((skill: string) => ({
        name: skill,
        percentage: userSkillScores[skill] || 0 // Default to 0% if no test mapped
      }));

      // Add mapped skills from tests if they aren't in profile
      Object.keys(userSkillScores).forEach(skill => {
        if (!formattedSkills.find((s: any) => s.name === skill)) {
          formattedSkills.push({
            name: skill,
            percentage: userSkillScores[skill]
          });
        }
      });

      // Show top 5 skills
      setSkills(formattedSkills.sort((a: any, b: any) => b.percentage - a.percentage).slice(0, 5));

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
          </div>
        )}
      </main>
    </div>
  );
}