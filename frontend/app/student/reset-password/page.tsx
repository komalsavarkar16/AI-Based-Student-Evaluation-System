"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../login/login.module.css";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-toastify";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error("Invalid or missing reset token");
            router.push("/student/login");
        }
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("http://127.0.0.1:8000/student/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, new_password: password }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Password reset successfully!");
                router.push("/student/login");
            } else {
                toast.error(data.detail || "Reset failed");
            }
        } catch (error) {
            toast.error("Server connection failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card} style={{ maxWidth: "500px", minHeight: "auto", padding: "40px", flexDirection: "column" }}>
                <h2 className={styles.title} style={{ textAlign: "center", width: "100%" }}>Reset Password</h2>
                <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
                    Create a new password for your account.
                </p>

                <form className={styles.form} style={{ width: "100%" }} onSubmit={handleSubmit}>
                    <div className={styles.inputWrapper}>
                        <div className={styles.inputField}>
                            <LockOutlinedIcon className={styles.icon} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <span className={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </span>
                        </div>
                    </div>

                    <div className={styles.inputWrapper}>
                        <div className={styles.inputField}>
                            <LockOutlinedIcon className={styles.icon} />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function StudentResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
