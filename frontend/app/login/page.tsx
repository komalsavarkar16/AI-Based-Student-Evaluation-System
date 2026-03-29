"use client";
import React, { useState } from "react";
import AuthLayout from "@/app/components/Auth/AuthLayout";
import LoginForm from "@/app/components/Auth/LoginForm";

export default function UnifiedLoginPage() {
  const [role, setRole] = useState<"admin" | "student">("student");

  const config = {
    student: {
      welcomeTitle: "Hello Student! 👋",
      subHeading: "Start your AI-powered learning journey. Let AI identify your gaps and help you master new skills effectively!",
    },
    admin: {
      welcomeTitle: "Hello Admin! 👋",
      subHeading: "Manage the AI evaluation system with ease. Save time through automation and stay focused on student growth!",
    },
  }[role];

  return (
    <AuthLayout
      welcomeTitle={config.welcomeTitle}
      subHeading={config.subHeading}
      role={role}
    >
      <LoginForm 
        initialRole={role} 
        onRoleChange={(newRole) => setRole(newRole)} 
      />
    </AuthLayout>
  );
}
