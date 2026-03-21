'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    ArrowLeft, 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Calendar, 
    GraduationCap, 
    Award, 
    BarChart,
    ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '@/app/utils/api';
import styles from './StudentDetail.module.css';

const StudentDetailPage = () => {
    const { studentId } = useParams();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudentDetail = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Error fetching student detail:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudentDetail();
    }, [studentId]);

    if (loading) return <div className={styles.loading}>Loading Student Details...</div>;
    if (!data) return <div className={styles.error}>Student not found.</div>;

    const { profile, results } = data;
    const fullName = `${profile.firstName} ${profile.lastName}`;

    return (
        <div className={styles.container}>
            <Link href="/admin/students" className={styles.backLink}>
                <ArrowLeft size={18} /> Back to Student Management
            </Link>

            <div className={styles.profileHeader}>
                <div className={styles.avatarLarge}>
                    {profile.firstName.charAt(0).toUpperCase()}
                </div>
                <div className={styles.headerText}>
                    <h1 className={styles.name}>{fullName}</h1>
                    <div className={styles.metaRow}>
                        <span><Mail size={14} /> {profile.email}</span>
                        {profile.location && <span><MapPin size={14} /> {profile.location}</span>}
                    </div>
                </div>
            </div>

            <div className={styles.mainGrid}>
                {/* Left Column: Profile Info */}
                <div className={styles.leftColumn}>
                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}><User size={18} /> Personal Information</h2>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <label>Phone</label>
                                <p>{profile.phone || '-'}</p>
                            </div>
                            <div className={styles.infoItem}>
                                <label>Gender</label>
                                <p>{profile.gender || '-'}</p>
                            </div>
                            <div className={styles.infoItem}>
                                <label>Date of Birth</label>
                                <p>{profile.dob || '-'}</p>
                            </div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}><GraduationCap size={18} /> Academic Background</h2>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <label>University</label>
                                <p>{profile.university || '-'}</p>
                            </div>
                            <div className={styles.infoItem}>
                                <label>Major</label>
                                <p>{profile.major || '-'}</p>
                            </div>
                            <div className={styles.infoItem}>
                                <label>GPA</label>
                                <p>{profile.gpa || '-'}</p>
                            </div>
                        </div>
                    </section>

                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}><Award size={18} /> Skills</h2>
                        <div className={styles.skillsList}>
                            {profile.skills && profile.skills.length > 0 ? (
                                profile.skills.map((skill: string) => (
                                    <span key={skill} className={styles.skillTag}>{skill}</span>
                                ))
                            ) : (
                                <p className={styles.noData}>No skills listed.</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* Right Column: History */}
                <div className={styles.rightColumn}>
                    <section className={styles.card}>
                        <h2 className={styles.cardTitle}><BarChart size={18} /> Evaluation History</h2>
                        <div className={styles.timeline}>
                            {results.length > 0 ? (
                                results.map((res: any) => (
                                    <div key={res.id} className={styles.timelineItem}>
                                        <div className={styles.timelineDot}></div>
                                        <div className={styles.timelineContent}>
                                            <div className={styles.resHeader}>
                                                <h3>{res.courseTitle}</h3>
                                                <span className={styles.resDate}>
                                                    {new Date(res.timestamp).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className={styles.scoreRow}>
                                                <div className={styles.scoreInfo}>
                                                    <span className={styles.scoreLabel}>Final MCQ:</span>
                                                    <span className={styles.scoreValue}>{res.score}%</span>
                                                </div>
                                                <div className={styles.scoreInfo}>
                                                    <span className={styles.scoreLabel}>AI Video:</span>
                                                    <span className={styles.scoreValue}>{res.overallVideoScore || 0} / 10</span>
                                                </div>
                                            </div>
                                            <div className={styles.statusRow}>
                                                <span className={`${styles.statusBadge} ${styles[res.status?.replace(/\s+/g, '') || (res.isHistory ? 'Archived' : 'Pending')]}`}>
                                                    {res.status || (res.isHistory ? 'Archived' : 'Pending')}
                                                </span>
                                                {res.isHistory && (
                                                    <span className={styles.historyBadge}>Archived Attempt</span>
                                                )}
                                            </div>
                                            {res.skillGap && res.skillGap.length > 0 && (
                                                <div className={styles.gapList}>
                                                    <label>Identified Gaps:</label>
                                                    <div className={styles.gapTags}>
                                                        {res.skillGap.map((gap: string) => (
                                                            <span key={gap} className={styles.gapTag}>{gap}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {!res.isHistory && (
                                                <div className={styles.actions}>
                                                    <Link href={`/admin/evaluations/${res.id}`} className={styles.viewLink}>
                                                        View Detailed Analysis <ExternalLink size={14} />
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noData}>No evaluations found for this student.</div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default StudentDetailPage;
