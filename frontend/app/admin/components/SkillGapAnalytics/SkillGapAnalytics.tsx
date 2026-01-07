'use client';

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import styles from './SkillGapAnalytics.module.css';

const weakSkillsData = [
    { skill: 'Dynamic Programming', value: 75 },
    { skill: 'System Design', value: 68 },
    { skill: 'Concurrency', value: 62 },
    { skill: 'Unit Testing', value: 55 },
    { skill: 'Documentation', value: 48 },
];

const strongSkillsData = [
    { skill: 'Python Syntax', value: 92 },
    { skill: 'Git Basics', value: 88 },
    { skill: 'HTML/CSS', value: 85 },
    { skill: 'SQL Queries', value: 82 },
    { skill: 'State Mgmt', value: 79 },
];

const coursePerformanceData = [
    { name: 'Python', score: 82 },
    { name: 'Web Dev', score: 78 },
    { name: 'Data Sci', score: 75 },
    { name: 'AI/ML', score: 85 },
    { name: 'Cyber', score: 72 },
];

const yearTrendData = [
    { year: '2021', score: 68 },
    { year: '2022', score: 72 },
    { year: '2023', score: 76 },
    { year: '2024', score: 82 },
];

const SkillGapAnalytics = () => {
    return (
        <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Skill Gap Analytics</h2>

            <div className={styles.chartsGrid}>
                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Most Common Weak Skills</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={weakSkillsData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="skill" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={120} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar dataKey="value" fill="#f87171" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Strong Skills Across Batches</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={strongSkillsData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="skill" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Course-wise Performance</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={coursePerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={25} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Year-wise Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={yearTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SkillGapAnalytics;
