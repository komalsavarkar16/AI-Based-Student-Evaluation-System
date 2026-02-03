"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { Video, Camera, Mic, Play, ArrowLeft } from "lucide-react";
import styles from "./videoTest.module.css";

export default function VideoTestPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = params.courseId;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    <ArrowLeft size={20} /> Back
                </button>
                <h1>Video Based Assessment</h1>
            </header>

            <main className={styles.main}>
                <div className={styles.comingSoonCard}>
                    <div className={styles.iconCircle}>
                        <Video size={48} color="#5664f5" />
                    </div>
                    <h2>Video Assessment is Under Development</h2>
                    <p>
                        This feature will evaluate your verbal communication and practical
                        explanation of concepts using AI-powered facial and speech analysis.
                    </p>

                    <div className={styles.featuresList}>
                        <div className={styles.featureItem}>
                            <Camera size={20} />
                            <span>Real-time Facial Emotion Tracking</span>
                        </div>
                        <div className={styles.featureItem}>
                            <Mic size={20} />
                            <span>Voice Tone & Confidence Analysis</span>
                        </div>
                        <div className={styles.featureItem}>
                            <Play size={20} />
                            <span>AI-Generated Dynamic Questions</span>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push("/student/dashboard")}
                        className={styles.dashboardBtn}
                    >
                        Go to Student Dashboard
                    </button>
                </div>
            </main>
        </div>
    );
}
