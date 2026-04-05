'use client';

import React, { useState, useEffect } from 'react';
import styles from './export.module.css';
import { 
    Download, 
    FileText, 
    FileSpreadsheet, 
    Table, 
    ChevronDown, 
    Clock, 
    CheckCircle2,
    Database,
    FilePieChart
} from 'lucide-react';
import { API_BASE_URL } from '@/app/utils/api';
import { exportToExcel, exportToPDF, exportToCSV, flattenData } from '@/app/utils/exportUtils';
import { toast } from 'react-toastify';

export default function ExportPage() {
    const [loading, setLoading] = useState(false);
    const [selectedData, setSelectedData] = useState('students');
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [history, setHistory] = useState<any[]>([]);

    const handleExport = async () => {
        setLoading(true);
        try {
            let data: any[] = [];
            let fileName = '';
            let title = '';
            let headers: string[] = [];

            if (selectedData === 'students') {
                const res = await fetch(`${API_BASE_URL}/admin/students`, {
                    credentials: "include"
                });
                if (!res.ok) throw new Error("Failed to fetch students");
                data = await res.json();
                fileName = `Students_List_${new Date().toISOString().split('T')[0]}`;
                title = "SkillBridge AI - Student Master List";
                headers = ["Name", "Email", "MCQ Score", "Video Score", "Status"];
            } else if (selectedData === 'evaluations') {
                const res = await fetch(`${API_BASE_URL}/admin/all-evaluations`, {
                    credentials: "include"
                });
                if (!res.ok) throw new Error("Failed to fetch evaluations");
                data = await res.json();
                fileName = `Evaluation_Results_${new Date().toISOString().split('T')[0]}`;
                title = "SkillBridge AI - Detailed Evaluation Results";
                headers = ["Student Name", "Course", "MCQ", "Video", "Signal", "Status", "Timestamp"];
            }

            if (data.length === 0) {
                toast.warn("No data available to export");
                return;
            }

            // Export logic
            if (selectedFormat === 'excel') {
                exportToExcel(flattenData(data), fileName);
            } else if (selectedFormat === 'csv') {
                exportToCSV(flattenData(data), fileName);
            } else if (selectedFormat === 'pdf') {
                const pdfData = data.map(item => {
                    if (selectedData === 'students') {
                        return [item.name, item.email, item.mcqScore, item.videoScore, item.status];
                    } else {
                        return [
                            item.studentName, 
                            item.courseTitle, 
                            item.mcqScore, 
                            typeof item.videoScore === 'number' ? item.videoScore.toFixed(2) : item.videoScore,
                            item.eligibilitySignal,
                            item.status,
                            new Date(item.timestamp).toLocaleDateString()
                        ];
                    }
                });
                exportToPDF(headers, pdfData, title, fileName);
            }

            // Update history
            const newEntry = {
                name: fileName,
                format: selectedFormat,
                timestamp: new Date().toLocaleTimeString(),
                type: selectedData === 'students' ? 'Students List' : 'Evaluations'
            };
            setHistory(prev => [newEntry, ...prev].slice(0, 5));
            toast.success("Download started successfully");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("An error occurred during export.");
        } finally {
            setLoading(false);
        }
    };

    const dataOptions = [
        { id: 'students', label: 'Student Master List', icon: <Database size={18} /> },
        { id: 'evaluations', label: 'Evaluation Results Report', icon: <FilePieChart size={18} /> }
    ];

    const formatOptions = [
        { id: 'pdf', label: 'Portable Document Format (.pdf)', icon: <FileText size={18} /> },
        { id: 'excel', label: 'Excel Spreadsheet (.xlsx)', icon: <FileSpreadsheet size={18} /> },
        { id: 'csv', label: 'Comma Separated Values (.csv)', icon: <Table size={18} /> }
    ];

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Institution Data Export</h1>
                <p>Generate precise reports for institutional analysis and student tracking.</p>
            </div>

            <div className={styles.exportBox}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>1. Select Target Data</label>
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

                <div className={styles.formGroup}>
                    <label className={styles.label}>2. Select Export Format</label>
                    <select 
                        className={styles.select}
                        value={selectedFormat}
                        onChange={(e) => setSelectedFormat(e.target.value)}
                    >
                        {formatOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <button 
                    className={styles.downloadBtn}
                    onClick={handleExport}
                    disabled={loading}
                >
                    {loading ? (
                        <div className={styles.loadingSpinner}></div>
                    ) : (
                        <>
                            <Download size={22} />
                            Generate & Download Export
                        </>
                    )}
                </button>

                {history.length > 0 && (
                    <div className={styles.historySection}>
                        <div className={styles.historyTitle}>
                            <Clock size={18} />
                            Recently Exported Data
                        </div>
                        <div className={styles.historyList}>
                            {history.map((item, idx) => (
                                <div key={idx} className={styles.historyItem}>
                                    <div className={styles.fileName}>
                                        {item.format === 'pdf' ? <FileText size={20} color="#ef4444" /> : item.format === 'excel' ? <FileSpreadsheet size={20} color="#22c55e" /> : <Table size={20} color="#ca8a04" />}
                                        <div>
                                            {item.name}
                                            <span className={styles.fileMeta}>{item.type} Report • {item.timestamp}</span>
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
            
            <div className={styles.footer}>
                <div className={styles.footerItem}>
                    <CheckCircle2 size={18} color="#10b981" />
                    Encrypted Transfer
                </div>
                <div className={styles.footerItem}>
                    <CheckCircle2 size={18} color="#10b981" />
                    Policy Compliant
                </div>
                <div className={styles.footerItem}>
                    <CheckCircle2 size={18} color="#10b981" />
                    Audited Logs
                </div>
            </div>
        </div>
    );
}
