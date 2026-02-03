"use client"
import { useEffect, useState } from "react";
import styles from "./courseMCQContainer.module.css";
import { API_BASE_URL } from "@/app/utils/api";

interface courseDetailsProps {
    courseId: string;
}


export default function CourseMCQContainer({ courseId }: courseDetailsProps) {

    const [mcqs, setMCQs] = useState([]);
    const [loading, setLoading] = useState(true);

    const getMCQs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE_URL}/ai/get/mcq/${courseId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setMCQs(data.mcqs || []);
            } else {
                setMCQs([]);
            }
        }
        catch (error) {
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getMCQs();
    }, [courseId]);

    useEffect(() => {
        const handleRefresh = () => getMCQs();
        window.addEventListener('refreshMCQs', handleRefresh);
        return () => window.removeEventListener('refreshMCQs', handleRefresh);
    }, [courseId]);

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Course Multiple Choice Questions</h1>
            {loading ? (
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Fetching MCQs...</p>
                </div>
            ) : mcqs && mcqs.length > 0 ? (
                mcqs.map((mcq: any, index: number) => (
                    <div key={index} className={styles.mcqContainer}>
                        <p className={styles.label}>Question:</p>
                        <p className={styles.question}>{mcq.question}</p>
                        <p className={styles.label}>Options:</p>
                        <ol>
                            {mcq.options.map((option: string, optionIndex: number) => (
                                <li key={optionIndex}>{option}</li>
                            ))}
                        </ol>
                        <p className={styles.label}>Answer</p>
                        <span className={styles.answer}>{mcq.answer}</span>
                    </div>
                ))
            ) : (
                <div className={styles.emptyState}>
                    <p>MCQs are not generated yet.</p>
                </div>
            )}
        </div>
    );
}