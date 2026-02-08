"use client";
import React, { useState, useEffect } from 'react';
import StudentNavbar from '../components/StudentNavbar/StudentNavbar';
import styles from './tests.module.css';
import { API_BASE_URL } from '@/app/utils/api';
import { Brain, Video, ListChecks, ArrowRight, PlayCircle } from 'lucide-react';
import Link from 'next/link';

interface Course {
    _id: string;
    title: string;
    category: string;
    level: string;
    aiStatus: {
        mcqGenerated: boolean;
        videoQuestionsGenerated: boolean;
    };
}

interface TestStatus {
    completed: boolean;
    passed: boolean;
    score: number;
}

export default function TestsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const studentId = localStorage.getItem("student_id");

            const coursesRes = await fetch(`${API_BASE_URL}/courses/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const coursesData = await coursesRes.json();
            setCourses(coursesData);

            if (studentId) {
                const statuses: Record<string, TestStatus> = {};
                for (const course of coursesData) {
                    const statusRes = await fetch(`${API_BASE_URL}/student/check-test-status/${studentId}/${course._id}`);
                    if (statusRes.ok) {
                        statuses[course._id] = await statusRes.json();
                    }
                }
                setTestStatuses(statuses);
            }
        } catch (error) {
            console.error("Error fetching tests data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <StudentNavbar />
                <div className={styles.spinnerWrapper}>
                    <div className={styles.spinner}></div>
                    <p>Loading your assessments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <StudentNavbar />
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.pageTitle}>Available Assessments</h1>
                    <p className={styles.pageSubTitle}>Complete your MCQ evaluations to unlock advanced video-based tests.</p>
                </header>

                <div className={styles.testsGrid}>
                    {courses.map((course) => {
                        const status = testStatuses[course._id] || { completed: false, passed: false, score: 0 };
                        const mcqReady = course.aiStatus?.mcqGenerated;

                        return (
                            <div key={course._id} className={styles.testCard}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.category}>{course.category}</span>
                                    <h2 className={styles.courseTitle}>{course.title}</h2>
                                    <span className={styles.levelBadge}>{course.level}</span>
                                </div>

                                <div className={styles.testsList}>
                                    {/* MCQ Test Section */}
                                    <div className={`${styles.testItem} ${status.completed ? styles.completed : ''}`}>
                                        <div className={styles.testInfo}>
                                            <div className={styles.iconBox}>
                                                <ListChecks size={20} />
                                            </div>
                                            <div>
                                                <h3>MCQ Assessment</h3>
                                                <p>{status.completed ? `Score: ${status.score}%` : 'Theoretical knowledge evaluation'}</p>
                                            </div>
                                        </div>
                                        {status.completed ? (
                                            <span className={`${styles.statusBadge} ${status.passed ? styles.passed : styles.failed}`}>
                                                {status.passed ? 'Passed' : 'Failed'}
                                            </span>
                                        ) : (
                                            mcqReady ? (
                                                <Link href={`/student/test/${course._id}`} className={styles.startLink}>
                                                    Start <ArrowRight size={16} />
                                                </Link>
                                            ) : (
                                                <span className={styles.notReadyBadge}>Not Ready</span>
                                            )
                                        )}
                                    </div>

                                    {/* Video Test Section - ONLY SHOW IF PASSED MCQ */}
                                    {status.passed && (
                                        <div className={styles.testItem}>
                                            <div className={styles.testInfo}>
                                                <div className={`${styles.iconBox} ${styles.videoIconBox}`}>
                                                    <Video size={20} />
                                                </div>
                                                <div>
                                                    <h3>Video Assessment</h3>
                                                    <p>Communication & soft skills evalutaion</p>
                                                </div>
                                            </div>
                                            <Link href={`/student/video-test/${course._id}`} className={styles.videoStartBtn}>
                                                <PlayCircle size={18} /> Take Test
                                            </Link>
                                        </div>
                                    )}

                                    {!status.passed && status.completed && (
                                        <div className={styles.lockedMessage}>
                                            <p>Pass the MCQ test with 70% or more to unlock the video assessment.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
