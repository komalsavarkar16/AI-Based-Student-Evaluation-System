"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./resultsListing.module.css";
import { API_BASE_URL } from "@/app/utils/api";

interface Course {
    _id: string;
    title: string;
    category: string;
    level: string;
}

interface CompletedResult {
    course: Course;
    score: number;
    overallVideoScore: number;
    eligibilitySignal: string;
    status: string;
    decisionNotes: string;
}

export default function ResultsList() {
    const [results, setResults] = useState<CompletedResult[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const studentId = localStorage.getItem("student_id");

            if (!studentId || !token) return;

            // 1. Fetch all courses
            const coursesRes = await fetch(`${API_BASE_URL}/courses/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const coursesData: Course[] = await coursesRes.json();

            // 2. Fetch test statuses and filter for completed video evaluations
            const completedTests: CompletedResult[] = [];

            for (const course of coursesData) {
                const statusRes = await fetch(`${API_BASE_URL}/student/check-test-status/${studentId}/${course._id}`);
                if (statusRes.ok) {
                    const statusData = await statusRes.json();

                    if (statusData.videoTestEvaluationStatus === "completed") {
                        completedTests.push({
                            course: course,
                            score: statusData.score,
                            overallVideoScore: statusData.overallVideoScore || 0,
                            eligibilitySignal: statusData.eligibilitySignal || "-",
                            status: statusData.status || "Pending",
                            decisionNotes: statusData.decisionNotes || ""
                        });
                    }
                }
            }

            setResults(completedTests);
        } catch (error) {
            console.error("Error fetching results:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading your results...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Your Results</h1>
                <p className={styles.subtitle}>Review your detailed analysis for completed assessments.</p>
            </div>

            {results.length > 0 ? (
                <div className={styles.grid}>
                    {results.map((item) => (
                        <div key={item.course._id} className={styles.card}>
                            <div className={styles.cardTop}>
                                <span className={styles.category}>{item.course.category}</span>
                                <h2 className={styles.courseTitle}>{item.course.title}</h2>
                                <span className={styles.levelTag}>{item.course.level}</span>
                            </div>

                            <div>
                                <div className={styles.scoreRow}>
                                    <span className={styles.scoreLabel}>MCQ Score:</span>
                                    <span className={styles.scoreValue}>{item.score}%</span>
                                </div>
                                <div className={styles.scoreRow}>
                                    <span className={styles.scoreLabel}>Admission Status:</span>
                                    <span className={styles.scoreValue} style={{
                                        color: item.status === 'Approved' ? '#10b981' :
                                            item.status === 'Bridge Course Recommended' ? '#0369a1' :
                                                item.status === 'Retry Required' ? '#ef4444' : '#f59e0b',
                                        fontWeight: 700
                                    }}>
                                        {item.status}
                                    </span>
                                </div>
                                {item.decisionNotes && (
                                    <div className={styles.noteBox}>
                                        <p><strong>Admin Note:</strong> {item.decisionNotes}</p>
                                    </div>
                                )}
                                <Link
                                    href={`/student/results/${item.course._id}`}
                                    className={styles.viewBtn}
                                >
                                    View Detailed Analysis
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <h3>No results available yet</h3>
                    <p>Complete a video assessment to see your detailed analysis here.</p>
                </div>
            )}
        </div>
    );
}
