import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './SkillGapAnalytics.module.css';

const SkillGapAnalytics = () => {
    const [weakSkillsData, setWeakSkillsData] = useState([]);
    const [coursePerformanceData, setCoursePerformanceData] = useState([]);
    const [overallStatus, setOverallStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const [skillsRes, courseRes, statusRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/admin/analytics/skill-gaps`, { credentials: "include" }),
                    fetch(`${API_BASE_URL}/admin/analytics/course-performance`, { credentials: "include" }),
                    fetch(`${API_BASE_URL}/admin/analytics/overall-status`, { credentials: "include" })
                ]);

                if (skillsRes.ok) setWeakSkillsData(await skillsRes.json());
                if (courseRes.ok) setCoursePerformanceData(await courseRes.json());
                if (statusRes.ok) setOverallStatus(await statusRes.json());
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className={styles.loading}>Loading Analytics...</div>;

    const passFailData = overallStatus ? [
        { name: 'Passing (Approved)', value: overallStatus.approved, color: '#57cc99' },
        { name: 'Failing (Retry Required)', value: overallStatus.retry, color: '#ff6b6b' },
        { name: 'Bridge Course', value: overallStatus.bridge, color: '#38a3a5' },
        { name: 'Ready for Retest', value: overallStatus.readyForRetest, color: '#4cc9f0' },
        { name: 'Pending', value: overallStatus.pending, color: '#64748b' }
    ] : [];

    return (
        <div className={styles.container}>
            <h2 className={styles.sectionTitle}>Macro View: Student Performance & Skill Analytics</h2>

            <div className={styles.chartsGrid}>
                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Pass vs Fail Ratio (%)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={passFailData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {passFailData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className={styles.macroStat}>
                        <span>Pass Rate: <strong>{overallStatus?.passPercent}%</strong></span>
                        <span>Stuck in Bridge: <strong>{overallStatus?.bridge} Students</strong></span>
                    </div>
                </div>

                {/* <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Most Common Weak Skills (AI Detected)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={weakSkillsData} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis dataKey="skill" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={120} />
                            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Bar dataKey="value" fill="#38a3a5" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div> */}

                <div className={styles.chartWrapper}>
                    <h3 className={styles.chartTitle}>Course-wise Performance (Avg AI Score)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={coursePerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
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
