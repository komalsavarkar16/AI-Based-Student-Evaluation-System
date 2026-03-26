'use client';

import React, { useState, useEffect } from 'react';
import styles from './announcements.module.css';
import {
    Add,
    Edit,
    Delete,
    Campaign,
    CalendarToday,
    Groups,
    Book,
    Cancel,
    Save
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { API_BASE_URL } from "@/app/utils/api";

interface Announcement {
    id: string;
    title: string;
    message: string;
    targetAudience: string;
    courseId?: string;
    expiryDate?: string;
    createdAt: string;
    status: string;
}

interface Course {
    _id: string;
    title: string;
}

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        targetAudience: 'all',
        courseId: '',
        expiryDate: '',
    });

    useEffect(() => {
        fetchAnnouncements();
        fetchCourses();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE_URL}/admin/announcements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAnnouncements(data);
            }
        } catch (error) {
            console.error("Error fetching announcements:", error);
            toast.error("Failed to load announcements");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE_URL}/courses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const handleOpenModal = (announcement: Announcement | null = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setFormData({
                title: announcement.title,
                message: announcement.message,
                targetAudience: announcement.targetAudience,
                courseId: announcement.courseId || '',
                expiryDate: announcement.expiryDate || '',
            });
        } else {
            setEditingAnnouncement(null);
            setFormData({
                title: '',
                message: '',
                targetAudience: 'all',
                courseId: '',
                expiryDate: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem("auth_token");
            const url = editingAnnouncement 
                ? `${API_BASE_URL}/admin/announcements/${editingAnnouncement.id}`
                : `${API_BASE_URL}/admin/announcements`;
            
            const method = editingAnnouncement ? 'PUT' : 'POST';
            
            const payload = {
                ...formData,
                courseId: formData.targetAudience === 'course' ? formData.courseId : null,
                expiryDate: formData.expiryDate || null
            };

            const response = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                toast.success(editingAnnouncement ? "Announcement updated!" : "Announcement posted!");
                setIsModalOpen(false);
                fetchAnnouncements();
            } else {
                toast.error("Failed to save announcement");
            }
        } catch (error) {
            console.error("Error saving announcement:", error);
            toast.error("An error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;

        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${API_BASE_URL}/admin/announcements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Announcement deleted");
                fetchAnnouncements();
            } else {
                toast.error("Failed to delete announcement");
            }
        } catch (error) {
            console.error("Error deleting announcement:", error);
            toast.error("An error occurred");
        }
    };

    if (isLoading) {
        return <div className={styles.container}>Loading announcements...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Announcements</h1>
                    <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Manage communication with your students.</p>
                </div>
                <button className={styles.createBtn} onClick={() => handleOpenModal()}>
                    <Add />
                    Create Announcement
                </button>
            </div>

            <div className={styles.grid}>
                {announcements.length > 0 ? (
                    announcements.map((announcement) => (
                        <div key={announcement.id} className={styles.announcementCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>{announcement.title}</h3>
                                <span className={`${styles.status} ${announcement.status === 'Active' ? styles.statusActive : styles.statusExpired}`}>
                                    {announcement.status}
                                </span>
                            </div>
                            <p className={styles.message}>{announcement.message}</p>
                            
                            <div className={styles.targetBadge}>
                                {announcement.targetAudience === 'all' ? (
                                    <><Groups style={{ fontSize: '14px', marginRight: '4px' }} /> All Students</>
                                ) : (
                                    <><Book style={{ fontSize: '14px', marginRight: '4px' }} /> {courses.find(c => c._id === announcement.courseId)?.title || 'Specific Course'}</>
                                )}
                            </div>

                            <div className={styles.cardFooter}>
                                <div className={styles.date}>
                                    <CalendarToday style={{ fontSize: '14px', marginRight: '4px' }} />
                                    {new Date(announcement.createdAt).toLocaleDateString()}
                                    {announcement.expiryDate && ` • Exp: ${new Date(announcement.expiryDate).toLocaleDateString()}`}
                                </div>
                                <div className={styles.actions}>
                                    <button className={`${styles.actionBtn} styles.editBtn`} onClick={() => handleOpenModal(announcement)}>
                                        <Edit fontSize="small" />
                                    </button>
                                    <button className={`${styles.actionBtn} styles.deleteBtn`} onClick={() => handleDelete(announcement.id)}>
                                        <Delete fontSize="small" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.emptyState}>
                        <Campaign style={{ fontSize: '48px', color: '#e2e8f0', marginBottom: '1rem' }} />
                        <h3 className={styles.emptyTitle}>No announcements found</h3>
                        <p className={styles.emptyText}>Start by creating your first announcement for students.</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Title</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="e.g., Final Exam Schedule"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Message</label>
                                <textarea
                                    className={styles.textarea}
                                    placeholder="Write your announcement message here..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Target Audience</label>
                                <select 
                                    className={styles.select}
                                    value={formData.targetAudience}
                                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                                >
                                    <option value="all">All Students</option>
                                    <option value="course">Specific Course</option>
                                </select>
                            </div>
                            
                            {formData.targetAudience === 'course' && (
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Select Course</label>
                                    <select 
                                        className={styles.select}
                                        value={formData.courseId}
                                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                                        required
                                    >
                                        <option value="">Choose a course...</option>
                                        {courses.map(course => (
                                            <option key={course._id} value={course._id}>{course.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Expiry Date (Optional)</label>
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={formData.expiryDate}
                                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                />
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>
                                    <Cancel style={{ marginRight: '6px' }} />
                                    Cancel
                                </button>
                                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                                    <Save style={{ marginRight: '6px' }} />
                                    {isSubmitting ? 'Saving...' : (editingAnnouncement ? 'Update' : 'Post Announcement')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
