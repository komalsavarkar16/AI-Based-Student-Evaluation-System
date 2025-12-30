"use client";
import { useState } from "react";
import styles from "./register.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-toastify";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<any>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    let newErrors: any = {};

    if (!formData.firstName) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName) {
      newErrors.lastName = "Last name is required";
      console.log("Last name is required");
    }

    if (!formData.email) {
      newErrors.email = "Email name is required";
    } else if (!formData.email.includes("@")) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Minimum 6 characters required";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      toast.error("Passwords do not match!!!")
      // alert("Passwords do not match");
      return;
    }

    console.log("Error found:", newErrors);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/student/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail)
        console.log(formData)
        return;
      }

      toast.success("Registration successful");
      router.push("/student/login");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong")
      // alert("Something went wrong");
      console.log(error);
    }
  };

  console.log(formData);

  return (
    <div className={styles.container}>
      {/* LEFT PANEL */}
      <div className={styles.leftPanel}>
        <h2>Welcome</h2>
        <h4 className={styles.subHeading}>
          This platform evaluates your skills using AI, identifies knowledge
          gaps, and recommends personalized courses to improve your performance.
        </h4>
        <span className={styles.text}>Already have an account?</span>
        <Link href="/student/login" className={styles.logIn}>
          Log In
        </Link>

        <p className={styles.footer}>Terms of Use & Privacy Policy</p>
      </div>

      {/* RIGHT PANEL */}
      <div className={styles.rightPanel}>
        <h2 className={styles.title}>Create Your Student Account</h2>
        <p>
          Start your AI-powered skill evaluation and personalized learning
          journey.
        </p>
        {/* Avatar */}
        <div className={styles.avatar}>
          <span>+</span>
        </div>
        <p>Upload a profile picture</p>

        {/* Form */}
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
              {errors.firstName && (
                <span className={styles.error}>{errors.firstName}</span>
              )}
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
              {errors.lastName && (
                <span className={styles.error}>{errors.lastName}</span>
              )}
            </div>
          </div>

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

          {/* Password + Confirm */}
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
              {errors.confirmPassword && (
                <span className={styles.error}>{errors.confirmPassword}</span>
              )}
            </div>
          </div>
          <button type="submit" className={styles.submitBtn}>
            Get Started
          </button>
        </form>
        <p className={styles.footer}>
          © 2025 AI Student Evaluation System Built for academic & skill
          assessment
        </p>
      </div>
    </div>
  );
}
