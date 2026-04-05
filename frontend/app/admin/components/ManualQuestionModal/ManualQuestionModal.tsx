import React, { useState } from "react";
import styles from "./manualQuestionModal.module.css";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { API_BASE_URL } from "@/app/utils/api";

interface ManualQuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "mcq" | "video";
    courseId: string;
    onSuccess: () => void;
}

const ManualQuestionModal: React.FC<ManualQuestionModalProps> = ({ isOpen, onClose, type, courseId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [courseSkills, setCourseSkills] = useState<string[]>([]);
    
    // MCQ State
    const [mcqData, setMcqData] = useState({
        question: "",
        options: ["", "", "", ""],
        answer: "",
        relatedSkill: ""
    });

    // Video Question State
    const [videoData, setVideoData] = useState({
        question: "",
        relatedSkill: "",
        expectedConceptsString: "" // Comma separated for UI
    });

    React.useEffect(() => {
        if (isOpen && courseId) {
            fetchCourseSkills();
        }
    }, [isOpen, courseId]);

    const fetchCourseSkills = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
                credentials: "include"
            });
            if (response.ok) {
                const data = await response.json();
                setCourseSkills(data.skills_required || []);
            }
        } catch (error) {
            console.error("Failed to fetch skills:", error);
        }
    };

    if (!isOpen) return null;

    const handleSubmitMcq = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!mcqData.question.trim()) {
            toast.error("Question text is required");
            return;
        }
        if (mcqData.options.some(o => !o.trim())) {
            toast.error("All 4 options must be filled");
            return;
        }
        if (!mcqData.answer.trim()) {
            toast.error("Correct answer is required");
            return;
        }
        if (!mcqData.options.includes(mcqData.answer.trim())) {
            toast.error("Correct answer must exactly match one of the options");
            return;
        }
        
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/courses/${courseId}/add-mcq`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(mcqData),
                credentials: "include"
            });
            if (response.ok) {
                toast.success("MCQ added successfully");
                onSuccess();
                onClose();
                // Clear state
                setMcqData({ 
                    question: "", 
                    options: ["", "", "", ""], 
                    answer: "", 
                    relatedSkill: "" 
                });
            } else {
                const errorData = await response.json();
                toast.error(errorData.detail || "Failed to add MCQ");
            }
        } catch (error) {
            toast.error("An error occurred. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!videoData.question.trim() || !videoData.relatedSkill.trim()) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            const formattedVideoData = {
                question: videoData.question,
                relatedSkill: videoData.relatedSkill,
                expectedConcepts: videoData.expectedConceptsString
                    .split(",")
                    .map(s => s.trim())
                    .filter(s => s.length > 0)
            };
            const response = await fetch(`${API_BASE_URL}/courses/${courseId}/add-video-question`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formattedVideoData),
                credentials: "include"
            });
            if (response.ok) {
                toast.success("Video question added successfully");
                onSuccess();
                onClose();
                // Clear state
                setVideoData({ 
                    question: "", 
                    relatedSkill: "", 
                    expectedConceptsString: "" 
                });
            } else {
                const errorData = await response.json();
                toast.error(errorData.detail || "Failed to add video question");
            }
        } catch (error) {
            toast.error("An error occurred. Check backend connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>{type === "mcq" ? "Add Manual MCQ" : "Add Manual Video Question"}</h2>
                    <button onClick={onClose} className={styles.closeBtn}><X size={24} /></button>
                </div>

                {type === "mcq" ? (
                    <form onSubmit={handleSubmitMcq} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label>Question Text</label>
                            <textarea 
                                value={mcqData.question}
                                onChange={(e) => setMcqData({...mcqData, question: e.target.value})}
                                placeholder="Enter question..."
                                rows={3}
                                required
                            />
                        </div>
                        <div className={styles.optionsGrid}>
                            {mcqData.options.map((opt, i) => (
                                <div key={i} className={styles.inputGroup}>
                                    <label>Option {i + 1}</label>
                                    <input 
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOptions = [...mcqData.options];
                                            newOptions[i] = e.target.value;
                                            setMcqData({...mcqData, options: newOptions});
                                        }}
                                        placeholder={`Option ${i + 1}`}
                                        required
                                    />
                                </div>
                            ))}
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Related Skill</label>
                            <select 
                                value={mcqData.relatedSkill} 
                                onChange={(e) => setMcqData({...mcqData, relatedSkill: e.target.value})}
                                required
                                className={styles.select}
                            >
                                <option value="">Select Target Skill</option>
                                {courseSkills.map((skill, i) => (
                                    <option key={i} value={skill}>{skill}</option>
                                ))}
                                <option value="General">General</option>
                            </select>
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Correct Answer</label>
                            <select 
                                value={mcqData.answer} 
                                onChange={(e) => setMcqData({...mcqData, answer: e.target.value})}
                                required
                                className={styles.select}
                            >
                                <option value="">Select Correct Option</option>
                                {mcqData.options.map((opt, i) => (
                                    opt.trim() && <option key={i} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <small className={styles.hint}>The answer must be one of the options above.</small>
                        </div>
                        <button type="submit" disabled={loading} className={styles.submitBtn}>
                            {loading ? "Adding..." : "Add MCQ Question"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmitVideo} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label>Question Text</label>
                            <textarea 
                                value={videoData.question}
                                onChange={(e) => setVideoData({...videoData, question: e.target.value})}
                                placeholder="Enter interview question..."
                                rows={4}
                                required
                            />
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Related Skill</label>
                            <select 
                                value={videoData.relatedSkill} 
                                onChange={(e) => setVideoData({...videoData, relatedSkill: e.target.value})}
                                required
                                className={styles.select}
                            >
                                <option value="">Select Target Skill</option>
                                {courseSkills.map((skill, i) => (
                                    <option key={i} value={skill}>{skill}</option>
                                ))}
                                <option value="General">General</option>
                            </select>
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Expected Concepts (Comma Separated)</label>
                            <input 
                                type="text"
                                value={videoData.expectedConceptsString}
                                onChange={(e) => setVideoData({...videoData, expectedConceptsString: e.target.value})}
                                placeholder="e.g. loops, arrays, time complexity"
                            />
                            <small className={styles.hint}>AI will look for these keywords in the answer.</small>
                        </div>
                        <button type="submit" disabled={loading} className={styles.submitBtn}>
                            {loading ? "Adding..." : "Add Video Question"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ManualQuestionModal;
