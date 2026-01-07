"use client"
import { useEffect, useState } from "react";
import { Course } from "../../../types/course";
import styles from "./courseDetailsContainer.module.css";
import { BrainCircuit, Video, Clock, BarChart, GraduationCap, Sparkles } from "lucide-react";
import { toast } from "react-toastify";

interface courseDetailsProps {
    courseId: string;
}

export default function CourseDetailsContainer({ courseId }: courseDetailsProps) {
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingMcq, setGeneratingMcq] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);

    useEffect(() => {
        fetchCourse()
    }, [])

    const fetchCourse = async () => {
        try {
            const response = await fetch(`http://127.0.0.1:8000/courses/${courseId}`)
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
            const response = await fetch(`http://127.0.0.1:8000/courses/${courseId}/generate-mcq`, {
                method: "POST"
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

    const handleGenerateVideoQuestions = async () => {
        setGeneratingVideo(true);
        try {
            const response = await fetch(`http://127.0.0.1:8000/courses/${courseId}/generate-video-questions`, {
                method: "POST"
            });
            if (response.ok) {
                toast.success("Video questions generated successfully!");
            } else {
                throw new Error("Failed to generate video questions");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error generating video questions");
        } finally {
            setGeneratingVideo(false);
        }
    };

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
                            onClick={handleGenerateVideoQuestions}
                            disabled={generatingVideo}
                        >
                            {generatingVideo ? <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div> : <Video size={20} />}
                            {generatingVideo ? "Generating..." : "Generate Video Questions"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
