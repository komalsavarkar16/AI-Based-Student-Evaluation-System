"use client";
import { useState } from "react";
import styles from "./login.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-toastify";

export default function StudentLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    let newErrors: any = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || "Login failed");
        return;
      }

      toast.success("Login successful 🎉");

      // Store student details
      if (data.student) {
        localStorage.setItem("student_info", JSON.stringify(data.student));
      }

      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error("Backend not reachable");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <h2 className={styles.welcomeTitle}>Welcome Back!</h2>
        <p className={styles.subHeading}>
          To keep connected with us please login with your personal info.
        </p>
        <Link href="/student/register" className={styles.signUpLink}>
          Sign Up
        </Link>
      </div>
      <div className={styles.rightPanel}>
        <h2 className={styles.title}>Sign In</h2>
        <p className={styles.subtitle}>Log in to continue your learning journey</p>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputWrapper}>
            <div className={styles.inputField}>
              <PersonOutlineIcon className={styles.icon} />
              <input
                type="email"
                name="email"
                placeholder="Email or Username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev: any) => ({
                    ...prev,
                    email: "",
                  }));
                }}
              />
            </div>
            {errors.email && (
              <span className={styles.error}>{errors.email}</span>
            )}
          </div>

          <div className={styles.inputWrapper}>
            <div className={styles.inputField}>
              <LockOutlinedIcon className={styles.icon} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev: any) => ({
                    ...prev,
                    password: "",
                  }));
                }}
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

          <div className={styles.optionsRow}>
            <label className={styles.checkboxContainer}>
              <input type="checkbox" /> Remember me
            </label>
            <Link href="/student/forgot-password" className={styles.forgotPass}>Forgot Password?</Link>
          </div>

          <button type="submit" className={styles.submitBtn}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
