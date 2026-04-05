"use client";
import React from "react";
import styles from "./Auth.module.css";
import { AutoAwesome, TipsAndUpdates } from "@mui/icons-material";

interface AuthLayoutProps {
  children: React.ReactNode;
  welcomeTitle: string;
  subHeading: string;
  role: "admin" | "student";
  copyright?: string;
  brandName?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  welcomeTitle,
  subHeading,
  role,
  copyright = "© 2025 AI-Eval. All rights reserved.",
  brandName = "SkillBridge AI",
}) => {
  const themeClass = role === "admin" ? styles.adminTheme : styles.studentTheme;

  return (
    <div className={`${styles.authContainer} ${themeClass}`}>
      <div className={styles.leftPanel}>
        <div className={styles.linesDecoration}></div>
        <div className={styles.logoSection}>
          <AutoAwesome className={styles.logoIcon} sx={{ fontSize: 64 }} />
        </div>

        <div className={styles.welcomeSection}>
          <h2 className={styles.welcomeTitle}>{welcomeTitle}</h2>
          <p className={styles.subHeading}>{subHeading}</p>
        </div>

        <div className={styles.copyrightSection}>
          {copyright}
        </div>
      </div>
      <div className={styles.rightPanel}>
        <div className={styles.brandHeader}>
          <div className={styles.brandLogoCircle}>
            <TipsAndUpdates sx={{ fontSize: 20, color: 'white' }} />
          </div>
          <span className={styles.brandText}>{brandName}</span>
        </div>
        <div className={styles.formCard}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
