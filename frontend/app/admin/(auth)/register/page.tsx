"use client";
import AuthLayout from "@/app/components/Auth/AuthLayout";
import RegisterForm from "@/app/components/Auth/RegisterForm";

export default function AdminRegisterPage() {
  return (
    <AuthLayout
      welcomeTitle="Join the Team! 👋"
      subHeading="Start managing the AI-powered student evaluation platform. Automate manual tasks and increase your productivity today!"
      actionLabel="Already have an account?"
      actionText="Log In"
      actionLink="/admin/login"
      role="admin"
    >
      <RegisterForm
        role="admin"
        title="Create Admin Account"
        subtitle="Join the administration team to manage the system"
        apiEndpoint="/admin/register"
        redirectPath="/admin/login"
      />
    </AuthLayout>
  );
}
