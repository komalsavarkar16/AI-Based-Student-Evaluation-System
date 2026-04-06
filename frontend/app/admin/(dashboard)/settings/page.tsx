'use client';

import React, { useState, useEffect } from 'react';
import styles from './settings.module.css';
import {
    Settings as SettingsIcon,
    Equalizer,
    Save,
} from '@mui/icons-material';

import { toast } from 'react-toastify';
import { API_BASE_URL, authenticatedFetch } from "@/app/utils/api";

export default function SettingsPage() {
    // Combined settings state
    const [settings, setSettings] = useState({
        mcqCount: 20,
        videoCount: 5,
        timeLimit: 60,
        mcqWeightage: 40,
        videoWeightage: 60,
        passingScore: 50,
        instituteName: "",
        instituteAddress: "",
        instituteWebsite: "",
        instituteEmail: "",
        signatureText: "",
        instituteLogo: "",
    });


    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/settings`);
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            } else {
                toast.error("Failed to load system settings");
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast.error("An error occurred while loading settings");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await authenticatedFetch(`${API_BASE_URL}/admin/settings`, {
                method: "POST",
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                toast.success("System settings updated successfully!");
            } else {
                const errorData = await response.json();
                toast.error(errorData.detail || "Failed to update settings");
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("An error occurred while saving settings");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.settingsContainer}>
                <div className={styles.header}>
                    <h1 className={styles.title}>System Settings</h1>
                    <p className={styles.subtitle}>Loading configuration...</p>
                </div>
            </div>
        );
    }


    return (
        <div className={styles.settingsContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>System Settings</h1>
                <p className={styles.subtitle}>Configure AI testing and evaluation criteria.</p>
            </div>

            {/* 1. AI Test Configuration */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>AI Test Configuration</h2>
                </div>
                <div className={styles.grid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Number of MCQ Questions</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={settings.mcqCount}
                            onChange={(e) => setSettings({ ...settings, mcqCount: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Number of Video Questions</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={settings.videoCount}
                            onChange={(e) => setSettings({ ...settings, videoCount: parseInt(e.target.value) })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Test Time Limit (Minutes)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={settings.timeLimit}
                            onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) })}
                        />
                    </div>
                </div>
            </section>

            {/* 2. Evaluation Criteria */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <Equalizer />
                    </div>
                    <h2 className={styles.sectionTitle}>Evaluation Criteria</h2>
                </div>
                <div className={styles.grid}>
                    <div className={styles.weightageControl}>
                        <div className={styles.weightageLabel}>
                            <span>MCQ Weightage</span>
                            <span>{settings.mcqWeightage}%</span>
                        </div>
                        <input
                            type="range"
                            className={styles.rangeInput}
                            min="0"
                            max="100"
                            value={settings.mcqWeightage}
                            onChange={(e) => {
                                const mcq = parseInt(e.target.value);
                                setSettings({ ...settings, mcqWeightage: mcq, videoWeightage: 100 - mcq });
                            }}
                        />
                    </div>
                    <div className={styles.weightageControl}>
                        <div className={styles.weightageLabel}>
                            <span>Video Weightage</span>
                            <span>{settings.videoWeightage}%</span>
                        </div>
                        <input
                            type="range"
                            className={styles.rangeInput}
                            min="0"
                            max="100"
                            value={settings.videoWeightage}
                            onChange={(e) => {
                                const video = parseInt(e.target.value);
                                setSettings({ ...settings, videoWeightage: video, mcqWeightage: 100 - video });
                            }}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Minimum Passing Score (%)</label>
                        <input
                            type="number"
                            className={styles.input}
                            value={settings.passingScore}
                            onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) })}
                        />
                    </div>
                </div>
            </section>
            {/* 3. Institute Profile & Letterhead */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div className={styles.sectionIcon}>
                        <SettingsIcon />
                    </div>
                    <h2 className={styles.sectionTitle}>Institute Profile & Letterhead</h2>
                </div>
                <div className={styles.grid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Institute Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g. SkillBridge AI Academy"
                            value={settings.instituteName}
                            onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Institute Address</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Full Address"
                            value={settings.instituteAddress}
                            onChange={(e) => setSettings({ ...settings, instituteAddress: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Official Website</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="www.institute.com"
                            value={settings.instituteWebsite}
                            onChange={(e) => setSettings({ ...settings, instituteWebsite: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Official Email</label>
                        <input
                            type="email"
                            className={styles.input}
                            placeholder="admissions@institute.com"
                            value={settings.instituteEmail}
                            onChange={(e) => setSettings({ ...settings, instituteEmail: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Signature Text</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="e.g. Director of Admissions"
                            value={settings.signatureText}
                            onChange={(e) => setSettings({ ...settings, signatureText: e.target.value })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Institute Logo URL (Optional)</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="https://link-to-logo.png"
                            value={settings.instituteLogo}
                            onChange={(e) => setSettings({ ...settings, instituteLogo: e.target.value })}
                        />
                    </div>
                </div>
            </section>
            <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={isSaving}
            >
                <Save style={{ marginRight: '8px' }} />
                {isSaving ? 'Saving...' : 'Save System Settings'}
            </button>
        </div>
    );
}
