import React from "react";
import styles from "./statsRow.module.css";

interface SkillProgress {
    name: string;
    percentage: number;
}

interface StatsRowProps {
    studentName: string;
    major: string;
    year: string;
    skills: SkillProgress[];
}

export default function StatsRow({ skills }: StatsRowProps) {
    return (
        <section className={styles.statsRow}>

            {/* Skill Status */}
            <div className={`${styles.card} ${styles.skillWidget}`}>
                <h3>Skill Status</h3>
                {skills.length > 0 ? (
                    skills.map((skill, index) => (
                        <div key={index} className={styles.skillItem}>
                            <div className={styles.skillMeta}>
                                <span>{skill.name}</span>
                                <span>{skill.percentage}%</span>
                            </div>
                            <div className={styles.progressBarBack}>
                                <div
                                    className={styles.progressBarFill}
                                    style={{ width: `${skill.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p style={{ color: "#888", fontSize: "14px" }}>No skills or test data yet.</p>
                )}
            </div>
        </section>
    );
}
