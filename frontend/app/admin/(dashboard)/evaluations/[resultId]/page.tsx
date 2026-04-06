'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL, authenticatedFetch } from '@/app/utils/api';
import styles from './EvaluationDetail.module.css';
import {
    ArrowLeft,
    User,
    ClipboardList,
    Video,
    Brain,
    Lightbulb,
    CheckCircle,
    Info,
    MessageSquare,
    AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

const EvaluationDetailPage = () => {
    const { resultId } = useParams();
    const router = useRouter();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [decision, setDecision] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await authenticatedFetch(`${API_BASE_URL}/admin/evaluation-report/${resultId}`);
                if (res.ok) {
                    const data = await res.json();
                    setReport(data);
                    setDecision(data.status || 'Pending');
                    setNotes(data.decisionNotes || '');
                }
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [resultId]);

    const handleSubmitDecision = async () => {
        if (!decision || decision === 'Pending') {
            toast.warning("Please select a decision");
            return;
        }

        setSubmitting(true);
        try {
            const res = await authenticatedFetch(`${API_BASE_URL}/admin/submit-decision/${resultId}`, {
                method: 'POST',
                body: JSON.stringify({ status: decision, notes })
            });

            if (res.ok) {
                toast.success("Decision submitted successfully! 🎉");
                router.push('/admin/evaluations');
            } else {
                toast.error("Failed to submit decision");
            }
        } catch (error) {
            console.error("Error submitting decision:", error);
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading detailed evaluation...</div>;
    if (!report) return <div className={styles.container}>Report not found.</div>;

    const mcqScoreColor = report.mcqScore >= 70 ? '#10b981' : '#f59e0b';
    const videoScoreColor = report.overallScore >= 7 ? '#10b981' : report.overallScore >= 5 ? '#f59e0b' : '#ef4444';

    return (
        <div className={styles.container}>
            <Link href="/admin/evaluations" className={styles.backLink}>
                <ArrowLeft size={16} style={{ marginRight: '8px' }} /> Back to Evaluations
            </Link>

            <div className={styles.reportCard}>
                <header className={styles.header}>
                    <div className={styles.titleRow}>
                        <div>
                            <h1 className={styles.title}>Detailed Evaluation Report</h1>
                            <div className={styles.studentInfo}>
                                <strong>{report.student.name}</strong> • {report.courseTitle} • {report.student.email}
                            </div>
                        </div>
                        <div className={styles.mcqGrid} style={{ gap: '10px' }}>
                            <div className={styles.infoCard} style={{ padding: '10px 20px' }}>
                                <span className={styles.infoLabel}>Current Status</span>
                                <span className={styles.decisionValue} style={{
                                    color: report.status === 'Approved' ? '#10b981' :
                                        report.status === 'Bridge Course Recommended' ? '#0369a1' :
                                            report.status === 'Retry Required' ? '#ef4444' : '#f59e0b'
                                }}>{report.status}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}><User size={20} color="#6366f1" /> Section 1: Student Information</h3>
                    <div className={styles.mcqGrid}>
                        <div className={styles.infoCard}>
                            <span className={styles.infoLabel}>Name</span>
                            <span className={styles.infoValue}>{report.student.name}</span>
                        </div>
                        <div className={styles.infoCard}>
                            <span className={styles.infoLabel}>Email</span>
                            <span className={styles.infoValue}>{report.student.email}</span>
                        </div>
                        <div className={styles.infoCard}>
                            <span className={styles.infoLabel}>Course Applied</span>
                            <span className={styles.infoValue}>{report.courseTitle}</span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}><ClipboardList size={20} color="#f59e0b" /> Section 2: MCQ Performance</h3>
                    <div className={styles.mcqGrid}>
                        <div className={styles.infoCard}>
                            <span className={styles.infoLabel}>MCQ Score</span>
                            <span className={styles.infoValue} style={{ color: mcqScoreColor }}>{report.mcqScore}%</span>
                        </div>
                        <div className={styles.infoCard}>
                            <span className={styles.infoLabel}>MCQ Result</span>
                            <span className={styles.infoValue} style={{ color: mcqScoreColor }}>
                                {report.mcqScore >= 70 ? 'Passed' : 'Needs Improvement'}
                            </span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}><Video size={20} color="#10b981" /> Section 3: Video Test Analysis</h3>
                    <div className={styles.tableWrapper}>
                        <table className={styles.videoTable}>
                            <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Transcript</th>
                                    <th>AI Score</th>
                                    <th>Confidence</th>
                                    <th>Facial Expression</th>
                                    <th>Feedback</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.videoAnswers.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 600 }}>{item.questionId}</td>
                                        <td>
                                            <p className={styles.transcriptText}>"{item.transcript}"</p>
                                        </td>
                                        <td>
                                            <span className={styles.videoScoreBadge} style={{
                                                backgroundColor: (item.analysis?.technicalScore || 0) >= 7 ? '#dcfce7' : (item.analysis?.technicalScore || 0) >= 5 ? '#fef9c3' : '#fee2e2',
                                                color: (item.analysis?.technicalScore || 0) >= 7 ? '#166534' : (item.analysis?.technicalScore || 0) >= 5 ? '#854d0e' : '#991b1b',
                                            }}>
                                                {item.analysis?.technicalScore || 0} / 10
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#475569' }}>
                                                {item.confidenceScore !== undefined ? `${item.confidenceScore} / 10` : 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#334155', fontSize: '13px' }}>
                                                {item.facialExpression || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.feedbackText}>
                                                <strong>Feedback:</strong> {item.analysis?.feedback}
                                                {item.analysis?.improvementAreas?.length > 0 && (
                                                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
                                                        <strong>Improvements:</strong> {item.analysis.improvementAreas.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}><Brain size={20} color="#8b5cf6" /> Section 4: Gap Discovery Analysis</h3>
                    <div className={styles.skillGapContainer}>
                        {report.detailedSkillGap && report.detailedSkillGap.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                {report.detailedSkillGap.map((cat: any, i: number) => (
                                    <div key={i} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                                        <h4 style={{ margin: '0 0 10px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '8px', height: '8px', background: '#8b5cf6', borderRadius: '50%' }}></span>
                                            {cat.category}
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {cat.skills.filter((s: any) => s.isGap).map((skill: any, j: number) => (
                                                <div key={j} style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', fontSize: '13px', width: '100%' }}>
                                                    <div style={{ fontWeight: 600 }}>{skill.skillName} (Score: {skill.score}/{skill.threshold})</div>
                                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#7f1d1d' }}>{skill.reasoning}</div>
                                                </div>
                                            ))}
                                            {cat.skills.filter((s: any) => s.isGap).length === 0 && (
                                                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No significant gaps in this category.</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : report.skillGap && report.skillGap.length > 0 ? (
                            report.skillGap.map((skill: string, i: number) => (
                                <div key={i} className={styles.skillCard}>{skill}</div>
                            ))
                        ) : (
                            <div className={styles.noGap}>
                                <CheckCircle size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                No significant skill gaps detected.
                            </div>
                        )}
                    </div>
                </section>

                <section className={styles.section}>
                    <h3 className={styles.sectionTitle}><Lightbulb size={20} color="#6366f1" /> Section 5: Golden Report (AI Recommendation)</h3>
                    <div className={`${styles.recommendationBox} ${report.eligibilitySignal === 'Bridge Course' ? styles.bridge : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#7f1d1d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={18} /> 1. The Competency Gap
                            </h4>
                            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                                {report.competencyGapReport || "No detailed competency gap recorded."}
                            </p>
                        </div>

                        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Video size={18} /> 2. The "Vibe" Check (Video Insights)
                            </h4>
                            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                                {report.vibeCheck || "No vibe check Insights recorded."}
                            </p>
                        </div>

                        <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#4c1d95', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Brain size={18} /> 3. The AI Verdict
                            </h4>
                            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
                                <strong>{report.aiVerdict || "No specific AI verdict reached."}</strong>
                            </p>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
                                <em>Additional summary: {report.executiveSummary}</em>
                            </div>
                        </div>

                    </div>
                </section>

                <section className={styles.decisionSection}>
                    <h3 className={styles.noGap}><CheckCircle size={24} color="#57cc99" /> <strong className={styles.admTitle}>Admin Decision</strong></h3>

                    <div className={styles.radioGroup}>
                        <div
                            className={`${styles.radioItem} ${decision === 'Approved' ? styles.selected : ''} ${report.status !== 'Pending' ? styles.disabled : ''}`}
                            onClick={() => report.status === 'Pending' && setDecision('Approved')}
                        >
                            <input type="radio" checked={decision === 'Approved'} readOnly />
                            <div className={styles.labelContent}>
                                <span className={styles.optionLabel}>Approve Admission</span>
                                <span className={styles.optionDesc}>Student meets all criteria and can enroll.</span>
                            </div>
                        </div>

                        <div
                            className={`${styles.radioItem} ${decision === 'Bridge Course Recommended' ? styles.selected : ''} ${report.status !== 'Pending' ? styles.disabled : ''}`}
                            onClick={() => report.status === 'Pending' && setDecision('Bridge Course Recommended')}
                        >
                            <input type="radio" checked={decision === 'Bridge Course Recommended'} readOnly />
                            <div className={styles.labelContent}>
                                <span className={styles.optionLabel}>Recommend Bridge Course</span>
                                <span className={styles.optionDesc}>Student must learn basics first as per AI skill gap analysis.</span>
                            </div>
                        </div>

                        <div
                            className={`${styles.radioItem} ${decision === 'Retry Required' ? styles.selected : ''} ${report.status !== 'Pending' ? styles.disabled : ''}`}
                            onClick={() => report.status === 'Pending' && setDecision('Retry Required')}
                        >
                            <input type="radio" checked={decision === 'Retry Required'} readOnly />
                            <div className={styles.labelContent}>
                                <span className={styles.optionLabel}>Reject / Retry</span>
                                <span className={styles.optionDesc}>Student must improve and attempt the evaluation again.</span>
                            </div>
                        </div>
                    </div>

                    <h4 className={styles.sectionTitle} style={{ fontSize: '16px' }}><MessageSquare size={18} /> Add Decision Notes</h4>
                    <textarea
                        className={styles.notesArea}
                        placeholder="Example: Student has good communication but weak DB knowledge. Recommend SQL bridge module..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={report.status !== 'Pending'}
                    />

                    <button
                        className={styles.submitBtn}
                        onClick={handleSubmitDecision}
                        disabled={submitting || report.status !== 'Pending'}
                    >
                        {submitting ? 'Submitting Decision...' :
                            report.status !== 'Pending' ? 'Decision Finalized' : 'Submit Decision'}
                    </button>

                    {report.decidedAt && (
                        <div className={styles.currentDecision}>
                            <h4>Decision already recorded on {new Date(report.decidedAt).toLocaleString()}</h4>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default EvaluationDetailPage;
