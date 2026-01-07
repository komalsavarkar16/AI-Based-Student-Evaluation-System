import React from 'react';
import styles from './PendingDecisions.module.css';

const PendingDecisions = () => {
    const pending = [
        { id: 1, name: 'Emma Watson', course: 'AI/ML', date: '2024-01-03', reason: 'High Deviation' },
        { id: 2, name: 'James Potter', course: 'Python Basics', date: '2024-01-04', reason: 'Manual Review Req' },
        { id: 3, name: 'Luna Lovegood', course: 'Web Dev', date: '2024-01-04', reason: 'Score Conflict' },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Pending Decisions</h3>
                <span className={styles.count}>{pending.length} New</span>
            </div>

            <div className={styles.list}>
                {pending.map((item) => (
                    <div key={item.id} className={item.id === 3 ? styles.itemLast : styles.item}>
                        <div className={styles.info}>
                            <span className={styles.name}>{item.name}</span>
                            <span className={styles.course}>{item.course}</span>
                        </div>
                        <div className={styles.meta}>
                            <span className={styles.reason}>{item.reason}</span>
                            <button className={styles.reviewBtn}>Review</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PendingDecisions;
