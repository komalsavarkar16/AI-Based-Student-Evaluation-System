'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/utils/api';
import { DataTable, Column } from '@/app/components/DataTable/DataTable';
import styles from '@/app/components/DataTable/DataTable.module.css'; // Reuse shared styles if needed for specific tweaks

interface Student {
    id: string;
    name: string;
    email: string;
    mcqScore: string | number;
    videoScore: string | number;
    status: string;
    createdAt: string;
}

const StudentsPage = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/students`, {
                    credentials: "include"
                });
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

    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('active') || s.includes('approved')) return { backgroundColor: '#dcfce7', color: '#166534' };
        if (s.includes('completed')) return { backgroundColor: '#dbeafe', color: '#1e40af' };
        if (s.includes('learning') || s.includes('progress') || s.includes('bridge')) return { backgroundColor: '#fffbeb', color: '#92400e' };
        if (s.includes('retry')) return { backgroundColor: '#fee2e2', color: '#991b1b' };
        return { backgroundColor: '#f1f5f9', color: '#475569' };
    };

    const columns: Column<Student>[] = [
        {
            id: 'name',
            label: 'Name',
            render: (student) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                        fontWeight: 700, color: '#475569', flexShrink: 0
                    }}>
                        {student.name.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{student.name}</span>
                </div>
            )
        },
        { id: 'email', label: 'Email' },
        {
            id: 'mcqScore',
            label: 'MCQ Score',
            render: (student) => <span className={styles.score}>{student.mcqScore}</span>
        },
        {
            id: 'videoScore',
            label: 'Video Score',
            render: (student) => <span className={styles.score}>{student.videoScore} {student.videoScore !== 'N/A' && '/ 10'}</span>
        },
        {
            id: 'createdAt',
            label: 'CreatedAt',
            render: (student) => {
                const date = new Date(student.createdAt || '2024-06-01');
                return <span style={{ color: '#64748b' }}>{date.toISOString().split('T')[0]}</span>;
            }
        },
        {
            id: 'status',
            label: 'Status',
            render: (student) => {
                const colors = getStatusStyle(student.status);
                return (
                    <span className={styles.pill} style={colors}>
                        {student.status}
                    </span>
                );
            }
        },
        {
            id: 'actions',
            label: 'Actions',
            render: (student) => (
                <div style={{ textAlign: 'right' }}>
                    <Link href={`/admin/students/${student.id}`} className={styles.btnAction} style={{ display: 'inline-flex', padding: '8px 12px' }}>
                        View Profile
                    </Link>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: '2rem' }}>
            <DataTable
                title="Student Management"
                data={students}
                columns={columns}
                searchKey={['name', 'email']}
                searchPlaceholder="Filter students..."
                isLoading={loading}
                emptyMessage="Try adjusting your filters or search terms."
            />
        </div>
    );
};

export default StudentsPage;
