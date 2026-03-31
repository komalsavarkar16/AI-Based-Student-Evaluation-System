"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
    facialExpression?: string;
    confidenceScore?: number;
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
    detailedSkillGap: any[];
    eligibilitySignal: string;
    executiveSummary: string;
    overallReasoning: string;
    status: string;
    decisionNotes: string;
    enrollmentLetter?: string;
    evaluationHistory?: any[];
}

export default function ResultDetail() {
    const { courseId } = useParams();
    const router = useRouter();
    const [result, setResult] = useState<TestResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [pathBData, setPathBData] = useState<any>(null);
    const [loadingPath, setLoadingPath] = useState<boolean>(false);

    useEffect(() => {
        fetchResultData();
    }, [courseId]);

    const fetchResultData = async () => {
        setLoading(true);
        try {
            const studentId = localStorage.getItem("student_id");
            if (!studentId || !courseId) return;

            const res = await fetch(`${API_BASE_URL}/student/check-test-status/${studentId}/${courseId}`, {
                credentials: "include"
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);

                if (data.status === 'Bridge Course Recommended') {
                    fetchAllPaths(data.skillGap || []);
                }
            }
        } catch (error) {
            console.error("Error fetching detailed result:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllPaths = async (skillGap: string[]) => {
        setLoadingPath(true);
        try {
            const resB = await fetch(`${API_BASE_URL}/student/bridge-path-b`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skillGap }),
                credentials: "include"
            });

            if (resB.ok) {
                const dataB = await resB.json();
                setPathBData(dataB);
            }
        } catch (error) {
            console.error("Error fetching path:", error);
        } finally {
            setLoadingPath(false);
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

    const hasHistory = (result?.evaluationHistory?.length ?? 0) > 0;
    const isCurrentReady = result?.videoTestEvaluationStatus === "completed";

    if (!result || (!isCurrentReady && !hasHistory)) {
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

            {/* Admission Decision Section */}
            {result.status && (
                <div className={styles.section} style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h2 className={styles.sectionTitle} style={{ color: '#0f172a' }}>Admission Decision</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{
                            padding: '6px 16px',
                            borderRadius: '9999px',
                            fontWeight: 700,
                            fontSize: '14px',
                            backgroundColor: result.status === 'Approved' ? '#dcfce7' :
                                result.status === 'Bridge Course Recommended' ? '#e0f2fe' :
                                    result.status === 'Retry Required' ? '#fee2e2' : '#f1f5f9',
                            color: result.status === 'Approved' ? '#166534' :
                                result.status === 'Bridge Course Recommended' ? '#0369a1' :
                                    result.status === 'Retry Required' ? '#991b1b' : '#475569'
                        }}>
                            {result.status.replace(/_/g, " ")}
                        </span>
                    </div>
                    {result.decisionNotes && (
                        <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                                <strong>Admin Note:</strong> {result.decisionNotes}
                            </p>
                        </div>
                    )}

                    {result.status === 'Bridge Course Recommended' && (
                        <div style={{ marginTop: '24px', background: '#eef2ff', padding: '24px', borderRadius: '12px', border: '1px solid #c7d2fe' }}>
                            <h3 style={{ color: '#4338ca', marginTop: 0, marginBottom: '8px', fontSize: '20px' }}>Bridge Path Assigned: AI Concept Checklist</h3>
                            <p style={{ color: '#4f46e5', marginBottom: '20px', fontSize: '15px' }}>
                                You have great potential, but need to fill some technical gaps before full enrollment. Follow this personalized study plan to bridge your gaps using the AI-generated Concept Checklist organized from easiest to hardest.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', border: '2px solid transparent', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>

                                    {loadingPath && !pathBData ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>AI is analyzing your skill gaps and generating study concepts...</div>
                                    ) : pathBData && (
                                        <>
                                            <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <h5 style={{ color: '#1e293b', marginTop: 0, fontSize: '15px' }}>Your AI Concept Checklist:</h5>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                    {pathBData.checklist?.map((item: any, idx: number) => (
                                                        <div key={idx} style={{ padding: '12px', background: '#fff', marginBottom: '8px', borderRadius: '6px', borderLeft: item.difficulty === 'HARD' ? '4px solid #ef4444' : item.difficulty === 'MEDIUM' ? '4px solid #f59e0b' : '4px solid #10b981', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.concept} <span style={{ fontSize: '11px', padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', marginLeft: '6px', verticalAlign: 'middle' }}>{item.difficulty}</span></div>
                                                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px', lineHeight: 1.4 }}><em>{item.description}</em></div>
                                                            {item.subtopics && item.subtopics.length > 0 && (
                                                                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#1e293b' }}>
                                                                    {item.subtopics.map((sub: string, sIdx: number) => (
                                                                        <li key={sIdx} style={{ marginBottom: '2px' }}>{sub}</li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <h5 style={{ color: '#1e293b', marginTop: '0', fontSize: '15px' }}>Recommended Reading Links:</h5>
                                                <ul style={{ paddingLeft: '20px', color: '#475569', margin: 0, fontSize: '14px' }}>
                                                    {pathBData.references?.map((ref: any, idx: number) => (
                                                        <li key={idx} style={{ marginBottom: '6px' }}>
                                                            <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>{ref.title}</a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <button style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '6px', fontWeight: 600, width: '100%', cursor: 'pointer', transition: 'background 0.2s ease' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#4338ca'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#4f46e5'; }}
                                                onClick={async () => {
                                                    try {
                                                        const studentId = localStorage.getItem("student_id");
                                                        if (!studentId) return;
                                                        const res = await fetch(`${API_BASE_URL}/student/start-bridge-course/${studentId}/${courseId}`, {
                                                            method: 'POST',
                                                            credentials: "include"
                                                        });
                                                        if (res.ok) {
                                                            window.alert("You are now enrolled in the Bridge Course! Follow the study plan to bridge your gaps.");
                                                            // Redirect them directly to the active checklist (runs inside the video-test wrapper)
                                                            router.push(`/student/video-test/${courseId}`);
                                                        }
                                                    } catch (err) {
                                                        console.error("Failed to start bridge path:", err);
                                                    }
                                                }}
                                            >Accept & Start Bridge Course</button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 📜 Enrollment Letter / Certificate of Clearance */}
            {result.status === 'Approved' && result.enrollmentLetter && (
                <div className={styles.enrollmentSection}>
                    <div className={styles.letterDecoration}></div>
                    <div className={styles.letterHeader}>
                        <img src="/logo.png" alt="Institute Logo" style={{ width: '80px', marginBottom: '10px' }}
                            onError={(e) => { (e.currentTarget as any).src = "https://cdn-icons-png.flaticon.com/512/2641/2641333.png"; }} />
                        <h2>Certificate of Enrollment</h2>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>Official Clearance Certificate & Welcome Letter</p>
                    </div>

                    <pre className={styles.letterContent}>
                        {result.enrollmentLetter}
                    </pre>

                    <div className={styles.letterFooter}>
                        <p><strong>Signed by,</strong></p>
                        <p style={{ marginTop: '5px', fontSize: '18px', fontWeight: 'bold', color: '#1e293b' }}>The Admissions Dean</p>
                        <p style={{ fontSize: '14px', color: '#64748b' }}>AI Training Institute</p>
                        <div className={styles.letterStamp}>OFFICIALLY CLEARED</div>
                    </div>

                    <button
                        onClick={() => window.print()}
                        style={{
                            marginTop: '40px',
                            background: '#1e293b',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px'
                        }}
                    >
                        🖨 Download / Print Certificate
                    </button>
                </div>
            )}

            {/* 2. Overall Score Breakdown */}
            <div className={styles.scoreGrid}>
                <div className={styles.scoreCard}>
                    <h3>Technical Score (Average)</h3>
                    <div className={styles.scoreValue}>{avgTechScore} / 10</div>
                </div>
                <div className={styles.scoreCard}>
                    <h3>Clarity Score (Average)</h3>
                    <div className={styles.scoreValue}>{avgClarityScore} / 10</div>
                </div>
                <div className={styles.scoreCard}>
                    <h3>Overall Score</h3>
                    <div className={styles.scoreValue}>{overallScoreFormatted} / 10</div>
                </div>
            </div>

            {/* Gap Discovery Section */}
            {result.detailedSkillGap && result.detailedSkillGap.length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Gap Discovery Analysis</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                        {result.detailedSkillGap.map((cat: any, i: number) => (
                            <div key={i} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                <h3 style={{ margin: '0 0 12px 0', color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '10px', height: '10px', background: '#8b5cf6', borderRadius: '50%' }}></span>
                                    {cat.category}
                                </h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {cat.skills.filter((s: any) => s.isGap).map((skill: any, j: number) => (
                                        <div key={j} style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '6px', fontSize: '14px', width: '100%' }}>
                                            <div style={{ fontWeight: 600 }}>{skill.skillName} (Score: {skill.score}/{skill.threshold})</div>
                                            <div style={{ marginTop: '6px', fontSize: '13px', color: '#7f1d1d', lineHeight: 1.4 }}>{skill.reasoning}</div>
                                        </div>
                                    ))}
                                    {cat.skills.filter((s: any) => s.isGap).length === 0 && (
                                        <div style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', padding: '12px' }}>Excellent! No significant gaps flagged in this category.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Skill-wise Performance Table */}
            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Skill-wise Video Performance</h2>
                <div className={styles.skillTableWrapper}>
                    <table className={styles.skillTable}>
                        <thead>
                            <tr>
                                <th>Skill Evaluated</th>
                                <th>Concept Coverage</th>
                                <th>Technical Score</th>
                                <th>Clarity Score</th>
                                <th>Confidence</th>
                                <th>Facial Expression</th>
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
                                        <td>{ans.confidenceScore !== undefined ? `${ans.confidenceScore} / 10` : 'N/A'}</td>
                                        <td>{ans.facialExpression || 'N/A'}</td>
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
                        <h4>Key Strengths</h4>
                        <ul className={styles.list}>
                            {Array.from(allStrengths).length > 0 ? (
                                Array.from(allStrengths).map((s, idx) => <li key={idx}>{s}</li>)
                            ) : (
                                <li>No clear strengths identified in this evaluation.</li>
                            )}
                        </ul>
                    </div>

                    <div className={`${styles.listColumn} ${styles.weaknesses}`}>
                        <h4>Areas to Improve</h4>
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

            {/* 🕒 Evaluation History Section */}
            {hasHistory && (
                <div className={styles.section} style={{ marginTop: '40px', borderTop: '2px dashed #e2e8f0', paddingTop: '40px' }}>
                    <h2 className={styles.sectionTitle} style={{ color: '#64748b' }}>🕒 Previous Evaluation History</h2>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Chronological record of your previous attempts and AI analysis.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {result.evaluationHistory?.map((hist: any, hIdx: number) => (
                            <div key={hIdx} style={{ background: '#fcfcfd', padding: '24px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h4 style={{ margin: 0, color: '#475569' }}>Attempt #{hIdx + 1}</h4>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {hist.archivedAt ? new Date(hist.archivedAt).toLocaleDateString() : 'Previous Attempt'}
                                    </span>
                                </div>

                                <div className={styles.scoreGrid} style={{ marginBottom: '20px' }}>
                                    <div className={styles.scoreCard} style={{ padding: '12px' }}>
                                        <h5 style={{ fontSize: '12px' }}>Overall Score</h5>
                                        <div className={styles.scoreValue} style={{ fontSize: '20px' }}>{hist.overallVideoScore?.toFixed(1)} / 10</div>
                                    </div>
                                    <div className={styles.scoreCard} style={{ padding: '12px' }}>
                                        <h5 style={{ fontSize: '12px' }}>AI Verdict</h5>
                                        <div className={styles.scoreValue} style={{ fontSize: '16px', color: '#6366f1' }}>{hist.eligibilitySignal}</div>
                                    </div>
                                </div>

                                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Executive Summary</h5>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{hist.executiveSummary}</p>
                                </div>

                                <div style={{ marginTop: '16px' }}>
                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Identified Skill Gaps</h5>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {hist.skillGap && hist.skillGap.length > 0 ? (
                                            hist.skillGap.map((sg: string, si: number) => (
                                                <span key={si} style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '4px', fontSize: '12px' }}>
                                                    {sg}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ color: '#10b981', fontSize: '12px' }}>No gaps identified.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
