import React from "react";
import styles from "./insightsRow.module.css";
import { WarningAmber as GapIcon, Lightbulb as IdeaIcon } from "@mui/icons-material";

interface Insight {
    id: string | number;
    title: string;
    description: string;
}

interface InsightsRowProps {
    gaps: Insight[];
    recommendations: Insight[];
}

export default function InsightsRow({ gaps, recommendations }: InsightsRowProps) {
    return (
        <section className={styles.insightsRow}>
            <div className={styles.card}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>Skill Gap Analysis</h3>
                </div>
                <div className={styles.gapList}>
                    {gaps.length > 0 ? (
                        gaps.map((gap, idx) => (
                            <div key={gap.id || `gap-${idx}`} className={styles.gapItem}>
                                <GapIcon className={styles.gapIcon} />
                                <div className={styles.gapDetails}>
                                    <h4>{gap.title}</h4>
                                    <p>{gap.description}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: "#888", fontSize: "14px" }}>No skill gaps identified yet. Keep up the good work!</p>
                    )}
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>Learning Recommendations</h3>
                </div>
                <div className={styles.recList}>
                    {recommendations.length > 0 ? (
                        recommendations.map((rec, idx) => (
                            <div key={rec.id || `rec-${idx}`} className={styles.recItem}>
                                <IdeaIcon className={styles.recIcon} />
                                <div className={styles.recDetails}>
                                    <h4>{rec.title}</h4>
                                    <p>{rec.description}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: "#888", fontSize: "14px" }}>No new recommendations at this time.</p>
                    )}
                </div>
            </div>
        </section>
    );
}
