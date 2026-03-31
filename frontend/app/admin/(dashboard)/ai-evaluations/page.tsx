'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './AIEvaluations.module.css';

const AIEvaluationsPage = () => {
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
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
        fetchData();
    }, []);

    if (loading) return <div className={styles.loading}>Loading AI Reports...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>AI Evaluation Reports</h1>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Course</th>
                            <th>AI Score</th>
                            <th>Skill Gaps</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {evaluations.map((item) => (
                            <tr key={item.id} className={styles.row}>
                                <td className={styles.studentName}>{item.studentName}</td>
                                <td>
                                    <span className={styles.courseBadge}>{item.courseTitle}</span>
                                </td>
                                <td>
                                    <span className={styles.scoreBadge} style={{
                                        backgroundColor: typeof item.videoScore === 'number' ? (item.videoScore >= 7 ? '#dcfce7' : item.videoScore >= 5 ? '#fef9c3' : '#fee2e2') : '#f1f5f9',
                                        color: typeof item.videoScore === 'number' ? (item.videoScore >= 7 ? '#166534' : item.videoScore >= 5 ? '#854d0e' : '#991b1b') : '#64748b',
                                    }}>
                                        {item.videoScore} {typeof item.videoScore === 'number' ? '/ 10' : ''}
                                    </span>
                                    {item.historyCount > 0 && (
                                        <span style={{
                                            marginLeft: '8px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            background: '#f1f5f9',
                                            color: '#64748b',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            {item.historyCount} Old Reports
                                        </span>
                                    )}
                                </td>
                                <td>
                                    {item.skillGap && item.skillGap.length > 0 ? (
                                        item.skillGap.map((skill: string, i: number) => (
                                            <span key={i} className={styles.skillBadge}>{skill}</span>
                                        ))
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>None detected</span>
                                    )}
                                </td>
                                <td>
                                    <span className={styles.statusBadge} style={{
                                        backgroundColor: item.status === 'Approved' ? '#dcfce7' : 
                                                        item.status === 'READY_FOR_RETEST' ? '#e0f2fe' : 
                                                        item.status === 'Bridge Course Recommended' ? '#fff7ed' : '#f1f5f9',
                                        color: item.status === 'Approved' ? '#166534' : 
                                               item.status === 'READY_FOR_RETEST' ? '#0369a1' : 
                                               item.status === 'Bridge Course Recommended' ? '#9a3412' : '#64748b',
                                    }}>
                                        {item.status.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td>{new Date(item.timestamp).toLocaleDateString()}</td>
                                <td>
                                    <Link href={`/admin/ai-evaluations/${item.id}`}>
                                        <button className={styles.viewBtn}>View Analysis</button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {evaluations.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No evaluation reports found yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIEvaluationsPage;
