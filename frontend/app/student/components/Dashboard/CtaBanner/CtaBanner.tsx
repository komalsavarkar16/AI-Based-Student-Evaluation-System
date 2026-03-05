import Link from "next/link";
import styles from "./ctaBanner.module.css";

export default function CtaBanner() {
    return (
        <section className={styles.ctaSection}>
            <div className={styles.ctaText}>
                <h2>Explore New Horizons!</h2>
                <p>Browse through our extensive library of courses and find the perfect path to enhance your skills and knowledge.</p>
            </div>
            <Link href="/student/courses" className={styles.startBtn}>
                Browse Courses
            </Link>
        </section>
    );
}
