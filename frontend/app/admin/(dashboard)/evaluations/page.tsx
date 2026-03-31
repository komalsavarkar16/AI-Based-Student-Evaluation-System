'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './Evaluations.module.css';

const EvaluationsPage = () => {
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvaluations = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/all-evaluations`, {
                    credentials: "include"
                });
                if (res.ok) {
                    const data = await res.json();
                    setEvaluations(data);
                }
            } catch (error) {
                console.error("Error fetching evaluations:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvaluations();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return { bg: '#dcfce7', text: '#166534' };
            case 'Bridge Course Recommended': return { bg: '#e0f2fe', text: '#0369a1' };
            case 'Retry Required': return { bg: '#fee2e2', text: '#991b1b' };
            case 'Pending': return { bg: '#fef9c3', text: '#854d0e' };
            default: return { bg: '#f1f5f9', text: '#475569' };
        }
    };

    if (loading) return <div className={styles.loading}>Loading Evaluations...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Student Admissions Evaluation</h1>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Course</th>
                            <th>MCQ Score</th>
                            <th>Video Score</th>
                            <th>AI Recommendation</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {evaluations.map((item) => {
                            const statusStyle = getStatusColor(item.status);
                            return (
                                <tr key={item.id} className={styles.row}>
                                    <td className={styles.studentName}>{item.studentName}</td>
                                    <td>
                                        <span className={styles.courseBadge}>{item.courseTitle}</span>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600 }}>{item.mcqScore}%</span>
                                    </td>
                                    <td>
                                        <span className={styles.scoreBadge} style={{
                                            backgroundColor: item.videoScore >= 7 ? '#dcfce7' : item.videoScore >= 5 ? '#fef9c3' : '#fee2e2',
                                            color: item.videoScore >= 7 ? '#166534' : item.videoScore >= 5 ? '#854d0e' : '#991b1b',
                                        }}>
                                            {item.videoScore === "Pending" ? "Pending" : `${item.videoScore} / 10`}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            color: item.eligibilitySignal === 'Eligible' ? '#166534' :
                                                item.eligibilitySignal === 'Bridge Course' ? '#0369a1' : '#334155',
                                            fontWeight: 500
                                        }}>
                                            {item.eligibilitySignal}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={styles.statusBadge} style={{
                                            backgroundColor: statusStyle.bg,
                                            color: statusStyle.text
                                        }}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td>
                                        <Link href={`/admin/evaluations/${item.id}`}>
                                            <button className={styles.viewBtn}>View Evaluation</button>
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {evaluations.length === 0 && (
                    <div className={styles.noData}>
                        No pending evaluations found.
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationsPage;
