"use client";
import AuthLayout from "@/app/components/Auth/AuthLayout";
import LoginForm from "@/app/components/Auth/LoginForm";

export default function AdminLoginPage() {
  return (
    <AuthLayout
      welcomeTitle="Hello Admin! 👋"
      subHeading="Manage the AI evaluation system with ease. Save time through automation and stay focused on student growth!"
      actionLabel="Don't have an account?"
      actionText="Sign Up"
      actionLink="/admin/register"
      role="admin"
    >
      <LoginForm
        role="admin"
        title="Admin Sign In"
        subtitle="Log in to access the control panel"
        apiEndpoint="/admin/login"
        redirectPath="/admin"
        storageKey="admin_info"
        forgotPasswordLink="/admin/forgot-password"
      />
    </AuthLayout>
  );
}
