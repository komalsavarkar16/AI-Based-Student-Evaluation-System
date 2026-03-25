"use client";
import AuthLayout from "@/app/components/Auth/AuthLayout";
import LoginForm from "@/app/components/Auth/LoginForm";

export default function StudentLoginPage() {
  return (
    <AuthLayout
      welcomeTitle="Hello Student! 👋"
      subHeading="Start your AI-powered learning journey. Let AI identify your gaps and help you master new skills effectively!"
      actionLabel="Don't have an account?"
      actionText="Sign Up"
      actionLink="/student/register"
      role="student"
    >
      <LoginForm
        role="student"
        title="Sign In"
        subtitle="Log in to continue your learning journey"
        apiEndpoint="/student/login"
        redirectPath="/student"
        storageKey="student_info"
        forgotPasswordLink="/student/forgot-password"
      />
    </AuthLayout>
  );
}
