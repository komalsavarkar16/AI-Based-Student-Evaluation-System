import React from 'react';
import styles from "./ResultContainer.module.css";
import { CheckCircle2 } from 'lucide-react';

interface Question {
    question: string;
    options: string[];
    answer: string;
}

interface MCQData {
    _id: string;
    courseId: string;
    courseTitle: string;
    mcqs: Question[];
}

interface ResultContainerProps {
    testData: MCQData;
    score: number;
    router: any;
}

function ResultContainer({ testData, score, router }: ResultContainerProps) {
    return (
        <div className={styles.resultContainer}>
            <div className={styles.resultCard}>
                <h1>Assessment Completed!</h1>
                <p className={styles.courseTitle}>{testData.courseTitle}</p>
                <div className={styles.scoreCircle}>
                    <span className={styles.scoreText}>{Math.round(score)}%</span>
                    <span className={styles.scoreLabel}>Final Score</span>
                </div>
                <div className={styles.statsGrid}>
                    <div className={styles.statLine}>
                        <span>Total Questions:</span>
                        <span>{testData.mcqs.length}</span>
                    </div>
                    <div className={styles.statLine}>
                        <span>Correct Answers:</span>
                        <span>{Math.round((score / 100) * testData.mcqs.length)}</span>
                    </div>
                </div>
                <button onClick={() => router.push("/student/dashboard")} className={styles.dashboardBtn}>
                    Go to Dashboard
                </button>
            </div>
        </div>
    )
}

export default ResultContainer;
