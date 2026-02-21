'use client';
import styles from "./styles/home.module.css";
import Link from 'next/link';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AIImage from "@/public/assets/images/Landing Page/AI.png";
import Image from "next/image";
import { features } from "./utils/featuresData";
import { steps } from "./utils/processSteps";
import img1 from "@/public/assets/images/Landing Page/bg1.png";
import img2 from "@/public/assets/images/Landing Page/bg2.png";


export default function LandingPage() {
  return (
    // <div className={styles.container}>
    //   <main className={styles.mainWrapper}>
    //     <header className={styles.header}>
    //       <h1>Welcome</h1>
    //       <p>Choose your workspace to manage your academic journey.</p>
    //     </header>

    //     <div className={styles.selectionGrid}>
    //       {/* Student Card */}
    //       <div  className={styles.card}>
    //         <div className={`${styles.iconBox} ${styles.studentIcon}`}>
    //           <GraduationCap size={32} />
    //         </div>
    //         <h2 className={styles.cardTitle}>Student</h2>
    //         <p className={styles.cardDescription}>
    //           View your courses, track assignments, and access learning materials.
    //         </p>
    //         <Link href="/student/login" className={`${styles.actionButton} ${styles.studentBtn}`}>
    //           Continue as Student <ChevronRight size={18} />
    //         </Link>
    //       </div>

    //       {/* Admin Card */}
    //       <div  className={styles.card}>
    //         <div className={`${styles.iconBox} ${styles.adminIcon}`}>
    //           <ShieldCheck size={32} />
    //         </div>
    //         <h2 className={styles.cardTitle}>Administrator</h2>
    //         <p className={styles.cardDescription}>
    //           Manage enrollments, generate reports, and configure system settings.
    //         </p>
    //         <Link href="/admin/login" className={`${styles.actionButton} ${styles.adminBtn}`}>
    //           Continue as Admin <ChevronRight size={18} />
    //         </Link>
    //       </div>
    //     </div>
    //   </main>
    // </div>
    <div className={styles.mainContainer}>
      <div className={styles.heroSection}>
        <div className={styles.content}>
          <h1 className={styles.heading}>
            Smart Student <span>Evaluation</span> System & Course Recommendations
          </h1>
          <p className={styles.subHeading}>
            Advanced AI-driven assessment system that evaluates students through MCQ and video-based tests, providing personalized bridge course recommendations for optimal learning paths.
          </p>
          <div className={styles.imageContainerMobile}>
            <Image src={AIImage} alt="AI Image" />
          </div>
          <div className={styles.buttonContainer}>
            <Link href="/student/login" className={`${styles.actionButton} ${styles.studentBtn}`}>
              <SchoolIcon /> Continue as Student
            </Link>
            <Link href="/admin/login" className={`${styles.actionButton} ${styles.adminBtn}`}>
              <AdminPanelSettingsIcon /> Continue as Admin
            </Link>
          </div>
        </div>
        <div className={styles.imageContainer}>
          <Image src={AIImage} alt="AI Image" />
        </div>
      </div>
      <div className={styles.featuresSection}>
        <h2 className={styles.featuresHeading}>
          Powerful Features
        </h2>
        <h3 className={styles.featuresSubHeading}>
          Everything you need for comprehensive student evaluation
        </h3>
        <div className={styles.featuresGrid}>
          {features.map(({ id, title, description, icon: Icon }) => (
            <div key={id} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Icon size={32} />
              </div>

              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDescription}>{description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.processSection}>
        <h1 className={styles.heading}>How It Works</h1>
        <p className={styles.subHeading}>Simple, efficient, and AI-powered evaluation process</p>

        <div className={styles.container}>
          <div className={styles.content}>
            {steps.slice(0, 3).map((step) => (
              <div key={step.id} className={styles.step}>
                <div className={styles.stepNumber}>
                  {step.id}
                </div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.imageCard}>
            <Image src={img1} alt="AI Assessment Process" />
          </div>
        </div>

        <div className={styles.container}>
          <div className={styles.imageCard}>
            <Image src={img2} alt="Admin Evaluation Dashboard" />
          </div>
          <div className={styles.content}>
            {steps.slice(3, 6).map((step) => (
              <div key={step.id} className={styles.step}>
                <div className={`${styles.stepNumber} ${styles.stepNumberPink}`}>
                  {step.id}
                </div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDescription}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}