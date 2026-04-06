"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SchoolIcon from "@mui/icons-material/School";
import ShieldIcon from "@mui/icons-material/Shield";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";
import styles from "./Auth.module.css";

interface LoginFormProps {
  initialRole?: "admin" | "student";
  onRoleChange?: (role: "admin" | "student") => void;
  showRoleSwitcher?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({
  initialRole = "student",
  onRoleChange,
  showRoleSwitcher = true,
}) => {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "student">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // Dynamic values based on role
  const config = {
    student: {
      title: "Student Sign In",
      subtitle: "Log in to continue your learning journey",
      apiEndpoint: "/student/login",
      redirectPath: "/student",
      storageKey: "student_info",
      forgotPasswordLink: "/student/forgot-password",
    },
    admin: {
      title: "Admin Sign In",
      subtitle: "Log in to access the control panel",
      apiEndpoint: "/admin/login",
      redirectPath: "/admin",
      storageKey: "admin_info",
      forgotPasswordLink: "/admin/forgot-password",
    },
  }[role];

  useEffect(() => {
    // Check if user info exists as a hint for redirection
    const userInfo = localStorage.getItem(config.storageKey);
    if (userInfo) {
      router.push(config.redirectPath);
    }
  }, [router, config.redirectPath, config.storageKey]);

  const handleRoleToggle = (newRole: "admin" | "student") => {
    setRole(newRole);
    if (onRoleChange) onRoleChange(newRole);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    let newErrors: any = {};

    if (!email) newErrors.email = "Email is required";
    else if (!email.includes("@")) newErrors.email = "Please enter a valid email";
    if (!password) newErrors.password = "Password is required";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await fetch(`${API_BASE_URL}${config.apiEndpoint}`, {
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
      // Token is now handled via HttpOnly cookie AND stored in localStorage for header-based auth
      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      // Store user info based on role
      if (data[role]) {
        localStorage.setItem(config.storageKey, JSON.stringify(data[role]));
        if (role === 'student' && data.student.id) {
          localStorage.setItem("student_id", data.student.id);
        }
      }

      router.push(config.redirectPath);
    } catch (err) {
      console.error(err);
      toast.error("Backend not reachable");
    }
  };

  return (
    <>
      <h2 className={styles.title}>{config.title}</h2>
      <p className={styles.subtitle}>{config.subtitle}</p>

      {showRoleSwitcher && (
        <div className={`${styles.roleSwitcher} ${role === 'admin' ? styles.adminActive : ''}`}>
          <div className={styles.tabSlider}></div>
          <button
            type="button"
            className={`${styles.roleTab} ${role === 'student' ? styles.activeTab : ''}`}
            onClick={() => handleRoleToggle('student')}
          >
            <SchoolIcon sx={{ fontSize: 20 }} /> Student
          </button>
          <button
            type="button"
            className={`${styles.roleTab} ${role === 'admin' ? styles.activeTab : ''}`}
            onClick={() => handleRoleToggle('admin')}
          >
            <ShieldIcon sx={{ fontSize: 20 }} /> Admin
          </button>
        </div>
      )}

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
          <Link href={config.forgotPasswordLink} className={styles.forgotPass}>Forgot Password?</Link>
        </div>

        <button type="submit" className={styles.submitBtn}>
          Sign In
        </button>

        <div className={styles.formFooter}>
          <span>Don't have an account?</span>
          <Link href="/register" className={styles.footerLink}>
            Sign Up
          </Link>
        </div>
      </form>
    </>
  );
};

export default LoginForm;
