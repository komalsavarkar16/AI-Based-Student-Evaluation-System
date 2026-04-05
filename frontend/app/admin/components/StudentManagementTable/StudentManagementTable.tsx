'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './StudentManagementTable.module.css';

const StudentManagementTable = () => {
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecentEvaluations = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/evaluations/recent`, {
                    credentials: "include"
                });
                if (res.ok) {
                    const data = await res.json();
                    setEvaluations(data || []);
                }
            } catch (error) {
                console.error("Error fetching evaluations:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRecentEvaluations();
    }, []);

    if (loading) return <div className={styles.loading}>Loading student data...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Recent AI Evaluations</h3>
                <Link href="/admin/evaluations" className={styles.viewAll}>View All</Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>AI Score</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {evaluations.length === 0 ? (
                            <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>No reports yet</td></tr>
                        ) : (
                            evaluations.map((evalItem) => (
                                <tr key={evalItem.id} className={styles.row}>
                                    <td>
                                        <div className={styles.studentInfo}>
                                            <div className={styles.avatar}>
                                                {evalItem.studentName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className={styles.name}>{evalItem.studentName}</div>
                                                <div className={styles.course}>{evalItem.courseTitle}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${evalItem.status === 'Approved' ? styles.completed : styles.pending}`}>
                                            {evalItem.status || 'Evaluated'}
                                        </span>
                                    </td>
                                    <td>{evalItem.videoScore} / 10</td>
                                    <td>
                                        <Link href={`/admin/evaluations/${evalItem.id}`}>
                                            <button className={styles.actionButton}>View Report</button>
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentManagementTable;
