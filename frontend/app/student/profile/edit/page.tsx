"use client";
import React, { useState, useEffect } from "react";
import styles from "./edit.module.css";
import StudentNavbar from "../../components/StudentNavbar/StudentNavbar";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface StudentInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    university?: string;
    major?: string;
    year?: string;
    gpa?: string;
    gender?: string;
    location?: string;
    dob?: string;
    profileImage?: string;
    skills?: string[];
}

export default function EditProfile() {
    const router = useRouter();
    const [formData, setFormData] = useState<StudentInfo>({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        university: "",
        major: "",
        year: "",
        gpa: "",
        gender: "",
        location: "",
        dob: "",
        skills: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [skillsString, setSkillsString] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            const studentId = localStorage.getItem("student_id");
            if (!studentId) {
                router.push("/student/login");
                return;
            }

            try {
                const res = await fetch(`http://localhost:8000/student/profile/${studentId}`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData(data);
                    if (data.skills) {
                        setSkillsString(data.skills.join(", "));
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSkillsString(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const studentId = localStorage.getItem("student_id");

        const updatedData = {
            ...formData,
            skills: skillsString.split(",").map(s => s.trim()).filter(s => s !== "")
        };

        try {
            const res = await fetch(`http://localhost:8000/student/profile/${studentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            if (res.ok) {
                // Update local storage if name changed
                const storedInfo = localStorage.getItem("student_info");
                if (storedInfo) {
                    const parsed = JSON.parse(storedInfo);
                    parsed.firstName = formData.firstName;
                    parsed.lastName = formData.lastName;
                    localStorage.setItem("student_info", JSON.stringify(parsed));
                }
                router.push("/student/profile");
            } else {
                alert("Failed to update profile");
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading...</div>;

    return (
        <div className={styles.container}>
            <StudentNavbar />
            <main className={styles.mainContent}>
                <div className={styles.card}>
                    <h2>Edit Your Profile</h2>
                    <form className={styles.editForm} onSubmit={handleSubmit}>
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label>First Name</label>
                                <input name="firstName" value={formData.firstName} onChange={handleChange} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Last Name</label>
                                <input name="lastName" value={formData.lastName} onChange={handleChange} required />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Phone Number</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleChange}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Date of Birth</label>
                                <input name="dob" type="date" value={formData.dob} onChange={handleChange} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Location</label>
                                <input name="location" value={formData.location} onChange={handleChange} placeholder="Mumbai, India" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>University</label>
                                <input name="university" value={formData.university} onChange={handleChange} placeholder="University Name" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Major / Course</label>
                                <input name="major" value={formData.major} onChange={handleChange} placeholder="Computer Science" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Current Year/Semester</label>
                                <input name="year" value={formData.year} onChange={handleChange} placeholder="3rd Year" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>GPA</label>
                                <input name="gpa" value={formData.gpa} onChange={handleChange} placeholder="3.85" />
                            </div>
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label>Skills (comma separated)</label>
                                <input value={skillsString} onChange={handleSkillsChange} placeholder="Python, React, Node.js" />
                            </div>
                        </div>

                        <div className={styles.buttonGroup}>
                            <button type="submit" className={styles.saveBtn} disabled={saving}>
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                            <Link href="/student/profile" className={styles.cancelBtn}>
                                Cancel
                            </Link>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
