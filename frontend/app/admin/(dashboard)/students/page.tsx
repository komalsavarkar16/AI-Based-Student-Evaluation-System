'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './students.module.css';

const StudentsPage = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/students`);
                if (res.ok) {
                    const data = await res.json();
                    setStudents(data);
                }
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className={styles.loading}>Loading student records...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Student Management</h1>
                <input
                    type="text"
                    placeholder="Search students..."
                    className={styles.searchBar}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>MCQ Score (Latest)</th>
                            <th>Video AI Score (Latest)</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                            <tr key={student.id} className={styles.row}>
                                <td>
                                    <div className={styles.studentInfo}>
                                        <div className={styles.avatar}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className={styles.name}>{student.name}</div>
                                    </div>
                                </td>
                                <td>{student.email}</td>
                                <td>
                                    <span style={{ fontWeight: 600, color: student.mcqScore >= 70 ? '#166534' : student.mcqScore === 'N/A' ? '#64748b' : '#991b1b' }}>
                                        {student.mcqScore}
                                    </span>
                                </td>
                                <td>
                                    <span style={{ fontWeight: 600, color: student.videoScore >= 7 ? '#166534' : student.videoScore === 'N/A' ? '#64748b' : '#991b1b' }}>
                                        {student.videoScore}{student.videoScore !== 'N/A' && ' / 10'}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.statusBadge}>{student.status}</span>
                                </td>
                                <td>
                                    <button className={styles.viewBtn}>View Profile</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredStudents.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        No students found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentsPage;
