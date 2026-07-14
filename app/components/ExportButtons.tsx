'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface ExportButtonsProps {
  type: 'logements' | 'collaborateurs';
  data: any[];
  columns: { key: string; label: string }[];
  filename: string;
}

export default function ExportButtons({ type, data, columns, filename }: ExportButtonsProps) {
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null);

  // Export Excel
  const exportExcel = async () => {
    setLoading('excel');
    try {
      const formattedData = data.map((item) => {
        const row: any = {};
        columns.forEach((col) => {
          let value = item[col.key];
          // Formater les dates
          if (value && (col.key.includes('date') || col.key.includes('Date'))) {
            value = new Date(value).toLocaleDateString('fr-FR');
          }
          row[col.label] = value || '';
        });
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Données');
      
      // Ajuster la largeur des colonnes
      const colWidths = columns.map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toLocaleDateString('fr-FR')}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Erreur export Excel:', error);
      alert('Erreur lors de l\'export Excel');
    } finally {
      setLoading(null);
    }
  };

  // Export PDF
  const exportPDF = async () => {
    setLoading('pdf');
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = height - 50;
      const fontSize = 10;
      const lineHeight = 16;

      // Titre
      const title = type === 'logements' ? 'Liste des logements' : 'Liste des collaborateurs';
      page.drawText(title, {
        x: 50,
        y: y,
        size: 16,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.6),
      });
      y -= 30;

      // Date d'export
      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      page.drawText(`Exporté le ${dateStr}`, {
        x: 50,
        y: y,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 25;

      // En-têtes
      const colWidth = (width - 100) / columns.length;
      let x = 50;

      // Fond gris pour les en-têtes
      page.drawRectangle({
        x: 50,
        y: y - 2,
        width: width - 100,
        height: lineHeight + 4,
        color: rgb(0.9, 0.9, 0.9),
      });

      columns.forEach((col, index) => {
        page.drawText(col.label, {
          x: x + 4,
          y: y,
          size: fontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        x += colWidth;
      });
      y -= lineHeight + 4;

      // Lignes de séparation
      page.drawLine({
        start: { x: 50, y: y + 2 },
        end: { x: width - 50, y: y + 2 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      // Données
      const maxRows = 25; // Nombre de lignes par page
      let rowCount = 0;
      const rows = [...data];

      for (const item of rows) {
        if (rowCount >= maxRows) {
          // Nouvelle page
          const newPage = pdfDoc.addPage([595.28, 841.89]);
          const newWidth = newPage.getSize().width;
          const newHeight = newPage.getSize().height;
          y = newHeight - 50;
          rowCount = 0;

          // Re-titre
          page.drawText(title, {
            x: 50,
            y: y,
            size: 16,
            font: fontBold,
            color: rgb(0.1, 0.2, 0.6),
          });
          y -= 30;

          // En-têtes
          let newX = 50;
          columns.forEach((col) => {
            page.drawText(col.label, {
              x: newX + 4,
              y: y,
              size: fontSize,
              font: fontBold,
              color: rgb(0, 0, 0),
            });
            newX += colWidth;
          });
          y -= lineHeight + 4;

          page.drawLine({
            start: { x: 50, y: y + 2 },
            end: { x: newWidth - 50, y: y + 2 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
          });
        }

        let currentX = 50;
        columns.forEach((col) => {
          let value = item[col.key];
          if (value && (col.key.includes('date') || col.key.includes('Date'))) {
            value = new Date(value).toLocaleDateString('fr-FR');
          }
          const text = String(value || '');
          // Tronquer si trop long
          const maxChars = Math.floor(colWidth / 6);
          const displayText = text.length > maxChars ? text.substring(0, maxChars - 3) + '...' : text;
          page.drawText(displayText, {
            x: currentX + 4,
            y: y,
            size: fontSize - 1,
            font,
            color: rgb(0, 0, 0),
          });
          currentX += colWidth;
        });

        y -= lineHeight;
        rowCount++;
      }

      // Pied de page
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toLocaleDateString('fr-FR')}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('Erreur lors de l\'export PDF');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportExcel}
        disabled={loading === 'excel'}
        className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm ${
          loading === 'excel' ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading === 'excel' ? (
          <span>⏳ Export...</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            📊 Excel
          </>
        )}
      </button>
      <button
        onClick={exportPDF}
        disabled={loading === 'pdf'}
        className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm ${
          loading === 'pdf' ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {loading === 'pdf' ? (
          <span>⏳ Export...</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            📄 PDF
          </>
        )}
      </button>
    </div>
  );
}
