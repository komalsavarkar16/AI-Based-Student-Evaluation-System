import React from 'react';
import styles from "./ResultContainer.module.css";
import { CheckCircle2, XCircle, AlertTriangle, Video, LayoutDashboard } from 'lucide-react';

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

interface AnalysisData {
    weak_skills: string[];
    recommendations: string[];
}

interface ResultContainerProps {
    testData: MCQData;
    score: number;
    router: any;
    analysis?: AnalysisData | null;
}

function ResultContainer({ testData, score, router, analysis }: ResultContainerProps) {
    const isPass = score >= 70;

    const handleProceedToVideo = () => {
        router.push(`/student/video-test/${testData.courseId}`);
    };

    return (
        <div className={styles.resultContainer}>
            <div className={styles.resultCard}>
                <div className={`${styles.statusIndicator} ${isPass ? styles.passStatus : styles.failStatus}`}>
                    {isPass ? (
                        <><CheckCircle2 size={18} /> PASSED</>
                    ) : (
                        <><XCircle size={18} /> NEEDS IMPROVEMENT</>
                    )}
                </div>

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

                {!isPass && analysis && (
                    <div className={styles.analysisSection}>
                        <div className={styles.analysisTitle}>
                            <AlertTriangle size={20} color="#dc2626" />
                            AI Skill Gap Analysis
                        </div>

                        <div className={styles.analysisGroup}>
                            <span className={styles.groupLabel}>Weak Areas Identified</span>
                            <ul className={styles.analysisList}>
                                {analysis.weak_skills.map((skill, idx) => (
                                    <li key={idx}>{skill}</li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.analysisGroup}>
                            <span className={styles.groupLabel}>Learning Recommendations</span>
                            <ul className={styles.analysisList}>
                                {analysis.recommendations.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className={styles.actionStack}>
                    {isPass && (
                        <button onClick={handleProceedToVideo} className={styles.videoBtn}>
                            <Video size={20} />
                            Proceed to Video Assessment
                        </button>
                    )}

                    <button onClick={() => router.push("/student/dashboard")} className={styles.secondaryBtn}>
                        <LayoutDashboard size={18} />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ResultContainer;
