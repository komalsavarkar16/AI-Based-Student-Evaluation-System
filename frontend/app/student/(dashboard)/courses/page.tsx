"use client";

import React, { useState, useEffect } from "react";
import styles from "./courses.module.css";
import { Course } from "../../../types/course";
import Link from "next/link";
import StudentNavbar from "../../components/StudentNavbar/StudentNavbar";
import SearchBar from "@/app/components/SearchBar/SearchBar";
import {
    School as SchoolIcon,
    Category as CategoryIcon,
    BarChart as LevelIcon,
    ArrowForward as ViewIcon,
    Search as SearchIcon
} from "@mui/icons-material";
import { API_BASE_URL, authenticatedFetch } from "@/app/utils/api";

export default function StudentCourses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await authenticatedFetch(`${API_BASE_URL}/courses`);
            const data = await res.json();
            // Filter for active/published courses if necessary, for now showing all
            const publishedCourses = data.filter(
                (course: Course) => course.status === "published"
            );
            setCourses(publishedCourses);
        } catch (err) {
            console.error("Failed to load courses", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <main className={styles.mainContent}>
                <div className={styles.headerSection}>
                    <div className={styles.headerText}>
                        <h1 className={styles.title}>Available Courses</h1>
                        <p className={styles.subtitle}>Explore our catalog and start your learning journey today.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <SearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search courses..."
                        />
                    </div>
                </div>

                {loading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.loader}></div>
                        <p>Fetching amazing courses for you...</p>
                    </div>
                ) : courses.length === 0 ? (
                    <div className={styles.emptyState}>
                        <SchoolIcon style={{ fontSize: 64, color: '#94a3b8' }} />
                        <h3>No courses found</h3>
                        <p>Check back later for new learning opportunities.</p>
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className={styles.emptyState}>
                        <SearchIcon style={{ fontSize: 64, color: '#94a3b8' }} />
                        <h3>No results found</h3>
                        <p>No courses match your search "{searchQuery}"</p>
                        <button
                            className={styles.resetSearch}
                            onClick={() => setSearchQuery("")}
                        >
                            Clear Search
                        </button>
                    </div>
                ) : (
                    <div className={styles.coursesGrid}>
                        {filteredCourses.map((course) => (
                            <div key={course._id} className={styles.courseCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.courseIcon}>
                                        <SchoolIcon />
                                    </div>
                                    <span className={styles.levelTag}>{course.level}</span>
                                </div>

                                <div className={styles.cardBody}>
                                    <h2 className={styles.courseTitle}>{course.title}</h2>
                                    <div className={styles.metaRow}>
                                        <div className={styles.metaItem}>
                                            <CategoryIcon fontSize="small" />
                                            <span>{course.category}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <LevelIcon fontSize="small" />
                                            <span>{course.level}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.cardFooter}>
                                    <Link className={styles.enrollButton} href={`/student/courses/${course._id}`}>View Details
                                        <ViewIcon fontSize="small" /></Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
