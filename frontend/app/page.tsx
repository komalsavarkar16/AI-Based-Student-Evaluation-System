'use client';
import styles from "./styles/home.module.css";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          AI Student Evaluation System
        </h1>

        <p className={styles.subtitle}>
          Assess skills • Identify gaps • Get personalized learning paths
        </p>

        <div className={styles.buttonGroup}>
          <button
            className={styles.studentBtn}
            onClick={() => router.push("/student/login")}
          >
            Continue as Student
          </button>

          <button
            className={styles.adminBtn}
            onClick={() => router.push("/admin/login")}
          >
            Continue as Admin
          </button>
        </div>

        <p className={styles.footer}>
          Powered by AI for smarter education 🚀
        </p>
      </div>
    </div>
  );
}
