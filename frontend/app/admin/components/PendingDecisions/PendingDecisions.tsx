'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './PendingDecisions.module.css';

const PendingDecisions = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/notifications`);
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (error) {
                console.error("Error fetching notifications:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, []);

    if (loading) return <div className={styles.loading}>Loading notifications...</div>;

    const evaluations = notifications.filter(n => n.type === 'video_test_evaluation');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Recent AI Evaluations</h3>
                <span className={styles.count}>{evaluations.length} Reports</span>
            </div>

            <div className={styles.list}>
                {evaluations.length === 0 ? (
                    <p className={styles.empty}>No recent evaluations to display.</p>
                ) : (
                    evaluations.map((item, index) => (
                        <div key={item._id} className={index === evaluations.length - 1 ? styles.itemLast : styles.item}>
                            <div className={styles.info}>
                                <span className={styles.name}>{item.studentName}</span>
                                <span className={styles.course}>{item.courseTitle}</span>
                            </div>
                            <div className={styles.meta}>
                                <span className={styles.scoreBadge} style={{
                                    backgroundColor: item.score >= 7 ? '#dcfce7' : item.score >= 5 ? '#fef9c3' : '#fee2e2',
                                    color: item.score >= 7 ? '#166534' : item.score >= 5 ? '#854d0e' : '#991b1b',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap'
                                }}>
                                    Score: {item.score}
                                </span>
                                <Link href={`/admin/ai-evaluations/${item.id || item._id}`}>
                                    <button className={styles.reviewBtn}>View Report</button>
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PendingDecisions;
