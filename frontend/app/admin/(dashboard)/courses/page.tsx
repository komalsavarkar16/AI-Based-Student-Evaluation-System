"use client";

import styles from "./courses.module.css";
import { useState, useEffect } from "react";
import { Course } from "../../../types/course";
import { API_BASE_URL, authenticatedFetch } from "@/app/utils/api";
import SearchBar from "@/app/components/SearchBar/SearchBar";

import Link from "next/link";
import { BookOpen, Layers, Activity, Plus, Layout, Search } from "lucide-react";

export default function Courses() {
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
      setCourses(data);
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

  if (loading) return (
    <div className={styles.loadingContainer}>
      <p>Loading premium courses...</p>
    </div>
  );

  return (
    <div className={styles.mainContainer}>
      <div className={styles.headerContainer}>
        <div>
          <h1 className={styles.courseHeading}>Courses Management</h1>
          <p className={styles.courseSubheading}>Manage and organize your academic catalog</p>
        </div>
        <div className={styles.headerActions}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by title or category..."
          />
          <Link href="/admin/courses/add">
            <button className={styles.addCourseButton}>
              <Plus size={18} style={{ marginRight: '8px' }} />
              Add New Course
            </button>
          </Link>
        </div>
      </div>
      {courses.length === 0 ? (
        <div className={styles.emptyState}>
          <Layout size={48} color="#94a3b8" />
          <p>No courses available at the moment.</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.emptyState}>
          <Search size={48} color="#94a3b8" />
          <p>No courses match your search "{searchQuery}"</p>
          <button
            className={styles.resetSearch}
            onClick={() => setSearchQuery("")}
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className={styles.coursesContainer}>
          {filteredCourses.map((course) => (
            <div key={course._id} className={styles.courseCard}>
              <h2 className={styles.courseTitle}>{course.title}</h2>

              <div className={styles.detailsList}>
                <p className={styles.category}>
                  <span><BookOpen size={16} /> Category</span>
                  <span>{course.category}</span>
                </p>
                <p className={styles.level}>
                  <span><Layers size={16} /> Level</span>
                  <span>{course.level}</span>
                </p>
                <p className={styles.status}>
                  <span><Activity size={16} /> Status</span>
                  <span style={{
                    backgroundColor: course.status === 'published' ? '#ecfdf5' : '#fff7ed',
                    color: course.status === 'published' ? '#059669' : '#d97706',
                    textTransform: 'capitalize'
                  }}>
                    {course.status}
                  </span>
                </p>
              </div>

              <Link className={styles.editButton} href={`/admin/courses/${course._id}`}>
                View Course Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
