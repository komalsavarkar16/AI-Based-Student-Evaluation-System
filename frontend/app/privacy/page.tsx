'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, HelpCircle } from 'lucide-react';
import styles from '../styles/DocumentPage.module.css';

const PrivacyPolicy = () => {
    const router = useRouter();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button
                    onClick={() => router.back()}
                    className={styles.backHome}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                    <ArrowLeft size={16} /> Back to Previous Page
                </button>
                <h1>Privacy Policy</h1>
                <p className={styles.lastUpdated}>Last Updated: March 22, 2026</p>
            </header>

            <article className={styles.content}>
                <section className={styles.section}>
                    <h2><ShieldCheck size={20} /> Introduction</h2>
                    <p>At SkillBridge AI, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information as part of our automated evaluation and course recommendation platform.</p>
                </section>

                <section className={styles.section}>
                    <h2><Database size={20} /> Data We Collect</h2>
                    <p>When you use the SkillBridge platform, we may collect the following types of information:</p>
                    <ul>
                        <li><strong>Personal Identity:</strong> Your name, email address, and student ID.</li>
                        <li><strong>Academic Output:</strong> Your responses to MCQ tests and transcribed text from your video assessments.</li>
                        <li><strong>Visual & Audio Data:</strong> Recorded videos of your assessments for the purpose of AI-driven personality and technical evaluation.</li>
                        <li><strong>System Logs:</strong> IP address and usage patterns for security and performance optimization.</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2><Eye size={20} /> How We Use Your Data</h2>
                    <p>Our goal is to improve your learning outcomes. We use your data to:</p>
                    <ul>
                        <li>Perform automated AI analysis of your technical and soft skills.</li>
                        <li>Generate personalized "Bridge Course" recommendations to fill identified skill gaps.</li>
                        <li>Provide reporting and analytics to administrators for institutional review.</li>
                        <li>Verify identity and ensure academic integrity during tests.</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2><Lock size={20} /> Data Protection & Security</h2>
                    <p>We implement robust security measures including end-to-end encryption for video storage and secure database access protocols. Your data is stored on secure servers and only accessible by authorized institutional administrators.</p>
                </section>

                <section className={styles.section}>
                    <h2><HelpCircle size={20} /> Your Rights</h2>
                    <p>As a student, you have the right to request access to your stored evaluation data and ask for corrections if you believe an AI evaluation has been processed incorrectly.</p>
                </section>
            </article>

            <footer>
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '4rem', textAlign: 'center' }}>
                    Questions? Contact us at privacy@skillbridge.ai
                </p>
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
