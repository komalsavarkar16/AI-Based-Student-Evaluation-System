"use client"
import { useEffect, useState } from "react";
import styles from "./courseMCQContainer.module.css";

interface courseDetailsProps {
    courseId: string;
}


export default function CourseMCQContainer({ courseId }: courseDetailsProps) {

    const [mcqs, setMCQs] = useState([]);
    const [loading, setLoading] = useState(true);

    const getMCQs = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://127.0.0.1:8000/ai/get/mcq/${courseId}`);
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
    }, []);

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