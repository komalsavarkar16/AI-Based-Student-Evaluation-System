"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./test.module.css";
import { toast } from "react-toastify";
import ResultContainer from "../../components/MCQResultContainer/ResultContainer";
import { API_BASE_URL } from "@/app/utils/api";
import {
    Timer as TimerIcon,
    ChevronRight,
    ChevronLeft,
    Send,
    BrainCircuit
} from "lucide-react";

interface Option {
    text: string;
    isCorrect: boolean;
}

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

export default function MCQTestPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId as string;

    const [testData, setTestData] = useState<MCQData | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(0); // in seconds
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [analysis, setAnalysis] = useState<any>(null);

    useEffect(() => {
        fetchMCQs();
    }, [courseId]);

    useEffect(() => {
        if (timeLeft > 0 && !isSubmitted) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && testData && !isSubmitted) {
            handleSubmit();
        }
    }, [timeLeft, isSubmitted, testData]);

    const fetchMCQs = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/ai/get/mcq/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setTestData(data);
                console.log("Course Data", data)
                // Set timer: 2 minutes per question
                setTimeLeft(data.mcqs.length * 120);
            } else {
                toast.error("Failed to load assessment");
                router.back();
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading assessment");
        } finally {
            setLoading(false);
        }
    };

    const handleOptionSelect = (option: string) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestionIndex]: option
        });
    };

    const handleNext = () => {
        if (currentQuestionIndex < (testData?.mcqs.length || 0) - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        }
    };

    const handlePrevious = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        }
    };

    const handleSubmit = async () => {
        if (!testData) return;

        let correctCount = 0;
        const answersLog = testData.mcqs.map((q, index) => {
            const isCorrect = selectedAnswers[index] === q.answer;
            if (isCorrect) correctCount++;
            return {
                question: q.question,
                selectedAnswer: selectedAnswers[index] || "Not Answered",
                correctAnswer: q.answer,
                isCorrect
            };
        });

        const finalScore = (correctCount / testData.mcqs.length) * 100;
        setScore(finalScore);
        setIsSubmitted(true);

        // Save results to backend
        try {
            const studentId = localStorage.getItem("student_id");
            if (!studentId) {
                toast.error("You must be logged in to submit the test");
                return;
            }
            const response = await fetch(`${API_BASE_URL}/student/submit-test`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    studentId,
                    courseId,
                    courseTitle: testData.courseTitle || "Assessment",
                    score: finalScore,
                    totalQuestions: testData.mcqs.length,
                    correctAnswers: correctCount,
                    answers: answersLog
                })
            });

            if (response.ok) {
                const resultData = await response.json();
                setAnalysis(resultData.analysis);
                toast.success("Assessment submitted successfully!");
            } else {
                const errorData = await response.json();
                console.error("Submission failed:", errorData);
                toast.error("Failed to save test results");
            }
            console.log("Data", testData)
        } catch (error) {
            console.error("Error submitting test:", error);
            toast.error("An error occurred during submission");
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    if (loading) {
        return (
            <div className={styles.loaderContainer}>
                <div className={styles.loader}></div>
                <p>Preparing your assessment...</p>
            </div>
        );
    }

    if (!testData) return <div>No data found</div>;

    if (isSubmitted) {
        return (
            <ResultContainer
                testData={testData}
                score={score}
                router={router}
                analysis={analysis}
            />
        );
    }

    const currentQuestion = testData.mcqs[currentQuestionIndex];

    return (
        <div className={styles.testContainer}>
            <header className={styles.testHeader}>
                <div className={styles.headerTitle}>
                    <BrainCircuit size={24} color="#5664f5" />
                    <div>
                        <h1>{testData.courseTitle}</h1>
                        <p>MCQ Assessment</p>
                    </div>
                </div>
                <div className={`${styles.timer} ${timeLeft < 60 ? styles.timerUrgent : ""}`}>
                    <TimerIcon size={20} />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </header>

            <main className={styles.testMain}>
                <div className={styles.progressBar}>
                    <div
                        className={styles.progressFill}
                        style={{ width: `${((currentQuestionIndex + 1) / testData.mcqs.length) * 100}%` }}
                    ></div>
                </div>

                <div className={styles.questionCard}>
                    <div className={styles.questionHeader}>
                        <span className={styles.questionCount}>
                            Question {currentQuestionIndex + 1} of {testData.mcqs.length}
                        </span>
                    </div>

                    <h2 className={styles.questionText}>{currentQuestion.question}</h2>

                    <div className={styles.optionsGrid}>
                        {currentQuestion.options.map((option, idx) => (
                            <button
                                key={idx}
                                className={`${styles.optionBtn} ${selectedAnswers[currentQuestionIndex] === option ? styles.optionSelected : ""}`}
                                onClick={() => handleOptionSelect(option)}
                            >
                                <span className={styles.optionMarker}>{String.fromCharCode(65 + idx)}</span>
                                <span className={styles.optionTextContent}>{option}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.navigation}>
                    <button
                        onClick={handlePrevious}
                        disabled={currentQuestionIndex === 0}
                        className={styles.navBtn}
                    >
                        <ChevronLeft size={20} />
                        Previous
                    </button>

                    {currentQuestionIndex === testData.mcqs.length - 1 ? (
                        <button onClick={handleSubmit} className={`${styles.navBtn} ${styles.submitBtn}`}>
                            Submit Assessment
                            <Send size={18} />
                        </button>
                    ) : (
                        <button onClick={handleNext} className={`${styles.navBtn} ${styles.nextBtn}`}>
                            Next
                            <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
