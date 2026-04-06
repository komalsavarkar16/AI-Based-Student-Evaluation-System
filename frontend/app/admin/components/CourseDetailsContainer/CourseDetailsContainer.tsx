"use client"
import { useEffect, useState } from "react";
import { Course } from "../../../types/course";
import styles from "./courseDetailsContainer.module.css";
import { LayoutList, Video, Clock, BarChart, GraduationCap, Sparkles, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { API_BASE_URL, authenticatedFetch } from "@/app/utils/api";
import ConfirmationModal from "@/app/components/ConfirmationModal/ConfirmationModal";

interface courseDetailsProps {
    courseId: string;
    isAdmin?: boolean;
}

export default function CourseDetailsContainer({ courseId, isAdmin = true }: courseDetailsProps) {
    const router = useRouter();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingMcq, setGeneratingMcq] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [testCompleted, setTestCompleted] = useState(false);
    const [testPassed, setTestPassed] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        fetchCourse()
        checkTestCompletion()
    }, [])

    const checkTestCompletion = async () => {
        const studentId = localStorage.getItem("student_id");
        if (!studentId || isAdmin) return;

        try {
            const res = await authenticatedFetch(`${API_BASE_URL}/student/check-test-status/${studentId}/${courseId}`);
            if (res.ok) {
                const data = await res.json();
                setTestCompleted(data.completed);
                setTestPassed(data.passed);
            }
        } catch (error) {
            console.error("Error checking test status:", error);
        }
    };

    const fetchCourse = async () => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/courses/${courseId}`)
            const data = await response.json()
            setCourse(data)
        }
        catch (error) {
            console.error(error);
            toast.error("Failed to load course details");
        }
        finally {
            setLoading(false)
        }
    }

    const handleDeleteCourse = async () => {
        if (!course) return;
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteCourse = async () => {
        if (!course) return;

        setIsDeleting(true);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/courses/${courseId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                toast.success("Course deleted successfully!");
                router.push("/admin/courses");
            } else {
                const data = await response.json();
                toast.error(data.detail || "Failed to delete course");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting course");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleGenerateMCQ = async () => {
        setGeneratingMcq(true);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/ai/generate/mcq/${courseId}`, {
                method: "POST"
            });
            if (response.ok) {
                toast.success("MCQs generated successfully!");
                // Dispatch event to refresh the MCQ container
                window.dispatchEvent(new Event('refreshMCQs'));
            } else {
                throw new Error("Failed to generate MCQs");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error generating MCQs");
        } finally {
            setGeneratingMcq(false);
        }
    };

    const handleEnroll = async () => {
        try {
            const studentId = localStorage.getItem("student_id");
            if (!studentId) {
                toast.error("Please login as a student to enroll");
                router.push("/student/login");
                return;
            }

            // 1. Fetch student profile to check skills and academic details
            const profileRes = await authenticatedFetch(`${API_BASE_URL}/student/profile/${studentId}`);
            if (!profileRes.ok) {
                toast.error("Failed to verify profile details");
                return;
            }

            const profile = await profileRes.json();

            // 2. Check if skills and academic details are filled
            const hasSkills = profile.skills && profile.skills.length > 0;
            const hasAcademicDetails = profile.university && profile.major && profile.year && profile.gpa;

            if (!hasSkills || !hasAcademicDetails) {
                toast.warning("Please fill your skills and academic details in your profile before enrolling.");
                router.push("/student/profile");
                return;
            }

            // 3. Check if MCQs exist for the course
            const mcqRes = await authenticatedFetch(`${API_BASE_URL}/ai/get/mcq/${courseId}`);
            if (!mcqRes.ok) {
                if (mcqRes.status === 404) {
                    toast.info("Assessment is not yet ready for this course. Please contact administrator.");
                } else {
                    toast.error("Error fetching assessment details");
                }
                return;
            }

            toast.success("Redirecting to the MCQ Assessment...");
            router.push(`/student/test/${courseId}`);

        } catch (error) {
            console.error(error);
            toast.error("Failed to enroll in the course");
        }
    };

    const handleVideoTest = () => {
        router.push(`/student/video-test/${courseId}`);
    };

    const handleStatusChange = async (newStatus: string) => {
        setUpdatingStatus(true);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/courses/${courseId}`, {
                method: "PUT",
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                toast.success(`Course status updated to ${newStatus}`);
                setCourse(prev => prev ? { ...prev, status: newStatus } : null);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Failed to update status");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Error updating course status");
        } finally {
            setUpdatingStatus(false);
        }
    };


    const handleGenerateVideoQuestions = async () => {
        setGeneratingVideo(true);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/ai/generate/video-questions/${courseId}`, {
                method: "POST"
            });
            if (response.ok) {
                toast.success("Video questions generated successfully!");
                // Dispatch event to refresh the questions container
                window.dispatchEvent(new Event('refreshVideoQuestions'));
            } else {
                throw new Error("Failed to generate video questions");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error generating video questions");
        } finally {
            setGeneratingVideo(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading course details...</p>
            </div>
        );
    }

    if (!course) return <p className={styles.container}>Course not found</p>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <p className={styles.category}>{course.category.toUpperCase()}</p>
                <h1 className={styles.title}>{course.title}</h1>
                <div className={styles.skillsContainer}>
                    {course.skills_required.map((skill, index) => (
                        <span key={index} className={styles.skillBadge}>{skill}</span>
                    ))}
                </div>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <Clock size={20} color="#5664f5" />
                    <span className={styles.statLabel}>Duration</span>
                    <span className={styles.statValue}>{course.duration}</span>
                </div>
                <div className={styles.statCard}>
                    <BarChart size={20} color="#a855f7" />
                    <span className={styles.statLabel}>Level</span>
                    <span className={styles.statValue}>{course.level}</span>
                </div>
                <div className={styles.statCard}>
                    <GraduationCap size={20} color="#10b981" />
                    <span className={styles.statLabel}>Status</span>
                    {isAdmin ? (
                        <select
                            className={styles.statusSelect}
                            value={course.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            disabled={updatingStatus}
                        >
                            <option value="Draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="Archived">Archived</option>
                        </select>
                    ) : (
                        <span className={styles.statValue}>{course.status}</span>
                    )}
                </div>
            </div>

            <div className={styles.contentRow}>
                <div className={styles.mainSection}>
                    <h2 className={styles.sectionTitle}>Course Description</h2>
                    <p className={styles.description}>{course.description}</p>
                </div>

                <div className={styles.actionsSection}>
                    {isAdmin ? (
                        <div className={styles.actionCard}>
                            <h3 className={styles.sectionTitle}>Course Management</h3>
                            <button
                                className={`${styles.actionBtn} ${styles.generateMcq}`}
                                onClick={handleGenerateMCQ}
                                disabled={generatingMcq}
                            >
                                {generatingMcq ? <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div> : <LayoutList size={20} />}
                                {generatingMcq ? "Generating..." : "Generate MCQ"}
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.generateVideo}`}
                                onClick={handleGenerateVideoQuestions}
                                disabled={generatingVideo}
                            >
                                {generatingVideo ? <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div> : <Video size={20} />}
                                {generatingVideo ? "Generating..." : "Generate Video Questions"}
                            </button>
                            <button
                                className={`${styles.actionBtn} ${styles.deleteCourseBtn}`}
                                onClick={handleDeleteCourse}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <div className={styles.spinner} style={{ width: '20px', height: '20px' }}></div> : <Trash2 size={20} />}
                                {isDeleting ? "Deleting..." : "Delete Course"}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.actionCard}>
                            <h3 className={styles.sectionTitle}>Course Action</h3>
                            {!testCompleted ? (
                                <button
                                    className={`${styles.actionBtn} ${styles.enrollBtn}`}
                                    onClick={handleEnroll}
                                >
                                    <Sparkles size={20} />
                                    Enroll Now
                                </button>
                            ) : testPassed ? (
                                <button
                                    className={`${styles.actionBtn} ${styles.videoBtn}`}
                                    onClick={handleVideoTest}
                                >
                                    <Video size={20} />
                                    Give Video Based Test
                                </button>
                            ) : (
                                <div className={styles.failMessage}>
                                    <p>Your assessment status: <strong>Needs Improvement</strong>. Please review recommendations to enhance your skills before further action is allowed.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteCourse}
                title="Delete Course"
                message={`Are you sure you want to delete the course "${course.title}"? This action cannot be undone.`}
                confirmText="Delete Course"
                isDestructive={true}
            />
        </div>
    );
}
