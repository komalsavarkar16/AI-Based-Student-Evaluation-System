"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./edit.module.css";
import AdminNavbar from "../../../components/Navbar/Navbar";
import { Close as CloseIcon, Add as AddIcon } from "@mui/icons-material";
import { API_BASE_URL } from "@/app/utils/api";

interface AdminInfo {
    firstName: string;
    lastName: string;
    email: string;
    experience: string;
    expertise: string[];
    department: string;
    designation: string;
    phone: string;
    profileImage?: string;
    isActive: boolean;
}

export default function EditAdminProfile() {
    const router = useRouter();
    const [formData, setFormData] = useState<AdminInfo>({
        firstName: "",
        lastName: "",
        email: "",
        experience: "",
        expertise: [],
        department: "",
        designation: "",
        phone: "",
        profileImage: "",
        isActive: true
    });
    const [newExpertise, setNewExpertise] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adminId, setAdminId] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const adminData = localStorage.getItem("admin_info");
            if (!adminData) {
                router.push("/admin/login");
                return;
            }

            try {
                const { id } = JSON.parse(adminData);
                setAdminId(id);
                const res = await fetch(`${API_BASE_URL}/admin/profile/${id}`);
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        firstName: data.firstName || "",
                        lastName: data.lastName || "",
                        email: data.email || "",
                        experience: data.experience || "",
                        expertise: data.expertise || [],
                        department: data.department || "",
                        designation: data.designation || "",
                        phone: data.phone || "",
                        profileImage: data.profileImage || "",
                        isActive: data.isActive ?? true
                    });
                }
            } catch (err) {
                console.error("Error fetching admin profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddExpertise = () => {
        if (newExpertise.trim() && !formData.expertise.includes(newExpertise.trim())) {
            setFormData(prev => ({
                ...prev,
                expertise: [...prev.expertise, newExpertise.trim()]
            }));
            setNewExpertise("");
        }
    };

    const handleRemoveExpertise = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            expertise: prev.expertise.filter(s => s !== skill)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminId) return;

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/profile/${adminId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                // Update local storage if name changed
                const adminData = JSON.parse(localStorage.getItem("admin_info") || "{}");
                localStorage.setItem("admin_info", JSON.stringify({
                    ...adminData,
                    firstName: formData.firstName,
                    lastName: formData.lastName
                }));
                router.push("/admin/profile");
            } else {
                alert("Failed to update profile");
            }
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("An error occurred. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.loading}>Loading Profile Data...</div>;

    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>
                <div className={styles.card}>
                    <header className={styles.header}>
                        <h1>Edit Admin Profile</h1>
                        <p>Update your professional and personal information.</p>
                    </header>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Email Address (Cannot be changed)</label>
                            <input
                                type="email"
                                value={formData.email}
                                className={styles.input}
                                disabled
                            />
                        </div>

                        <div className={styles.row}>
                            <div className={styles.formGroup}>
                                <label>Department</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="e.g. Computer Science"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Designation</label>
                                <input
                                    type="text"
                                    name="designation"
                                    value={formData.designation}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder="e.g. Senior Professor"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Experience</label>
                            <input
                                type="text"
                                name="experience"
                                value={formData.experience}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="e.g. 10+ Years in Academic Research"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Profile Image URL</label>
                            <input
                                type="text"
                                name="profileImage"
                                value={formData.profileImage || ""}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Expertise / Specialization Areas</label>
                            <div className={styles.expertiseInput}>
                                <input
                                    type="text"
                                    value={newExpertise}
                                    onChange={(e) => setNewExpertise(e.target.value)}
                                    className={styles.input}
                                    placeholder="Add expertise and press +"
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExpertise())}
                                />
                                <button type="button" onClick={handleAddExpertise} className={styles.addBtn}>
                                    <AddIcon />
                                </button>
                            </div>
                            <div className={styles.tags}>
                                {formData.expertise.map(skill => (
                                    <span key={skill} className={styles.tag}>
                                        {skill}
                                        <button type="button" onClick={() => handleRemoveExpertise(skill)}>
                                            <CloseIcon fontSize="small" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button type="button" onClick={() => router.push("/admin/profile")} className={styles.cancelBtn}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.saveBtn} disabled={saving}>
                                {saving ? "Saving Changes..." : "Save Profile Details"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
