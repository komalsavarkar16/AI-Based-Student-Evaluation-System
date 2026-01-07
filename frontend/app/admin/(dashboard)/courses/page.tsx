"use client";

import styles from "./courses.module.css";
import { useState, useEffect } from "react";
import { Course } from "../../../types/course";

import Link from "next/link";

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/courses");
      const data = await res.json();
      setCourses(data);
    } catch (err) {
      console.error("Failed to load courses", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading courses...</p>;

  return (
    <div className={styles.mainContainer}>
      <div className={styles.headerContainer}>
        <h1 className={styles.courseHeading}>Courses Management</h1>
        <Link href="/admin/courses/add">
          <button className={styles.addCourseButton}>Add Course</button>
        </Link>
      </div>
      {courses.length === 0 ? (
        <p>No course available</p>
      ) : (
        <div className={styles.coursesContainer}>
          {courses.map((course) => (
            <div key={course._id} className={styles.courseCard}>
              <h2 className={styles.courseTitle}>{course.title}</h2>
              <p className={styles.category}>
                Category: <span>{course.category}</span>
              </p>
              <p className={styles.level}>
                Level: <span>{course.level}</span>
              </p>
              <p className={styles.status}>
                Status: <span>{course.status}</span>
              </p>
              <Link className={styles.editButton} href={`/admin/courses/${course._id}`}>View Course</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
