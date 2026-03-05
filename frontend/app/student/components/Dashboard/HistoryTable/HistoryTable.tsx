import Link from "next/link";
import styles from "./historyTable.module.css";

interface AssessmentHistoryItem {
    id: string | number;
    name: string;
    date: string;
    score: string | number;
    status: "completed" | "pending" | "failed";
}

interface HistoryTableProps {
    history: AssessmentHistoryItem[];
}

export default function HistoryTable({ history }: HistoryTableProps) {
    return (
        <section className={styles.historySection}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Assessment History</h3>
                <Link href="/student/tests" className={styles.viewLink}>View All Tests</Link>
            </div>

            {history.length > 0 ? (
                <div className={styles.tableWrapper}>
                    <table className={styles.historyTable}>
                        <thead>
                            <tr>
                                <th>Assessment Name</th>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.name}</td>
                                    <td>{item.date}</td>
                                    <td>{item.score}</td>
                                    <td>
                                        <span
                                            className={`${styles.statusTag} ${item.status === 'completed'
                                                ? styles.completed
                                                : item.status === 'failed'
                                                    ? styles.failed
                                                    : styles.pending
                                                }`}
                                        >
                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p>No assessment history available yet. Head over to <b>Tests</b> to get started!</p>
                </div>
            )}
        </section>
    );
}
