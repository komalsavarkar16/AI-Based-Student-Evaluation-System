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
                const res = await fetch(`${API_BASE_URL}/admin/all-evaluations`);
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
                                        backgroundColor: item.score >= 7 ? '#dcfce7' : item.score >= 5 ? '#fef9c3' : '#fee2e2',
                                        color: item.score >= 7 ? '#166534' : item.score >= 5 ? '#854d0e' : '#991b1b',
                                    }}>
                                        {item.score} / 10
                                    </span>
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
