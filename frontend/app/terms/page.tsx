'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Book, CheckCircle, Brain, Gavel, AlertCircle } from 'lucide-react';
import styles from '../styles/DocumentPage.module.css';

const TermsOfService = () => {
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
                <h1>Terms of Service</h1>
                <p className={styles.lastUpdated}>Effective Date: March 22, 2026</p>
            </header>

            <article className={styles.content}>
                <section className={styles.section}>
                    <h2><Book size={20} /> Agreement to Terms</h2>
                    <p>By accessing or using the EduBridge AI platform, you agree to be bound by these terms. If you do not agree to any of these terms, please refrain from using our services.</p>
                </section>

                <section className={styles.section}>
                    <h2><CheckCircle size={20} /> Use of Service</h2>
                    <p>Platform usage is intended for registered students and educational administrators. You agree to:</p>
                    <ul>
                        <li>Provide accurate and complete personal information.</li>
                        <li>Follow academic honesty guidelines during assessments.</li>
                        <li>Use recorded video answers fairly and respectfully.</li>
                        <li>Maintain the confidentiality of your login credentials.</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2><Brain size={20} /> AI-Assisted Accountability</h2>
                    <p>Our platform evaluates student performance using AI. Please be aware that:</p>
                    <ul>
                        <li>AI evaluations are based on a set of technical and linguistic heuristics.</li>
                        <li>Final decisions on course admissions can be reviewed by human administrators.</li>
                        <li>No automated tool is infallible; results should be seen as high-probability suggestions.</li>
                        <li>Video analysis includes "vibe checks" and personality indicators.</li>
                    </ul>
                </section>

                <section className={styles.section}>
                    <h2><Gavel size={20} /> Intellectual Property</h2>
                    <p>The software, core logic, AI models, and interface design are the exclusive property of EduBridge AI. Reproduction or modification without written consent is strictly prohibited.</p>
                </section>

                <section className={styles.section}>
                    <h2><AlertCircle size={20} /> Limitation of Liability</h2>
                    <p>EduBridge AI is not liable for any specific educational outcomes, career placement results, or technical local errors that may occur during assessment sessions on unverified student devices.</p>
                </section>
            </article>

            <footer>
                <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '4rem', textAlign: 'center' }}>
                    Questions? Contact us at legal@edubridge.ai
                </p>
            </footer>
        </div>
    );
};

export default TermsOfService;
