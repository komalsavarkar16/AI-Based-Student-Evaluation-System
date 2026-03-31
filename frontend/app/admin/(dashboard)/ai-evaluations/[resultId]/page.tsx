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
                const res = await fetch(`${API_BASE_URL}/admin/evaluation-report/${resultId}`, {
                    credentials: "include"
                });
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
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '14px', color: '#475569' }}>
                                    <div><strong>Confidence:</strong> {item.confidenceScore !== undefined ? `${item.confidenceScore}/10` : 'N/A'}</div>
                                    <div><strong>Expression:</strong> {item.facialExpression || 'N/A'}</div>
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

            {/* 🕒 Evaluation History Section */}
            {report.evaluationHistory && report.evaluationHistory.length > 0 && (
                <div className={styles.historySection} style={{ marginTop: '40px', borderTop: '2px dashed #e2e8f0', paddingTop: '40px' }}>
                    <h2 className={styles.sectionTitle} style={{ color: '#64748b' }}>🕒 Previous Evaluation History</h2>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>Chronological record of student's previous attempts.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {report.evaluationHistory.map((hist: any, hIdx: number) => (
                            <div key={hIdx} style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h4 style={{ margin: 0, color: '#475569' }}>Attempt #{hIdx + 1}</h4>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                        {hist.archivedAt ? new Date(hist.archivedAt).toLocaleDateString() : 'Previous Attempt'}
                                    </span>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Score</div>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{hist.overallVideoScore?.toFixed(1)} / 10</div>
                                    </div>
                                    <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Verdict</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#6366f1' }}>{hist.eligibilitySignal}</div>
                                    </div>
                                </div>

                                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '16px' }}>
                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569' }}>Executive Summary</h5>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>{hist.executiveSummary}</p>
                                </div>

                                <div>
                                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569' }}>Skill Gaps Flagged</h5>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {hist.skillGap && hist.skillGap.length > 0 ? (
                                            hist.skillGap.map((sg: string, si: number) => (
                                                <span key={si} style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>
                                                    {sg}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ color: '#10b981', fontSize: '12px' }}>Clean report - no gaps.</span>
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
};

export default EvaluationDetailPage;
