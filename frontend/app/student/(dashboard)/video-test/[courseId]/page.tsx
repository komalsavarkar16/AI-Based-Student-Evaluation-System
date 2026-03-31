"use client";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./videoTest.module.css";
import {
    Video, Camera, Mic, Play, ArrowLeft, Clock, Info,
    Sparkles, HelpCircle, Wifi, Headphones, Zap,
    MessageSquare, Activity, Layout, Timer,
    ChevronLeft, Bookmark, ArrowRight, StopCircle, RotateCcw, Brain
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
    isRetest?: boolean;
}

export default function VideoTestPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId;

    // State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [courseTitle, setCourseTitle] = useState("");
    const [isRetest, setIsRetest] = useState(false);
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

    const [isBridgeCourse, setIsBridgeCourse] = useState(false);
    const [bridgeChecklist, setBridgeChecklist] = useState<any>(null);

    useEffect(() => {
        const info = localStorage.getItem("student_info");
        if (info) setStudentInfo(JSON.parse(info));

        checkTestStatusAndInit();

        return () => {
            stopStream();
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            if (testTimerRef.current) clearInterval(testTimerRef.current);
        };
    }, []);

    const checkTestStatusAndInit = async () => {
        try {
            const studentId = localStorage.getItem("student_id");
            if (studentId) {
                const statusRes = await fetch(`${API_BASE_URL}/student/check-test-status/${studentId}/${courseId}`, {
                    credentials: "include"
                });
                if (statusRes.ok) {
                    const statusData = await statusRes.json();
                    if (statusData.status === "Bridge Course In Progress") {
                        setIsBridgeCourse(true);
                        setBridgeChecklist(statusData.bridgeChecklistData);
                        setLoading(false);
                        return;
                    }
                }
            }
            fetchQuestions();
            startTestTimer();
        } catch(e) {
            console.error(e);
            toast.error("Error loading assessment");
            setLoading(false);
        }
    };

    const fetchQuestions = async () => {
        try {
            const studentId = localStorage.getItem("student_id");
            const res = await fetch(`${API_BASE_URL}/ai/get/video-questions/${courseId}${studentId ? `?student_id=${studentId}` : ""}`, {
                credentials: "include"
            });
            if (res.ok) {
                const data: VideoQuestionsData = await res.json();
                setQuestions(data.videoQuestions);
                setCourseTitle(data.courseTitle);
                setIsRetest(data.isRetest || false);
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
        return new Promise<void>((resolve) => {
            if (mediaRecorderRef.current && isRecording) {
                // Set up a one-time handler for the stop event
                const onStopHandler = () => {
                    mediaRecorderRef.current?.removeEventListener('stop', onStopHandler);
                    setIsRecording(false);
                    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
                    resolve();
                };
                mediaRecorderRef.current.addEventListener('stop', onStopHandler);
                mediaRecorderRef.current.stop();
            } else {
                resolve();
            }
        });
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

    const handleNext = async () => {
        if (isRecording) {
            await stopRecording();
        }
        
        if (currentIdx < questions.length - 1) {
            setCurrentIdx(prev => prev + 1);
        } else {
            // Need a slight delay for state to catch up for answersCompleted
            setTimeout(() => {
                handleFinalSubmit();
            }, 300);
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
                credentials: "include"
            });

            if (response.ok) {
                toast.success("Video assessment submitted successfully!");
                router.push("/student");
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

    const handleChecklistChange = async (idx: number, checked: boolean) => {
        if (!bridgeChecklist || !bridgeChecklist.checklist) return;
        
        const newChecklist = { ...bridgeChecklist };
        newChecklist.checklist[idx].checked = checked;
        setBridgeChecklist(newChecklist);

        const studentId = localStorage.getItem("student_id");
        if (studentId) {
            try {
                await fetch(`${API_BASE_URL}/student/update-bridge-checklist/${studentId}/${courseId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checklistData: newChecklist }),
                    credentials: "include"
                });
            } catch (error) {
                console.error("Error syncing checklist", error);
            }
        }
    };

    const handleBridgeSubmit = async () => {
        const studentId = localStorage.getItem("student_id");
        if (!studentId) return;

        if (window.confirm("By clicking this, you confirm you have mastered these concepts and are ready for the retest.")) {
            setSubmitting(true);
            try {
                const response = await fetch(`${API_BASE_URL}/student/finish-bridge-course/${studentId}/${courseId}`, {
                    method: 'POST',
                    credentials: "include"
                });
                if (response.ok) {
                    toast.success("Skill gaps cleared! You can now access the video test.");
                    router.push("/student/tests");
                } else {
                    toast.error("Failed to finish bridge course.");
                }
            } catch (error) {
                console.error(error);
                toast.error("Error updating status.");
            } finally {
                setSubmitting(false);
            }
        }
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

    if (isBridgeCourse && bridgeChecklist) {
        const totalItems = bridgeChecklist.checklist?.length || 0;
        const checkedItems = bridgeChecklist.checklist?.filter((c: any) => c.checked).length || 0;
        const allChecked = totalItems > 0 && checkedItems === totalItems;
        const checklistProgress = Math.round((checkedItems / (totalItems || 1)) * 100);

        return (
            <div className={styles.pageWrapper}>
                <header className={styles.header} style={{ justifyContent: 'center', background: '#eef2ff' }}>
                    <div className={styles.brand} style={{ color: '#4338ca', fontWeight: 'bold' }}>
                        <Brain size={24} color="#4338ca"/> <span>Bridge Path Checklist Active</span>
                    </div>
                </header>

                <main className={styles.mainContent}>
                    <div className={styles.videoSection} style={{ maxWidth: '800px', margin: '0 auto', background: 'transparent', boxShadow: 'none' }}>
                       
                        <div style={{ background: '#fff', padding: '30px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '24px', color: '#1e293b', marginTop: 0, marginBottom: '8px' }}>Your Concept Roadmap</h2>
                            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '24px' }}>
                                Master these concepts to unlock your video assessment. Check the box once you finish learning a topic.
                            </p>

                            <div style={{ marginBottom: '24px', background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${checklistProgress}%`, background: '#4f46e5', transition: 'width 0.4s ease' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {bridgeChecklist.checklist?.map((item: any, idx: number) => (
                                    <div key={idx} style={{ padding: '16px', background: item.checked ? '#f8fafc' : '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'flex-start', transition: 'all 0.2s', opacity: item.checked ? 0.7 : 1 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={item.checked} 
                                            onChange={(e) => handleChecklistChange(idx, e.target.checked)}
                                            style={{ width: '20px', height: '20px', marginTop: '4px', cursor: 'pointer' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: item.checked ? '#64748b' : '#0f172a' }}>
                                                {item.concept} <span style={{ fontSize: '11px', padding: '2px 6px', background: '#e2e8f0', borderRadius: '4px', marginLeft: '6px', verticalAlign: 'middle', fontWeight: 'normal' }}>{item.difficulty}</span>
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#475569', marginTop: '6px', lineHeight: 1.5 }}>
                                                <em>{item.description}</em>
                                            </div>
                                            {item.subtopics && item.subtopics.length > 0 && (
                                                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px', color: '#334155' }}>
                                                    {item.subtopics.map((sub: string, sIdx: number) => (
                                                        <li key={sIdx} style={{ marginBottom: '4px' }}>{sub}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {bridgeChecklist.references && bridgeChecklist.references.length > 0 && (
                                <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#1e293b' }}>Recommended Web Resources:</h3>
                                    <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {bridgeChecklist.references.map((ref: any, idx: number) => (
                                            <li key={idx}><a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none' }}>{ref.title}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                <button 
                                    onClick={handleBridgeSubmit}
                                    disabled={!allChecked}
                                    style={{ 
                                        padding: '16px 32px', 
                                        borderRadius: '8px', 
                                        fontSize: '16px', 
                                        fontWeight: 'bold', 
                                        border: 'none', 
                                        cursor: allChecked ? 'pointer' : 'not-allowed', 
                                        background: allChecked ? '#4f46e5' : '#cbd5e1', 
                                        color: allChecked ? '#fff' : '#64748b',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                    }}
                                >
                                    I am Ready
                                </button>
                                {!allChecked && <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px' }}>Complete all items to unlock the formal test.</p>}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.brand}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className={styles.subTitle}>Video Assessment • {courseTitle}</span>
                        {isRetest && (
                            <span style={{ 
                                padding: '2px 8px', 
                                background: '#ecfdf5', 
                                color: '#059669', 
                                fontSize: '11px', 
                                fontWeight: 'bold', 
                                borderRadius: '12px',
                                border: '1px solid #10b981'
                            }}>Dynamic Assessment</span>
                        )}
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.timer}>
                        <Clock size={18} />
                        <span>{formatTime(totalTimeLeft)}</span>
                    </div>
                    <div className={styles.studentProfile}>
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
