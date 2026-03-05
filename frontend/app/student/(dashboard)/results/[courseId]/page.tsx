"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import styles from "./resultDetail.module.css";
import { API_BASE_URL } from "@/app/utils/api";

interface EvaluationAnalysis {
    skill: string;
    conceptCoverageScore: number;
    technicalScore: number;
    clarityScore: number;
    overallScore: number;
    skillLevelAssessment: string;
    strengths: string[];
    weakAreas: string[];
}

interface VideoAnswer {
    questionId: string;
    relatedSkill: string;
    transcript: string;
    analysis: EvaluationAnalysis;
}

interface TestResult {
    completed: boolean;
    passed: boolean;
    score: number;
    videoTestEvaluationStatus: string;
    videoAnswers: VideoAnswer[];
    overallVideoScore: number;
    skillGap: string[];
    eligibilitySignal: string;
    executiveSummary: string;
    overallReasoning: string;
}

export default function ResultDetail() {
    const { courseId } = useParams();
    const [result, setResult] = useState<TestResult | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchResultData();
    }, [courseId]);

    const fetchResultData = async () => {
        setLoading(true);
        try {
            const studentId = localStorage.getItem("student_id");
            if (!studentId || !courseId) return;

            const res = await fetch(`${API_BASE_URL}/student/check-test-status/${studentId}/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setResult(data);
            }
        } catch (error) {
            console.error("Error fetching detailed result:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading comprehensive analysis...</p>
            </div>
        );
    }

    if (!result || result.videoTestEvaluationStatus !== "completed") {
        return (
            <div className={styles.container}>
                <div className={styles.section} style={{ textAlign: "center" }}>
                    <h2>Analysis Not Available</h2>
                    <p>This course's video evaluation is either pending or not started.</p>
                </div>
            </div>
        );
    }

    // 1. Overall Status Logic
    const signal = result.eligibilitySignal?.toLowerCase() || "-";
    let bannerClass = styles.bannerUnknown;
    let bannerTitle = "Evaluation Complete";
    let bannerRec = "";

    if (signal === "pass" || signal.includes("pass")) {
        bannerClass = styles.bannerPass;
        bannerTitle = "Eligible for Admission";
        bannerRec = "You are ready to enroll in this course.";
    } else if (signal === "borderline" || signal.includes("borderline")) {
        bannerClass = styles.bannerBorderline;
        bannerTitle = "Eligible with Recommendation";
        bannerRec = "We recommend completing the Bridge Module before starting.";
    } else if (signal === "fail" || signal.includes("fail")) {
        bannerClass = styles.bannerFail;
        bannerTitle = "Not Eligible Yet";
        bannerRec = "Please review the suggested topics and reattempt the evaluation.";
    } else {
        // Fallback for '-' or unmapped signal
        bannerTitle = "Evaluation Status: -";
        bannerRec = "Awaiting final manual review or signal generation.";
    }

    // 2. Aggregate Scores from videoAnswers
    let totalTech = 0;
    let totalClarity = 0;
    let count = 0;

    // 4 & 5. Aggregate Strengths and WeakAreas
    const allStrengths = new Set<string>();
    const allWeaknesses = new Set<string>();

    (result.videoAnswers || []).forEach((ans) => {
        const analysis = ans.analysis;
        if (analysis) {
            totalTech += analysis.technicalScore || 0;
            totalClarity += analysis.clarityScore || 0;
            count++;

            (analysis.strengths || []).forEach(s => allStrengths.add(s));
            (analysis.weakAreas || []).forEach(w => allWeaknesses.add(w));
        }
    });

    // Use aggregate logic provided or fallback to 0
    const avgTechScore = count > 0 ? (totalTech / count).toFixed(1) : "0.0";
    const avgClarityScore = count > 0 ? (totalClarity / count).toFixed(1) : "0.0";
    const overallScoreFormatted = result.overallVideoScore ? result.overallVideoScore.toFixed(1) : "0.0";

    const getBadgeClass = (assessment: string) => {
        const val = (assessment || "").toLowerCase();
        if (val.includes("strong")) return styles.badgeStrong;
        if (val.includes("moderate")) return styles.badgeModerate;
        if (val.includes("weak")) return styles.badgeWeak;
        return styles.badgeModerate; // fallback
    };

    return (
        <div className={styles.container}>

            {/* 1. Overall Status Banner */}
            <div className={`${styles.statusBanner} ${bannerClass}`}>
                <h1>{bannerTitle}</h1>
                <p>{bannerRec}</p>
            </div>

            {/* 2. Overall Score Breakdown */}
            <div className={styles.scoreGrid}>
                <div className={styles.scoreCard}>
                    <h3>📊 Technical Score (Average)</h3>
                    <div className={styles.scoreValue}>{avgTechScore} / 10</div>
                </div>
                <div className={styles.scoreCard}>
                    <h3>🗣 Clarity Score (Average)</h3>
                    <div className={styles.scoreValue}>{avgClarityScore} / 10</div>
                </div>
                <div className={styles.scoreCard}>
                    <h3>🎯 Overall Score</h3>
                    <div className={styles.scoreValue}>{overallScoreFormatted} / 10</div>
                </div>
            </div>

            {/* 3. Skill-wise Performance Table */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Skill-wise Performance Table</h2>
                <div className={styles.skillTableWrapper}>
                    <table className={styles.skillTable}>
                        <thead>
                            <tr>
                                <th>Skill Evaluated</th>
                                <th>Concept Coverage</th>
                                <th>Technical Score</th>
                                <th>Clarity Score</th>
                                <th>Assessment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(result.videoAnswers || []).map((ans, idx) => {
                                const analysis = ans.analysis || {} as Partial<EvaluationAnalysis>;
                                return (
                                    <tr key={idx}>
                                        <td><strong>{ans.relatedSkill || analysis.skill || "General"}</strong></td>
                                        <td>{analysis.conceptCoverageScore || 0} / 10</td>
                                        <td>{analysis.technicalScore || 0} / 10</td>
                                        <td>{analysis.clarityScore || 0} / 10</td>
                                        <td>
                                            <span className={`${styles.assessmentBadge} ${getBadgeClass(analysis.skillLevelAssessment || "")}`}>
                                                {analysis.skillLevelAssessment || "Moderate"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {(!result.videoAnswers || result.videoAnswers.length === 0) && (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center" }}>No skill breakdown available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4 & 5. Strengths and Areas to Improve */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Detailed Feedback</h2>
                <div className={styles.listGrid}>
                    <div className={`${styles.listColumn} ${styles.strengths}`}>
                        <h4>🌟 Key Strengths</h4>
                        <ul className={styles.list}>
                            {Array.from(allStrengths).length > 0 ? (
                                Array.from(allStrengths).map((s, idx) => <li key={idx}>{s}</li>)
                            ) : (
                                <li>No clear strengths identified in this evaluation.</li>
                            )}
                        </ul>
                    </div>

                    <div className={`${styles.listColumn} ${styles.weaknesses}`}>
                        <h4>💡 Areas to Improve</h4>
                        <ul className={styles.list}>
                            {Array.from(allWeaknesses).length > 0 ? (
                                Array.from(allWeaknesses).map((w, idx) => <li key={idx}>{w}</li>)
                            ) : (
                                <li>No major areas of improvement detected!</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    );
}
