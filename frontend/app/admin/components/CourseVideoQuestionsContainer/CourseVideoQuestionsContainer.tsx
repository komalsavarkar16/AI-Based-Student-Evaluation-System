"use client"
import { useEffect, useState } from "react";
import styles from "./courseVideoQuestionsContainer.module.css";
import { API_BASE_URL } from "@/app/utils/api";
import { Video, HelpCircle } from "lucide-react";

interface courseDetailsProps {
    courseId: string;
}

interface VideoQuestion {
    question: string;
    relatedSkill: string;
}

export default function CourseVideoQuestionsContainer({ courseId }: courseDetailsProps) {
    const [videoQuestions, setVideoQuestions] = useState<VideoQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    const getVideoQuestions = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/ai/get/video-questions/${courseId}`);
            if (response.ok) {
                const data = await response.json();
                setVideoQuestions(data.videoQuestions || []);
            } else {
                setVideoQuestions([]);
            }
        } catch (error) {
            console.error("Error fetching video questions:", error);
            setVideoQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getVideoQuestions();
    }, [courseId]);

    // Expose a way to refresh if needed (can be used later)
    useEffect(() => {
        const handleRefresh = () => getVideoQuestions();
        window.addEventListener('refreshVideoQuestions', handleRefresh);
        return () => window.removeEventListener('refreshVideoQuestions', handleRefresh);
    }, []);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Video size={28} className={styles.icon} />
                <h1 className={styles.title}>Course Video Assessment Questions</h1>
            </div>

            {loading ? (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Fetching Video Questions...</p>
                </div>
            ) : videoQuestions && videoQuestions.length > 0 ? (
                <div className={styles.questionsGrid}>
                    {videoQuestions.map((question, index) => (
                        <div key={index} className={styles.questionCard}>
                            <div className={styles.questionHeader}>
                                <span className={styles.questionNumber}>Question {index + 1}</span>
                                <HelpCircle size={18} className={styles.helpIcon} />
                            </div>
                            <p className={styles.questionText}>{question.question}</p>
                            <p className={styles.relatedSkill}>Skill: {question.relatedSkill}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p>Video assessment questions are not generated yet.</p>
                </div>
            )}
        </div>
    );
}
