"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./videoTest.module.css";
import {
    Video, Camera, Mic, Play, ArrowLeft, Clock, Info,
    Sparkles, HelpCircle, Wifi, Headphones, Zap,
    MessageSquare, Activity, Layout, Timer,
    ChevronLeft, Bookmark, ArrowRight, StopCircle, RotateCcw
} from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";

interface Question {
    _id?: string;
    question: string;
}

interface VideoQuestionsData {
    videoQuestions: Question[];
    courseTitle: string;
}

export default function VideoTestPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId;

    // State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [courseTitle, setCourseTitle] = useState("");
    const [currentIdx, setCurrentIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [totalTimeLeft, setTotalTimeLeft] = useState(1200); // 20 mins in seconds
    const [studentInfo, setStudentInfo] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [recordedChunks, setRecordedChunks] = useState<Record<number, Blob[]>>({});
    const [answersCompleted, setAnswersCompleted] = useState<number[]>([]);

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const testTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const info = localStorage.getItem("student_info");
        if (info) setStudentInfo(JSON.parse(info));

        fetchQuestions();
        startTestTimer();

        return () => {
            stopStream();
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            if (testTimerRef.current) clearInterval(testTimerRef.current);
        };
    }, []);

    const fetchQuestions = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/ai/get/video-questions/${courseId}`);
            if (res.ok) {
                const data: VideoQuestionsData = await res.json();
                setQuestions(data.videoQuestions);
                setCourseTitle(data.courseTitle);
                // Pre-warm the camera
                initCamera();
            } else {
                toast.error("Failed to load questions");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading assessment");
        } finally {
            setLoading(false);
        }
    };

    const initCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            setStream(mediaStream);
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Please allow camera and microphone access to continue.");
        }
    };

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const startTestTimer = () => {
        testTimerRef.current = setInterval(() => {
            setTotalTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(testTimerRef.current!);
                    handleFinalSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startRecording = () => {
        if (!stream) {
            toast.error("Camera access required");
            return;
        }

        setIsRecording(true);
        setRecordingTime(0);
        const chunks: Blob[] = [];

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
            setRecordedChunks(prev => ({ ...prev, [currentIdx]: chunks }));
            if (!answersCompleted.includes(currentIdx)) {
                setAnswersCompleted(prev => [...prev, currentIdx]);
            }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;

        recordingTimerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const handleRetake = () => {
        stopRecording();
        setRecordedChunks(prev => {
            const next = { ...prev };
            delete next[currentIdx];
            return next;
        });
        setAnswersCompleted(prev => prev.filter(i => i !== currentIdx));
        toast.info("Recording cleared. You can start again.");
    };

    const handleNext = () => {
        if (isRecording) stopRecording();
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            handleFinalSubmit();
        }
    };

    const handlePrev = () => {
        if (isRecording) stopRecording();
        if (currentIdx > 0) {
            setCurrentIdx(prev => prev - 1);
        }
    };

    const handleFinalSubmit = async () => {
        if (answersCompleted.length === 0) {
            toast.warn("Please record at least one response before submitting.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("studentId", studentInfo.id);
            formData.append("courseId", courseId as string);
            formData.append("courseTitle", courseTitle);

            // Convert recorded chunks to files and append
            Object.entries(recordedChunks).forEach(([idx, chunks]) => {
                const blob = new Blob(chunks, { type: 'video/mp4' });
                const fileName = `Q${parseInt(idx) + 1}.mp4`;
                formData.append("files", new File([blob], fileName, { type: 'video/mp4' }));
            });

            const response = await fetch(`${API_BASE_URL}/student/submit-video-test`, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                toast.success("Video assessment submitted successfully!");
                router.push("/student/dashboard");
            } else {
                const errorData = await response.json();
                toast.error(errorData.detail || "Failed to submit assessment");
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("An error occurred while submitting the assessment");
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    if (loading || submitting) {
        return (
            <div className={styles.loadingOverlay}>
                <div className={styles.spinner}></div>
                <p>{submitting ? "Uploading your video responses..." : "Establishing secure connection..."}</p>
                {submitting && <p className={styles.subText}>This may take a moment depending on your connection speed.</p>}
            </div>
        );
    }

    const currentQuestion = questions[currentIdx];
    const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100);

    return (
        <div className={styles.pageWrapper}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.brand}>
                    <span className={styles.logo}>EduBridge AI</span>
                    <span className={styles.subTitle}>Video Assessment • {courseTitle}</span>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.timer}>
                        <Clock size={18} />
                        <span>{formatTime(totalTimeLeft)}</span>
                    </div>
                    <div className={styles.studentProfile}>
                        <div className={styles.avatar}>
                            {studentInfo?.firstName?.charAt(0) || "S"}
                        </div>
                        <div className={styles.studentInfo}>
                            <span className={styles.studentName}>
                                {studentInfo?.firstName} {studentInfo?.lastName}
                            </span>
                            <span className={styles.studentId}>
                                Student ID: {studentInfo?.id?.slice(-8).toUpperCase() || "2024-001"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Bar */}
            <div className={styles.topProgress}>
                <div className={styles.progressInfo}>
                    <span className={styles.questionCount}>Question {currentIdx + 1} of {questions.length}</span>
                    <span className={styles.percentComplete}>{progressPercent}% Complete</span>
                </div>
                <div className={styles.progressBarBack}>
                    <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }}></div>
                </div>
            </div>

            <main className={styles.mainContainer}>
                {/* Main Workspace */}
                <div className={styles.leftColumn}>
                    <div className={styles.card}>
                        <div className={styles.videoBanner}>
                            <div className={styles.brandTitle}>
                                <Video size={20} />
                                <span>Video Response Required</span>
                            </div>
                            <div className={styles.aiBadge}>
                                <Zap size={14} /> AI Analyzed
                            </div>
                        </div>

                        <div className={styles.questionSection}>
                            <h2 className={styles.questionText}>
                                Q{currentIdx + 1}: {currentQuestion?.question}
                            </h2>
                            <div className={styles.aspectsBox}>
                                <p className={styles.aspectsTitle}>In your response, please cover the following aspects:</p>
                                <ul className={styles.aspectsList}>
                                    <li className={styles.aspectItem}><div className={styles.bullet} /> Explain the core concepts in detail</li>
                                    <li className={styles.aspectItem}><div className={styles.bullet} /> Provide practical examples or use cases</li>
                                    <li className={styles.aspectItem}><div className={styles.bullet} /> Discuss potential challenges and solutions</li>
                                </ul>
                            </div>
                        </div>

                        <div className={styles.tipsBox}>
                            <Info size={20} color="#B45309" />
                            <div className={styles.tipsContent}>
                                <h4>Recording Tips</h4>
                                <ul>
                                    <li>Speak clearly and maintain eye contact with the camera</li>
                                    <li>Ensure your environment has adequate lighting</li>
                                    <li>Recommended duration: 1-2 minutes per response</li>
                                </ul>
                            </div>
                        </div>

                        <div className={styles.videoArea}>
                            {isRecording && (
                                <div className={styles.recordingIndicator}>
                                    <div className={styles.recDot} />
                                    <span>REC {formatTime(recordingTime)}</span>
                                </div>
                            )}

                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={styles.videoElement}
                            />

                            {!stream && (
                                <div className={styles.previewOverlay}>
                                    <div className={styles.previewIcon}>
                                        <Camera size={40} color="#8B5CF6" />
                                    </div>
                                    <h3>Camera Preview</h3>
                                    <p>Click "Start Recording" to begin your response</p>
                                    <div className={styles.previewStatus}>
                                        <div className={styles.statusItem}>
                                            <div className={styles.statusDot} /> Camera Ready
                                        </div>
                                        <div className={styles.statusItem}>
                                            <div className={styles.statusDot} /> Microphone Ready
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.controls}>
                            {!isRecording ? (
                                <button className={styles.btnStart} onClick={startRecording}>
                                    <Play size={18} fill="white" /> Start Recording
                                </button>
                            ) : (
                                <button className={styles.btnStop} onClick={stopRecording}>
                                    <StopCircle size={18} /> Stop
                                </button>
                            )}
                            <button
                                className={styles.btnRetake}
                                onClick={handleRetake}
                                disabled={isRecording || !answersCompleted.includes(currentIdx)}
                            >
                                <RotateCcw size={18} /> Retake
                            </button>
                        </div>

                        <div className={styles.qualityRow}>
                            <div className={`${styles.qualityCard} ${styles.blueBg}`}>
                                <Headphones size={16} color="#3B82F6" />
                                <span className={styles.qLabel}>Audio Quality</span>
                                <span className={styles.qValue}>Excellent</span>
                            </div>
                            <div className={`${styles.qualityCard} ${styles.purpleBg}`}>
                                <Activity size={16} color="#8B5CF6" />
                                <span className={styles.qLabel}>Connection</span>
                                <span className={styles.qValue}>Stable</span>
                            </div>
                            <div className={`${styles.qualityCard} ${styles.greenBg}`}>
                                <Video size={16} color="#10B981" />
                                <span className={styles.qLabel}>Video Quality</span>
                                <span className={styles.qValue}>HD 720p</span>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.card} ${styles.analysisCard}`}>
                        <div className={styles.analysisHeader}>
                            <Sparkles size={20} color="#8B5CF6" />
                            <h3 className={styles.sectionTitle}>AI Analysis Criteria</h3>
                        </div>
                        <div className={styles.analysisGrid}>
                            <div className={`${styles.criteriaItem} ${styles.c1}`}>
                                <MessageSquare size={20} color="#0EA5E9" />
                                <div className={styles.criteriaText}>
                                    <h5>Communication</h5>
                                    <p>Clarity and articulation</p>
                                </div>
                            </div>
                            <div className={`${styles.criteriaItem} ${styles.c2}`}>
                                <Zap size={20} color="#22C55E" />
                                <div className={styles.criteriaText}>
                                    <h5>Content Quality</h5>
                                    <p>Accuracy and depth</p>
                                </div>
                            </div>
                            <div className={`${styles.criteriaItem} ${styles.c3}`}>
                                <Layout size={20} color="#8B5CF6" />
                                <div className={styles.criteriaText}>
                                    <h5>Structure</h5>
                                    <p>Organization of ideas</p>
                                </div>
                            </div>
                            <div className={`${styles.criteriaItem} ${styles.c4}`}>
                                <Timer size={20} color="#EAB308" />
                                <div className={styles.criteriaText}>
                                    <h5>Time Management</h5>
                                    <p>Appropriate duration</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <aside className={styles.sidebar}>
                    <div className={styles.widget}>
                        <div className={styles.widgetHeader}>
                            <h3>Test Information</h3>
                            <Info size={16} color="#94A3B8" />
                        </div>
                        <div className={styles.widgetList}>
                            <div className={styles.widgetRow}>
                                <span className={styles.wLabel}>Total Questions</span>
                                <span className={styles.wValue}>{questions.length}</span>
                            </div>
                            <div className={styles.widgetRow}>
                                <span className={styles.wLabel}>Completed</span>
                                <span className={`${styles.wValue} ${styles.wValueGreen}`}>
                                    {answersCompleted.length}
                                </span>
                            </div>
                            <div className={styles.widgetRow}>
                                <span className={styles.wLabel}>Remaining</span>
                                <span className={`${styles.wValue} ${styles.wValueOrange}`}>
                                    {questions.length - answersCompleted.length}
                                </span>
                            </div>
                            <div className={styles.widgetRow}>
                                <span className={styles.wLabel}>Time Limit</span>
                                <span className={`${styles.wValue} ${styles.wValueBlue}`}>20 min</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.widget}>
                        <div className={styles.widgetHeader}>
                            <h3>Question Navigator</h3>
                        </div>
                        <div className={styles.navGrid}>
                            {questions.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles.navBtn} ${currentIdx === idx ? styles.navActive : ''} ${answersCompleted.includes(idx) ? styles.navDone : ''}`}
                                    onClick={() => setCurrentIdx(idx)}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                        <div className={styles.legend}>
                            <div className={styles.legendItem}>
                                <div className={`${styles.legendBox} ${styles.navDone}`} /> <span>Answered</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={`${styles.legendBox} ${styles.navActive}`} /> <span>Current</span>
                            </div>
                            <div className={styles.legendItem}>
                                <div className={styles.legendBox} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} /> <span>Not Answered</span>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.widget} ${styles.helpCard}`}>
                        <div className={styles.helpIcon}>
                            <HelpCircle size={24} />
                        </div>
                        <h4>Need Help?</h4>
                        <p>Our support team is here for you</p>
                        <button className={styles.btnSupport}>
                            <MessageSquare size={16} /> Contact Support
                        </button>
                    </div>

                    <div className={styles.widget}>
                        <div className={styles.widgetHeader}>
                            <h3>System Check</h3>
                        </div>
                        <div className={styles.sysCheckRow}>
                            <div className={styles.sysLabel}><Wifi size={14} /> Internet</div>
                            <div className={styles.sysStatus}>Connected</div>
                        </div>
                        <div className={styles.sysCheckRow}>
                            <div className={styles.sysLabel}><Camera size={14} /> Camera</div>
                            <div className={styles.sysStatus}>Active</div>
                        </div>
                        <div className={styles.sysCheckRow}>
                            <div className={styles.sysLabel}><Mic size={14} /> Microphone</div>
                            <div className={styles.sysStatus}>Active</div>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Sticky Footer */}
            <footer className={styles.footer}>
                <button className={styles.btnPrev} onClick={handlePrev} disabled={currentIdx === 0}>
                    <ChevronLeft size={20} /> Previous Question
                </button>
                <div className={styles.footerRight}>
                    <button className={styles.btnReview}>
                        <Bookmark size={18} /> Mark for Review
                    </button>
                    <button
                        className={styles.btnNext}
                        onClick={handleNext}
                    >
                        {currentIdx === questions.length - 1 ? 'Finish Test' : 'Submit & Next'}
                        <ArrowRight size={18} />
                    </button>
                </div>
            </footer>
        </div>
    );
}
