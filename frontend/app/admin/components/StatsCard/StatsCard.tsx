import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './StatsCard.module.css';

interface StatsCardProps {
    title: string;
    value: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, color = '#6366f1' }) => {
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <div>
                    <h3 className={styles.title}>{title}</h3>
                    <div className={styles.value}>{value}</div>
                </div>
                <div
                    className={styles.iconContainer}
                    style={{ background: `${color}15`, color: color }}
                >
                    <Icon size={24} />
                </div>
            </div>

            {trend && (
                <div className={styles.footer}>
                    <span className={`${styles.trend} ${trend.isPositive ? styles.positive : styles.negative}`}>
                        {trend.isPositive ? '+' : ''}{trend.value}
                    </span>
                    <span className={styles.period}>from last month</span>
                </div>
            )}
        </div>
    );
};

export default StatsCard;
