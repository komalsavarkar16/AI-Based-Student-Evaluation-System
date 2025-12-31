"use client";
import styles from "./login.module.css";
import Link from "next/link";
import Image from "next/image";
import studImage from "../../../public/assets/images/Login/loginPage.jpg";
import { useState } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function Login() {
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
      console.log("error occured")
    } else if (!email.includes("@")) {
      newErrors.email = "Please enter a valid email"
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(text);
        console.log(email, password);
        toast.error("Login failed");
        return;
      }

      const data = await res.json();
      toast.success("Login successful 🎉");
      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error("Backend not reachable")
      // alert("Backend not reachable");
    }
  };
  return (
    <div className={styles.mainContainer}>
      <div className={styles.formContainer}>
        <form className={styles.form} onSubmit={handleLogin}>
          <h1 className={styles.heading}>Sign In to your account</h1>
          <div className={styles.inputGroup}>
            <label className={styles.labels}>Email or username<span className={styles.asterisk}>*</span></label>
            <input
              className={styles.input}
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or username"
            />
            {errors.email && (
              <span className={styles.error}>{errors.email}</span>
            )}
          </div>
          <div className={styles.inputGroup}>
            <div className={styles.labelContainer}>
              <label className={styles.labels}>Password<span className={styles.asterisk}>*</span></label>
              <Link href="/" className={styles.link}>
                Forgot Password?
              </Link>
            </div>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <span
                className={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </span>
              {errors.password && (
                <span className={styles.error}>{errors.password}</span>
              )}
            </div>
          </div>
          <div className={styles.flexContainer}>
            <input type="checkbox" />
            <span>Remember me</span>
          </div>
          <button type="submit" className={styles.signInBtn}>
            Sign In
          </button>
          <div className={styles.flexContainer}>
            <label>Not registered yet?</label>
            <Link href="/student/register" className={styles.link}>
              Create an account
            </Link>
          </div>
        </form>
      </div>
      <Image
        src={studImage}
        alt="Student"
        width={700}
        height={600}
        quality={90}
        className={styles.image}
      />
    </div>
  );
}
