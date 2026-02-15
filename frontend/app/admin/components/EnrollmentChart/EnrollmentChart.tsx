'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './EnrollmentChart.module.css';

const data = [
    { name: 'Python Basics', students: 450 },
    { name: 'Web Dev', students: 380 },
    { name: 'Data Science', students: 290 },
    { name: 'AI/ML', students: 510 },
    { name: 'Cybersecurity', students: 160 },
];

const EnrollmentChart = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Students Enrolled per Course</h3>
            </div>
            <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 40, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#64748b', fontSize: 12, width: 100 }}
                            width={100}
                        />
                        <Tooltip
                            cursor={{ fill: '#f1f5f9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="students" fill="#80ed99" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default EnrollmentChart;
