import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface Bill {
  uid: string;
  username: string;
  chargerid: string;
  energyconsumption: string;
  chargingtime: string;
  taxableamount: string;
  gstamount: string;
  totalamount: string;
  lasttransaction: string;
  createdAt: string;
  full_address?: string;
  hubinfo?: { hubname: string };
  charger_type?: string;
}

export const generateBillPDF = async (bill: Bill): Promise<void> => {
  // Create a new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Helper to add text with optional centering
  const addText = (text: string, x: number, y: number, align?: 'left' | 'center' | 'right') => {
    doc.text(text, x, y, { align });
  };

  // --- Header: Logo (fetch as base64 to avoid cross-origin issues) ---
  try {
    const logoUrl = 'https://transev.in/assets/up-B0GM0qzi.png';
    const logoResponse = await fetch(logoUrl);
    const logoBlob = await logoResponse.blob();
    const reader = new FileReader();
    const logoBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(logoBlob);
    });
    doc.addImage(logoBase64, 'PNG', margin, 10, 50, 15);
  } catch (err) {
    console.warn('Logo not loaded, proceeding without image', err);
  }

  // Title
  doc.setFontSize(20);
  doc.setTextColor(0, 128, 128); // teal
  addText('Tax Invoice', pageWidth - margin, 20, 'right');

  // Bill title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  addText('Charging Session Bill', margin, 40, 'left');

  // Bill Info
  doc.setFontSize(10);
  addText(`Bill ID: ${bill.uid}`, margin, 50);
  addText(`Date: ${format(new Date(bill.createdAt), 'dd MMM yyyy HH:mm')}`, margin, 56);

  // Customer Details
  doc.setFontSize(12);
  addText('Customer Details', margin, 70);
  autoTable(doc, {
    startY: 75,
    body: [
      ['Customer Name', bill.username],
      ['Charger ID', bill.chargerid],
      ['Charger Type', bill.charger_type || 'N/A'],
      ['Hub', bill.hubinfo?.hubname || 'N/A'],
      ['Address', bill.full_address || 'Not provided'],
    ],
    theme: 'plain',
    styles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 100 } },
    margin: { left: margin },
  });

  // Bill Items Table
  const tableData = [
    ['Energy Consumed (kWh)', bill.energyconsumption],
    ['Charging Time', bill.chargingtime],
    ['Taxable Amount', `₹${bill.taxableamount}`],
    ['GST Amount', `₹${bill.gstamount}`],
    ['Total Amount', `₹${bill.totalamount}`],
  ];

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  autoTable(doc, {
    startY: finalY,
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 70 } },
    margin: { left: margin },
  });

  // Transaction ID
  doc.setFontSize(10);
  addText(`Transaction ID: ${bill.lasttransaction}`, margin, (doc as any).lastAutoTable.finalY + 10);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  addText('Thank you for choosing TransEV', pageWidth / 2, footerY, 'center');

  // Save the PDF
  doc.save(`bill_${bill.uid}.pdf`);
};