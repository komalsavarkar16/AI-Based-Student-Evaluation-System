'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './EvaluationReport.module.css';
import { ArrowLeft, BrainCircuit, AlertTriangle, CheckCircle2 } from 'lucide-react';

const EvaluationDetailPage = () => {
    const { resultId } = useParams();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/evaluation-report/${resultId}`);
                if (res.ok) {
                    const data = await res.json();
                    setReport(data);
                }
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [resultId]);

    if (loading) return <div className={styles.loading}>Generating detailed report...</div>;
    if (!report) return <div className={styles.container}>Report not found.</div>;

    const scoreColor = report.overallScore >= 7 ? '#10b981' : report.overallScore >= 5 ? '#f59e0b' : '#ef4444';

    return (
        <div className={styles.container}>
            <Link href="/admin/ai-evaluations" className={styles.backLink}>
                <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Back to All Evaluations
            </Link>

            <div className={styles.reportCard}>
                <header className={styles.header}>
                    <div className={styles.titleRow}>
                        <div>
                            <h1 className={styles.title}>AI Evaluation Report</h1>
                            <div className={styles.studentInfo}>
                                <strong>{report.student.name}</strong> • {report.courseTitle}
                            </div>
                        </div>
                        <div className={styles.scoreCircle} style={{ borderColor: scoreColor, color: scoreColor }}>
                            <span className={styles.scoreValue}>{report.overallScore}</span>
                            <span className={styles.scoreLabel}>Overall</span>
                        </div>
                    </div>
                </header>

                <section className={styles.summarySection}>
                    <h3 className={styles.sectionTitle}>
                        <AlertTriangle size={18} color="#ef4444" /> Skill Gaps Detected
                    </h3>
                    <div className={styles.skillGapContainer}>
                        {report.skillGap.length > 0 ? (
                            report.skillGap.map((skill: string, i: number) => (
                                <div key={i} className={styles.skillCard}>{skill}</div>
                            ))
                        ) : (
                            <div className={styles.noGap}>
                                <CheckCircle2 size={16} color="#10b981" /> No significant skill gaps detected.
                            </div>
                        )}
                    </div>
                </section>

                <section className={styles.analysisSection}>
                    <h3 className={styles.sectionTitle}>
                        <BrainCircuit size={18} color="#6366f1" /> Itemized Analysis
                    </h3>
                    <div className={styles.answerGrid}>
                        {report.videoAnswers.map((item: any, idx: number) => (
                            <div key={idx} className={styles.answerCard}>
                                <div className={styles.questionHeader}>
                                    <span className={styles.questionText}>{item.questionId}: {item.relatedSkill}</span>
                                    <span className={styles.qScore}>Score: {item.analysis?.technicalScore}/10</span>
                                </div>
                                <div className={styles.transcript}>
                                    "{item.transcript}"
                                </div>
                                <div className={styles.feedbackBox}>
                                    <div className={styles.feedbackTitle}>AI Feedback</div>
                                    <p className={styles.feedbackText}>{item.analysis?.feedback}</p>

                                    {item.analysis?.improvementAreas?.length > 0 && (
                                        <ul className={styles.improvementList}>
                                            {item.analysis.improvementAreas.map((area: string, i: number) => (
                                                <li key={i} className={styles.improvementItem}>{area}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default EvaluationDetailPage;
