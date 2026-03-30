import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

/**
 * Export data to Excel format (.xlsx)
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 */
export const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    
    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    saveAs(dataBlob, `${fileName}.xlsx`);
};

/**
 * Export data to CSV format (.csv)
 * @param data Array of objects to export
 * @param fileName Name of the file (without extension)
 */
export const exportToCSV = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    
    const dataBlob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8' });
    saveAs(dataBlob, `${fileName}.csv`);
};

/**
 * Export data to PDF format (.pdf)
 * @param headers Array of strings for table headers
 * @param data Array of arrays for table rows (must match headers order)
 * @param title Title to display at the top of the PDF
 * @param fileName Name of the file (without extension)
 */
export const exportToPDF = (headers: string[], data: any[][], title: string, fileName: string) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Add timestamp
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    // Add table
    autoTable(doc, {
        head: [headers],
        body: data,
        startY: 35,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] }, // Indigo color
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { top: 35 },
    });
    
    doc.save(`${fileName}.pdf`);
};

/**
 * Helper to flatten objects for Excel/CSV export if they have nested structures
 */
export const flattenData = (data: any[]) => {
    return data.map(item => {
        const flattened: any = {};
        
        Object.keys(item).forEach(key => {
            if (typeof item[key] === 'object' && item[key] !== null) {
                if (Array.isArray(item[key])) {
                    flattened[key] = item[key].join(', ');
                } else {
                    // For nested objects like { scores: { mcq: 80 } } -> scores_mcq: 80
                    Object.keys(item[key]).forEach(subKey => {
                        flattened[`${key}_${subKey}`] = item[key][subKey];
                    });
                }
            } else {
                flattened[key] = item[key];
            }
        });
        
        return flattened;
    });
};
