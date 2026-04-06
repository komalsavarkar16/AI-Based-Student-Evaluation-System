'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, authenticatedFetch } from '@/app/utils/api';
import { DataTable, Column } from '@/app/components/DataTable/DataTable';
import styles from '@/app/components/DataTable/DataTable.module.css';

interface Evaluation {
    id: string;
    studentName: string;
    courseTitle: string;
    mcqScore: number;
    videoScore: string | number;
    eligibilitySignal: string;
    status: string;
}

const EvaluationsPage = () => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvaluations = async () => {
            try {
                const res = await authenticatedFetch(`${API_BASE_URL}/admin/all-evaluations`);
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

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Approved': return { backgroundColor: '#dcfce7', color: '#166534' };
            case 'Bridge Course Recommended': return { backgroundColor: '#e0f2fe', color: '#0369a1' };
            case 'Retry Required': return { backgroundColor: '#fee2e2', color: '#991b1b' };
            case 'Pending': return { backgroundColor: '#fef9c3', color: '#854d0e' };
            default: return { backgroundColor: '#f1f5f9', color: '#475569' };
        }
    };

    const columns: Column<Evaluation>[] = [
        {
            id: 'studentName',
            label: 'Student',
            render: (item) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.studentName}</span>
        },
        {
            id: 'courseTitle',
            label: 'Course',
            render: (item) => (
                <span style={{
                    backgroundColor: '#f1f5f9', color: '#475569',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                    fontWeight: 500
                }}>
                    {item.courseTitle}
                </span>
            )
        },
        {
            id: 'mcqScore',
            label: 'MCQ Score',
            render: (item) => <span style={{ fontWeight: 600 }}>{item.mcqScore}%</span>
        },
        {
            id: 'videoScore',
            label: 'Video Score',
            render: (item) => {
                const isPending = item.videoScore === "Pending";
                const score = typeof item.videoScore === 'number' ? item.videoScore : 0;
                return (
                    <span className={styles.pill} style={{
                        backgroundColor: isPending ? '#fef9c3' : score >= 7 ? '#dcfce7' : score >= 5 ? '#fef9c3' : '#fee2e2',
                        color: isPending ? '#854d0e' : score >= 7 ? '#166534' : score >= 5 ? '#854d0e' : '#991b1b',
                    }}>
                        {isPending ? "Pending" : `${item.videoScore} / 10`}
                    </span>
                );
            }
        },
        {
            id: 'eligibilitySignal',
            label: 'AI Verdict',
            render: (item) => (
                <span style={{
                    color: item.eligibilitySignal === 'Eligible' ? '#166534' :
                        item.eligibilitySignal === 'Bridge Course' ? '#0369a1' : '#334155',
                    fontWeight: 500
                }}>
                    {item.eligibilitySignal}
                </span>
            )
        },
        {
            id: 'status',
            label: 'Status',
            render: (item) => {
                const colors = getStatusStyle(item.status);
                return (
                    <span className={styles.pill} style={colors}>
                        {item.status}
                    </span>
                );
            }
        },
        {
            id: 'actions',
            label: 'Actions',
            render: (item) => (
                <div style={{ textAlign: 'right' }}>
                    <Link href={`/admin/evaluations/${item.id}`} className={styles.btnAction} style={{ display: 'inline-flex', padding: '8px 12px' }}>
                        View Evaluation
                    </Link>
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: '2rem' }}>
            <DataTable
                title="Student Admissions Evaluation"
                data={evaluations}
                columns={columns}
                searchKey={['studentName', 'courseTitle']}
                searchPlaceholder="Filter evaluations..."
                isLoading={loading}
                emptyMessage="No pending evaluations found."
            />
        </div>
    );
};

export default EvaluationsPage;
