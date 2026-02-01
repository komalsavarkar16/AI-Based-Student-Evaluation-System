"use client";
import { useState } from "react";
import styles from "../login/login.module.css";
import Link from "next/link";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";

export default function AdminForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (res.ok) {
                toast.info(data.message);
            } else {
                toast.error(data.detail || "Something went wrong");
            }
        } catch (error) {
            toast.error("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card} style={{ maxWidth: "500px", minHeight: "auto", padding: "40px" }}>
                <div className={styles.leftPanel} style={{ padding: "0", background: "none", width: "100%" }}>
                    <h2 className={styles.title}>Forgot Password</h2>
                    <p style={{ textAlign: "center", marginBottom: "20px", color: "#666" }}>
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.inputWrapper}>
                            <div className={styles.inputField}>
                                <EmailOutlinedIcon className={styles.icon} />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>

                    <div style={{ marginTop: "20px", textAlign: "center" }}>
                        <Link href="/admin/login" className={styles.forgotPass}>
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
