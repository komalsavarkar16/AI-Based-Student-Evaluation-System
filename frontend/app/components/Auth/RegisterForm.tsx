"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SchoolIcon from "@mui/icons-material/School";
import ShieldIcon from "@mui/icons-material/Shield";
import { toast } from "react-toastify";
import { API_BASE_URL, authenticatedFetch } from "@/app/utils/api";
import styles from "./Auth.module.css";

interface RegisterFormProps {
  initialRole?: "admin" | "student";
  onRoleChange?: (role: "admin" | "student") => void;
  showRoleSwitcher?: boolean;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  initialRole = "student",
  onRoleChange,
  showRoleSwitcher = true,
}) => {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "student">(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<any>({});

  const config = {
    student: {
      title: "Student Registration",
      subtitle: "Join our AI-powered learning community",
      apiEndpoint: "/student/register",
      redirectPath: "/login",
    },
    admin: {
      title: "Admin Registration",
      subtitle: "Create an administrator account",
      apiEndpoint: "/admin/register",
      redirectPath: "/login",
    },
  }[role];

  const handleRoleToggle = (newRole: "admin" | "student") => {
    setRole(newRole);
    if (onRoleChange) onRoleChange(newRole);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev: any) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let newErrors: any = {};

    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!formData.email.includes("@")) newErrors.email = "Invalid email";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Min 6 chars";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords match failed";
      toast.error("Passwords do not match!");
      return;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await authenticatedFetch(`${API_BASE_URL}${config.apiEndpoint}`, {
        method: "POST",
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || "Registration failed");
        return;
      }

      toast.success(`${role.charAt(0).toUpperCase() + role.slice(1)} Registration successful`);
      router.push(config.redirectPath);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
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

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className={styles.inputWrapper}>
            <div className={styles.inputField}>
              <PersonOutlineIcon className={styles.icon} />
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <div className={styles.inputField}>
              <PersonOutlineIcon className={styles.icon} />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
            {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
          </div>
        </div>

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
          {errors.email && <span className={styles.error}>{errors.email}</span>}
        </div>

        <div className={styles.row}>
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
              <span className={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </span>
            </div>
            {errors.password && <span className={styles.error}>{errors.password}</span>}
          </div>

          <div className={styles.inputWrapper}>
            <div className={styles.inputField}>
              <LockOutlinedIcon className={styles.icon} />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
            {errors.confirmPassword && <span className={styles.error}>{errors.confirmPassword}</span>}
          </div>
        </div>

        <button type="submit" className={styles.submitBtn}>
          Sign Up
        </button>

        <div className={styles.formFooter}>
          <span>Already have an account?</span>
          <Link href="/login" className={styles.footerLink}>
            Sign In
          </Link>
        </div>
      </form>
    </>
  );
};

export default RegisterForm;
