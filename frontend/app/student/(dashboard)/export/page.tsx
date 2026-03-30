'use client';

import React, { useState, useEffect } from 'react';
import styles from './export.module.css';
import {
    Download,
    FileText,
    Award,
    History,
    Clock,
    FileDown,
    ShieldCheck
} from 'lucide-react';
import { API_BASE_URL } from '@/app/utils/api';
import { exportToExcel, exportToPDF, exportToCSV, flattenData } from '@/app/utils/exportUtils';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';

export default function StudentExportPage() {
    const [loading, setLoading] = useState(false);
    const [selectedData, setSelectedData] = useState('performance');
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [results, setResults] = useState<any[]>([]);
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [downloadHistory, setDownloadHistory] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [uniqueCourses, setUniqueCourses] = useState<string[]>([]);

    useEffect(() => {
        const studentId = localStorage.getItem("student_id");
        if (!studentId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/student/all-results/${studentId}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results || []);
                    setStudentProfile(data.profile || null);
                    
                    // Extract unique course titles for dropdown
                    const courses = Array.from(new Set((data.results || []).map((r: any) => r.courseTitle))) as string[];
                    setUniqueCourses(courses);
                    if (courses.length > 0) setSelectedCourse(courses[0]);
                }
            } catch (err) {
                console.error("Failed to fetch student data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Force PDF for enrollment letters
    useEffect(() => {
        if (selectedData === 'enrollment') {
            setSelectedFormat('pdf');
        }
    }, [selectedData]);

    const handleExport = async () => {
        if (results.length === 0) {
            toast.warn("No test data available to export");
            return;
        }

        setLoading(true);
        try {
            const dateStr = new Date().toISOString().split('T')[0];
            let fileName = "";
            let title = "";
            
            if (selectedData === 'enrollment') {
                const approved = results.find(r => r.status === 'Approved' && r.courseTitle !== "Assessment");
                if (!approved) {
                    toast.error("No approved courses found for admission letter.");
                    setLoading(false);
                    return;
                }
                
                fileName = `Enrollment_Letter_${approved.courseTitle.replace(/\s+/g, '_')}_${dateStr}`;
                
                const doc = new jsPDF();
                doc.setFontSize(22);
                doc.setTextColor(140, 82, 255);
                doc.text("OFFICIAL ADMISSION LETTER", 105, 40, { align: 'center' });
                
                doc.setFontSize(12);
                doc.setTextColor(50);
                doc.text(new Date().toLocaleDateString(), 14, 60);
                
                doc.setFontSize(14);
                doc.text(`To: ${studentProfile?.firstName || "Student"} ${studentProfile?.lastName || ""}`, 14, 80);
                doc.text(`Ref: Course Enrollment for ${approved.courseTitle}`, 14, 90);
                
                doc.setFontSize(12);
                const letterContent = approved.enrollmentLetter || `Congratulations! You have been successfully enrolled in the ${approved.courseTitle} course based on your excellent performance in the AI-based evaluation.`;
                const splitText = doc.splitTextToSize(letterContent, 180);
                doc.text(splitText, 14, 110);
                
                doc.text("Best Regards,", 14, 220);
                doc.setFontSize(14);
                doc.text("SkillBridge AI Admissions Team", 14, 230);
                doc.save(`${fileName}.pdf`);
            } else {
                let filteredResults = results;
                let reportTypeLabel = "";

                if (selectedData === 'performance') {
                    fileName = `Academic_Summary_${dateStr}`;
                    title = "SkillBridge AI - Academic Performance Summary (Latest)";
                    reportTypeLabel = "LATEST";
                    
                    const seenCourses = new Set();
                    filteredResults = results.filter(r => {
                        if (seenCourses.has(r.courseTitle)) return false;
                        seenCourses.add(r.courseTitle);
                        return true;
                    });
                } else if (selectedData === 'history') {
                    fileName = `Full_Test_History_${dateStr}`;
                    title = "SkillBridge AI - Full Assessment History Log";
                    reportTypeLabel = "HISTORY";
                } else if (selectedData === 'course_report') {
                    fileName = `Test_Results_${selectedCourse.replace(/\s+/g, '_')}_${dateStr}`;
                    title = `SkillBridge AI - Assessment Report: ${selectedCourse}`;
                    reportTypeLabel = "COURSE SPECIFIC";
                    filteredResults = results.filter(r => r.courseTitle === selectedCourse);
                }

                const headers = ["Date", "Course", "Result Type", "MCQ Score", "Video Score", "Status"];

                const dataToExport = filteredResults.map(r => ({
                    date: r.timestamp ? new Date(r.timestamp).toLocaleDateString() : "-",
                    test: r.courseTitle,
                    type: reportTypeLabel,
                    mcq: r.score + "%",
                    video: typeof r.overallVideoScore === 'number' ? r.overallVideoScore.toFixed(2) : r.overallVideoScore || 0,
                    status: r.status
                }));

                if (selectedFormat === 'excel') {
                    exportToExcel(dataToExport, fileName);
                } else if (selectedFormat === 'csv') {
                    exportToCSV(dataToExport, fileName);
                } else if (selectedFormat === 'pdf') {
                    const pdfRows = dataToExport.map(r => [r.date, r.test, r.type, r.mcq, r.video, r.status]);
                    exportToPDF(headers, pdfRows, title, fileName);
                }
            }

            const newEntry = {
                name: fileName,
                format: selectedFormat,
                timestamp: new Date().toLocaleTimeString(),
                type: selectedData === 'enrollment' ? 'Admission Letter' : 
                      selectedData === 'performance' ? 'Academic Summary' : 
                      selectedData === 'history' ? 'Test History' : 'Course Report'
            };
            setDownloadHistory(prev => [newEntry, ...prev].slice(0, 5));
            toast.success("Document downloaded!");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate document.");
        } finally {
            setLoading(false);
        }
    };

    const dataOptions = [
        { id: 'performance', label: 'My Performance Summary (Latest)', icon: <Award size={18} /> },
        { id: 'history', label: 'Detailed Test History (All attempts)', icon: <History size={18} /> },
        { id: 'course_report', label: 'My Test Results (Particular Course)', icon: <FileDown size={18} /> },
        { id: 'enrollment', label: 'Official Admission Letter', icon: <FileText size={18} /> }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Student Export Center</h1>
                <p>Download your official academic records and performance metrics.</p>
            </div>

            <div className={styles.exportBox}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>1. Select Data to Export</label>
                    <select
                        className={styles.select}
                        value={selectedData}
                        onChange={(e) => setSelectedData(e.target.value)}
                    >
                        {dataOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {selectedData === 'course_report' && (
                    <div className={styles.formGroup} style={{ animation: 'fadeIn 0.3s ease' }}>
                        <label className={styles.label}>Select Course</label>
                        <select
                            className={styles.select}
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                        >
                            {uniqueCourses.map(course => (
                                <option key={course} value={course}>{course}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className={styles.formGroup}>
                    <label className={styles.label}>2. Select File Format</label>
                    <select
                        className={styles.select}
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                        disabled={selectedData === 'enrollment'}
                    >
                        <option value="pdf">PDF Document (.pdf) {selectedData === 'enrollment' ? '(Required)' : ''}</option>
                        <option value="excel">Excel Spreadsheet (.xlsx)</option>
                        <option value="csv">Comma Separated Values (.csv)</option>
                    </select>
                </div>

                <button
                    className={styles.downloadBtn}
                    onClick={handleExport}
                    disabled={loading || results.length === 0}
                >
                    {loading ? (
                        <div className={styles.loadingSpinner}></div>
                    ) : (
                        <>
                            <Download size={22} />
                            Download My Record
                        </>
                    )}
                </button>

                {downloadHistory.length > 0 && (
                    <div className={styles.historySection}>
                        <div className={styles.historyTitle}>
                            <Clock size={18} />
                            Recently Downloaded Files
                        </div>
                        <div className={styles.historyList}>
                            {downloadHistory.map((item, idx) => (
                                <div key={idx} className={styles.historyItem}>
                                    <div className={styles.fileName}>
                                        <FileDown size={20} color={item.format === 'pdf' ? '#8c52ff' : '#22c55e'} />
                                        <div>
                                            {item.name}
                                            <span className={styles.fileMeta}>{item.type} • {item.timestamp}</span>
                                        </div>
                                    </div>
                                    <span className={`${styles.formatBadge} ${styles[`badge-${item.format}`]}`}>
                                        {item.format}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f5f3ff', borderRadius: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid #ddd6fe' }}>
                <ShieldCheck size={24} color="#8c52ff" />
                <p style={{ fontSize: '0.875rem', color: '#5b21b6', fontWeight: '500' }}>
                    All exported documents are verified digital copies of your records as of {new Date().toLocaleDateString()}.
                </p>
            </div>
        </div>
    );
}
