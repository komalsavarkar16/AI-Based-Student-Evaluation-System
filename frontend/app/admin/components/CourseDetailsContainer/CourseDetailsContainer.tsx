"use client"
import { useEffect, useState } from "react";
import { Course } from "../../../types/course";
import styles from "./courseDetailsContainer.module.css";
import { BrainCircuit, Video, Clock, BarChart, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/app/utils/api";

interface courseDetailsProps {
    courseId: string;
    isAdmin?: boolean;
}

export default function CourseDetailsContainer({ courseId, isAdmin = true }: courseDetailsProps) {
    const router = useRouter();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingMcq, setGeneratingMcq] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);

    useEffect(() => {
        fetchCourse()
        checkTestCompletion()
    }, [])

    const checkTestCompletion = async () => {
        const studentId = localStorage.getItem("student_id");
        if (!studentId || isAdmin) return;

        try {
            const res = await fetch(`${API_BASE_URL}/student/check-test-status/${studentId}/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setTestCompleted(data.completed);
            }
        } catch (error) {
            console.error("Error checking test status:", error);
        }
    };

    const fetchCourse = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
            const data = await response.json()
            setCourse(data)
        }
        catch (error) {
            console.error(error);
            toast.error("Failed to load course details");
        }
        finally {
            setLoading(false)
        }
    }

    const handleGenerateMCQ = async () => {
        setGeneratingMcq(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE_URL}/ai/generate/mcq/${courseId}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                toast.success("MCQs generated successfully!");
            } else {
                throw new Error("Failed to generate MCQs");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error generating MCQs");
        } finally {
            setGeneratingMcq(false);
        }
    };

    const handleEnroll = async () => {
        try {
            const studentId = localStorage.getItem("student_id");
            if (!studentId) {
                toast.error("Please login as a student to enroll");
                router.push("/student/login");
                return;
            }

            // 1. Fetch student profile to check skills and academic details
            const profileRes = await fetch(`${API_BASE_URL}/student/profile/${studentId}`);
            if (!profileRes.ok) {
                toast.error("Failed to verify profile details");
                return;
            }

            const profile = await profileRes.json();

            // 2. Check if skills and academic details are filled
            const hasSkills = profile.skills && profile.skills.length > 0;
            const hasAcademicDetails = profile.university && profile.major && profile.year && profile.gpa;

            if (!hasSkills || !hasAcademicDetails) {
                toast.warning("Please fill your skills and academic details in your profile before enrolling.");
                router.push("/student/profile");
                return;
            }

            // 3. Check if MCQs exist for the course
            const mcqRes = await fetch(`${API_BASE_URL}/ai/get/mcq/${courseId}`);
            if (!mcqRes.ok) {
                if (mcqRes.status === 404) {
                    toast.info("Assessment is not yet ready for this course. Please contact administrator.");
                } else {
                    toast.error("Error fetching assessment details");
                }
                return;
            }

            toast.success("Redirecting to the MCQ Assessment...");
            router.push(`/student/test/${courseId}`);

        } catch (error) {
            console.error(error);
            toast.error("Failed to enroll in the course");
        }
    };

    const handleVideoTest = () => {
        toast.info("Video-based assessment feature is coming soon!");
        // router.push(`/student/video-test/${courseId}`);
    };


    // const handleGenerateVideoQuestions = async () => {
    //     setGeneratingVideo(true);
    //     try {
    //         const response = await fetch(`${API_BASE_URL}/courses/${courseId}/generate-video-questions`, {
    //             method: "POST"
    //         });
    //         if (response.ok) {
    //             toast.success("Video questions generated successfully!");
    //         } else {
    //             throw new Error("Failed to generate video questions");
    //         }
    //     } catch (error) {
    //         console.error(error);
    //         toast.error("Error generating video questions");
    //     } finally {
    //         setGeneratingVideo(false);
    //     }
    // };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading course details...</p>
            </div>
        );
    }

    if (!course) return <p className={styles.container}>Course not found</p>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <p className={styles.category}>{course.category.toUpperCase()}</p>
                <h1 className={styles.title}>{course.title}</h1>
                <div className={styles.skillsContainer}>
                    {course.skills_required.map((skill, index) => (
                        <span key={index} className={styles.skillBadge}>{skill}</span>
                    ))}
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <Clock size={20} color="#5664f5" />
                    <span className={styles.statLabel}>Duration</span>
                    <span className={styles.statValue}>{course.duration}</span>
                </div>
                <div className={styles.statCard}>
                    <BarChart size={20} color="#a855f7" />
                    <span className={styles.statLabel}>Level</span>
                    <span className={styles.statValue}>{course.level}</span>
                </div>
                <div className={styles.statCard}>
                    <GraduationCap size={20} color="#10b981" />
                    <span className={styles.statLabel}>Status</span>
                    <span className={styles.statValue}>{course.status}</span>
                </div>
            </div>

            <div className={styles.contentRow}>
                <div className={styles.mainSection}>
                    <h2 className={styles.sectionTitle}>Course Description</h2>
                    <p className={styles.description}>{course.description}</p>
                </div>

                <div className={styles.actionsSection}>
                    {isAdmin ? (
                        <div className={styles.actionCard}>
                            <h3 className={styles.sectionTitle}>AI Generation</h3>
                            <button
                                className={`${styles.actionBtn} ${styles.generateMcq}`}
                                onClick={handleGenerateMCQ}
                                disabled={generatingMcq}
                            >
                                {generatingMcq ? <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div> : <BrainCircuit size={20} />}
                                {generatingMcq ? "Generating..." : "Generate MCQ"}
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.generateVideo}`}
                                disabled={generatingVideo}
                            >
                                {generatingVideo ? <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div> : <Video size={20} />}
                                {generatingVideo ? "Generating..." : "Generate Video Questions"}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.actionCard}>
                            <h3 className={styles.sectionTitle}>Course Action</h3>
                            {!testCompleted ? (
                                <button
                                    className={`${styles.actionBtn} ${styles.enrollBtn}`}
                                    onClick={handleEnroll}
                                >
                                    <Sparkles size={20} />
                                    Enroll Now
                                </button>
                            ) : (
                                <button
                                    className={`${styles.actionBtn} ${styles.videoBtn}`}
                                    onClick={handleVideoTest}
                                >
                                    <Video size={20} />
                                    Give Video Based Test
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
