'use client';

import React from 'react';
import Link from 'next/link';
import { Github, Twitter, Linkedin, Heart, ExternalLink, Mail, ShieldCheck, BrainCircuit } from 'lucide-react';
import styles from './Footer.module.css';

const Footer = ({ theme = 'admin' }: { theme?: 'admin' | 'student' }) => {
    const currentYear = new Date().getFullYear();
    const isStudent = theme === 'student';

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    {/* Brand Section */}
                    <div className={styles.brandSection}>
                        <div className={styles.logoContainer}>
                            <div className={styles.logoIcon} style={{
                                background: isStudent ? 'linear-gradient(135deg, #8c52ff, #a855f7)' : 'linear-gradient(135deg, #57cc99, #38a3a5)',
                                boxShadow: isStudent ? '0 4px 10px rgba(140, 82, 255, 0.3)' : '0 4px 10px rgba(87, 204, 153, 0.3)'
                            }}>
                                AI
                            </div>
                            <span className={styles.logoText}>SkillBridge AI</span>
                        </div>
                        <p className={styles.description}>
                            Empowering the future of education with AI-driven student evaluation and personalized gap analysis.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className={styles.linkGroup}>
                        <h3>Platform</h3>
                        <ul>
                            <li><Link href={isStudent ? "/student/courses" : "/admin/courses"}>All Courses</Link></li>
                            <li><Link href="/#how-it-works">How it Works</Link></li>
                        </ul>
                    </div>

                    {/* Support Links */}
                    <div className={styles.linkGroup}>
                        <h3>Support</h3>
                        <ul>
                            <li><Link href="/privacy" className={styles.iconLink}><ShieldCheck size={14} /> Privacy Policy</Link></li>
                            <li><Link href="/terms" className={styles.iconLink}>Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={styles.bottomBar}>
                    <div className={styles.copyright}>
                        © {currentYear} SkillBridge AI. All rights reserved.
                    </div>
                    <div className={styles.builtWith}>
                        Built with <Heart size={14} className={styles.heartIcon} /> by <span className={styles.author}>Komal Savarkar</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
