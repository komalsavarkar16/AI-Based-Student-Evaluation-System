"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./add.module.css";
import Link from "next/link";
import { toast } from "react-toastify";
import { ArrowBack } from "@mui/icons-material";

export default function AddCourse() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [courseId, setCourseId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        level: "Beginner",
        duration: "",
        skills_required: "",
        status: "Draft",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const finalStatus = formData.status;
        const payload = {
            ...formData,
            status: finalStatus,
            skills_required: formData.skills_required.split(",").map((s) => s.trim()).filter((s) => s !== ""),
        };

        try {
            const res = await fetch("http://127.0.0.1:8000/courses/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                setCourseId(data.course_id);
                toast.success(`Course saved as ${finalStatus}!`);
                router.push("/admin/courses");
                // If it was a full "Add Course" (Active), we might want to redirect, 
                // but per requirements, we enable buttons after save.
                // if (finalStatus === "Active") {
                //     router.push("/admin/courses");
                // }
            } else {
                const errorData = await res.json();
                toast.error(`Error: ${errorData.detail || "Failed to save course"}`);
            }
        } catch (err) {
            console.error("Failed to save course", err);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <Link href="/admin/courses" className={styles.backButton}>
                        <ArrowBack /> Back to Courses
                    </Link>
                    <h1 className={styles.title}>Add New Course</h1>
                </div>

                <form className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="title">Course Title</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. Introduction to React"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="A brief overview of the course content..."
                            required
                            rows={4}
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="category">Category</label>
                            <input
                                type="text"
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                placeholder="e.g. Web Development"
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="level">Level</label>
                            <select id="level" name="level" value={formData.level} onChange={handleChange}>
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="duration">Duration</label>
                            <input
                                type="text"
                                id="duration"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                placeholder="e.g. 10 hours"
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label htmlFor="status">Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange}>
                                <option value="Draft">Draft</option>
                                <option value="Active">Active</option>
                                <option value="Archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="skills_required">Skills Required (comma separated)</label>
                        <input
                            type="text"
                            id="skills_required"
                            name="skills_required"
                            value={formData.skills_required}
                            onChange={handleChange}
                            placeholder="e.g. HTML, CSS, JavaScript"
                            required
                        />
                    </div>
                    <button
                        type="button"
                        className={styles.submitButton}
                        onClick={(e) => handleSubmit(e)}
                        disabled={loading}
                    >
                        {loading ? "Adding..." : "Add Course"}
                    </button>

                    <div className={styles.aiButtonGroup}>
                        <button
                            type="button"
                            className={styles.aiButton}
                            disabled={!courseId}
                            title={!courseId ? "Save course first" : "Generate MCQs"}
                        >
                            Generate MCQs
                        </button>
                        <button
                            type="button"
                            className={styles.aiButton}
                            disabled={!courseId}
                            title={!courseId ? "Save course first" : "Generate Video Questions"}
                        >
                            Generate Video Questions
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
