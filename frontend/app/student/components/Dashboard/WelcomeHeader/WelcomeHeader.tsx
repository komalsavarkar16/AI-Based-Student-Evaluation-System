import React from "react";
import styles from "./welcomeHeader.module.css";

interface WelcomeHeaderProps {
    studentName: string;
}

export default function WelcomeHeader({ studentName }: WelcomeHeaderProps) {
    return (
        <div className={styles.contentHeader}>
            <div className={styles.welcomeMsg}>
                <h2>Hello, {studentName} 👋</h2>
                <p>Here's what's happening with your learning today.</p>
            </div>
        </div>
    );
}
