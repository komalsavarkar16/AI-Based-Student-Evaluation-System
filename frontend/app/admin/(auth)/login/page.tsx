"use client";
import { useState } from "react";
import styles from "./login.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-toastify";

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<any>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setErrors({});

    let newErrors: any = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || "Login failed");
        return;
      }

      toast.success("Login successful");

      // Store token
      if (data.access_token) {
        localStorage.setItem("auth_token", data.access_token);
      }

      if (data.admin) {
        localStorage.setItem("admin_info", JSON.stringify(data.admin));
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/student/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* LEFT PANEL - FORM */}
        <div className={styles.leftPanel}>
          <h2 className={styles.title}>Admin Login</h2>

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Email */}
            <div className={styles.inputWrapper}>
              <div className={styles.inputField}>
                <EmailOutlinedIcon className={styles.icon} />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              {errors.email && (
                <span className={styles.error}>{errors.email}</span>
              )}
            </div>

            {/* Password */}
            <div className={styles.inputWrapper}>
              <div className={styles.inputField}>
                <LockOutlinedIcon className={styles.icon} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <span
                  className={styles.eyeIcon}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </span>
              </div>
              {errors.password && (
                <span className={styles.error}>{errors.password}</span>
              )}
            </div>

            <div className={styles.forgotPassWrapper}>
              <Link href="/admin/forgot-password" className={styles.forgotPass}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className={styles.submitBtn}>
              Log In
            </button>
          </form>
        </div>

        {/* RIGHT PANEL - WELCOME */}
        <div className={styles.rightPanel}>
          <h2 className={styles.welcomeTitle}>New Here?</h2>
          <h4 className={styles.subHeading}>
            Join the administration team today.
          </h4>
          <Link href="/admin/register" className={styles.createAccount}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
