'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import styles from './DataTable.module.css';

// MUI ICONS
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import CheckIcon from '@mui/icons-material/Check';

export interface Column<T> {
    id: string;
    label: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    searchKey?: keyof T | (keyof T)[];
    searchPlaceholder?: string;
    title?: string;
    onRowClick?: (row: T) => void;
    isLoading?: boolean;
    emptyMessage?: string;
    actions?: React.ReactNode; // Optional extra buttons next to Search
}

export function DataTable<T extends { id: string | number }>({
    data,
    columns,
    searchKey,
    searchPlaceholder = "Search...",
    title,
    onRowClick,
    isLoading = false,
    emptyMessage = "No records found.",
    actions
}: DataTableProps<T>) {
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.id));
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsColumnDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredData = useMemo(() => {
        if (!searchQuery) return data;
        
        return data.filter(item => {
            const query = searchQuery.toLowerCase();
            
            if (Array.isArray(searchKey)) {
                return searchKey.some(key => 
                    String(item[key] || '').toLowerCase().includes(query)
                );
            } else if (searchKey) {
                return String(item[searchKey] || '').toLowerCase().includes(query);
            }
            
            // Default: search all keys
            return Object.values(item).some(val => 
                String(val || '').toLowerCase().includes(query)
            );
        });
    }, [data, searchQuery, searchKey]);

    const toggleColumn = (columnId: string) => {
        setVisibleColumns(prev => 
            prev.includes(columnId) 
                ? prev.filter(id => id !== columnId) 
                : [...prev, columnId]
        );
    };

    if (isLoading) return <div className={styles.loading}>Loading data...</div>;

    return (
        <div className={styles.container}>
            {title && <h1 className={styles.title}>{title}</h1>}
            
            <div className={styles.actionBar}>
                <div className={styles.searchWrapper}>
                    <SearchIcon className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        className={styles.searchBar}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className={styles.controls}>
                    {actions}
                    <div className={styles.dropdownWrapper} ref={dropdownRef}>
                        <button 
                            className={styles.btnAction}
                            onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                        >
                            <ViewColumnIcon />
                            Columns
                        </button>
                        
                        {isColumnDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                <div className={styles.dropdownHeader}>Toggle Columns</div>
                                {columns.map(col => (
                                    <div 
                                        key={col.id} 
                                        className={styles.dropdownItem}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleColumn(col.id);
                                        }}
                                    >
                                        <div className={`${styles.checkbox} ${visibleColumns.includes(col.id) ? styles.checkboxChecked : ''}`}>
                                            {visibleColumns.includes(col.id) && <CheckIcon className={styles.checkIcon} />}
                                        </div>
                                        {col.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            {columns.map(col => visibleColumns.includes(col.id) && (
                                <th key={col.id}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((row) => (
                            <tr 
                                key={row.id} 
                                className={`${styles.row} ${onRowClick ? styles.clickable : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map(col => visibleColumns.includes(col.id) && (
                                    <td key={col.id}>
                                        {col.render ? col.render(row) : String((row as any)[col.id] || '-')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {filteredData.length === 0 && (
                    <div className={styles.emptyState}>
                        <h3>No records found</h3>
                        <p>{emptyMessage}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
