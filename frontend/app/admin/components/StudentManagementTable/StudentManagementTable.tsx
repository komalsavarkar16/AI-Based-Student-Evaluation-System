import React from 'react';
import Link from 'next/link';
import styles from './StudentManagementTable.module.css';

const StudentManagementTable = () => {
    const students = [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com', status: 'Completed', score: 85 },
        { id: 2, name: 'Bob Smith', email: 'bob@example.com', status: 'Pending', score: '-' },
        { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', status: 'Completed', score: 92 },
        { id: 4, name: 'Diana Ross', email: 'diana@example.com', status: 'Completed', score: 78 },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Recent Students</h3>
                <Link href="/admin/students" className={styles.viewAll}>View All</Link>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Status</th>
                            <th>Score</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student) => (
                            <tr key={student.id} className={styles.row}>
                                <td>
                                    <div className={styles.studentInfo}>
                                        <div className={styles.avatar}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className={styles.name}>{student.name}</div>
                                            <div className={styles.email}>{student.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`${styles.badge} ${student.status === 'Completed' ? styles.completed : styles.pending}`}>
                                        {student.status}
                                    </span>
                                </td>
                                <td>{student.score}</td>
                                <td>
                                    <button className={styles.actionButton}>View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentManagementTable;
