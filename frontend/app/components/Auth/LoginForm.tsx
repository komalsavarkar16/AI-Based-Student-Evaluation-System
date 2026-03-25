"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";
import styles from "./Auth.module.css";

interface LoginFormProps {
  role: "admin" | "student";
  title: string;
  subtitle: string;
  apiEndpoint: string;
  redirectPath: string;
  storageKey: string;
  forgotPasswordLink: string;
}

const LoginForm: React.FC<LoginFormProps> = ({
  role,
  title,
  subtitle,
  apiEndpoint,
  redirectPath,
  storageKey,
  forgotPasswordLink,
}) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.push(redirectPath);
    }
  }, [router, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let newErrors: any = {};

    if (!email) newErrors.email = "Email is required";
    else if (!email.includes("@")) newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await fetch(`${API_BASE_URL}${apiEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || "Login failed");
        return;
      }

      toast.success("Login successful");
      if (data.access_token) localStorage.setItem("auth_token", data.access_token);
      if (data[role]) {
        localStorage.setItem(storageKey, JSON.stringify(data[role]));
        if (role === 'student' && data.student.id) {
           localStorage.setItem("student_id", data.student.id);
        }
      }

      router.push(redirectPath);
    } catch (err) {
      console.error(err);
      toast.error("Backend not reachable");
    }
  };

  return (
    <>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      <form className={styles.form} onSubmit={handleLogin}>
        <div className={styles.inputWrapper}>
          <div className={styles.inputField}>
            <PersonOutlineIcon className={styles.icon} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev: any) => ({ ...prev, email: "" }));
              }}
            />
          </div>
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </div>

        <div className={styles.inputWrapper}>
          <div className={styles.inputField}>
            <LockOutlinedIcon className={styles.icon} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev: any) => ({ ...prev, password: "" }));
              }}
            />
            <span className={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
            </span>
          </div>
          {errors.password && <span className={styles.error}>{errors.password}</span>}
        </div>

        <div className={styles.optionsRow}>
          <label className={styles.checkboxContainer}>
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
          </label>
          <Link href={forgotPasswordLink} className={styles.forgotPass}>Forgot Password?</Link>
        </div>

        <button type="submit" className={styles.submitBtn}>
          Sign In
        </button>
      </form>
    </>
  );
};

export default LoginForm;
