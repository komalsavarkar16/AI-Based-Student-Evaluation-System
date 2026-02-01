"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../login/login.module.css";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";

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
            router.push("/admin/login");
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
            const res = await fetch(`${API_BASE_URL}/admin/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, new_password: password }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Password reset successfully!");
                router.push("/admin/login");
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
            <div className={styles.card} style={{ maxWidth: "500px", minHeight: "auto", padding: "40px" }}>
                <div className={styles.leftPanel} style={{ padding: "0", background: "none", width: "100%" }}>
                    <h2 className={styles.title}>Reset Password</h2>
                    <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
                        Enter your new password below.
                    </p>

                    <form className={styles.form} onSubmit={handleSubmit}>
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
        </div>
    );
}

export default function AdminResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
