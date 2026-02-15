'use client';

import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './SkillGapAnalytics.module.css';

const SkillGapAnalytics = () => {
    const [weakSkillsData, setWeakSkillsData] = useState([]);
    const [coursePerformanceData, setCoursePerformanceData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [skillsRes, courseRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/admin/analytics/skill-gaps`),
                    fetch(`${API_BASE_URL}/admin/analytics/course-performance`)
                ]);

                if (skillsRes.ok) setWeakSkillsData(await skillsRes.json());
                if (courseRes.ok) setCoursePerformanceData(await courseRes.json());
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className={styles.loading}>Loading Skill Analytics...</div>;

    return (
        <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Real-time Skill Gap Analytics</h2>

            <div className={styles.chartsGrid}>
                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Most Common Weak Skills (AI Detected)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={weakSkillsData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="skill" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={120} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar dataKey="value" fill="#38a3a5" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Course-wise Performance (Avg AI Score)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={coursePerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis domain={[0, 10]} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar dataKey="score" fill="#57cc99" radius={[4, 4, 0, 0]} barSize={35} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SkillGapAnalytics;
