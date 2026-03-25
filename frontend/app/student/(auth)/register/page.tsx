"use client";
import AuthLayout from "@/app/components/Auth/AuthLayout";
import RegisterForm from "@/app/components/Auth/RegisterForm";

export default function StudentRegisterPage() {
  return (
    <AuthLayout
      welcomeTitle="Start Master! 👋"
      subHeading="Join the platform that uses AI to accelerate your learning. Identify gaps and master courses with personalized guidance."
      actionLabel="Already have an account?"
      actionText="Log In"
      actionLink="/student/login"
      role="student"
    >
      <RegisterForm
        role="student"
        title="Create Student Account"
        subtitle="Start your AI-powered personalized learning journey"
        apiEndpoint="/student/register"
        redirectPath="/student/login"
        submitBtnText="Get Started"
      />
    </AuthLayout>
  );
}
