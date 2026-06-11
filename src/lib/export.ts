import { Packer, Paragraph, Document, HeadingLevel } from 'docx';
import { jsPDF } from 'jspdf';

export async function exportWordReport(title: string, lines: string[]) {
  const doc = new Document({
    sections: [{ properties: {}, children: [
      new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
      ...lines.map((line) => new Paragraph(line)),
    ] }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPdfReport(title: string, lines: string[]) {
  const pdf = new jsPDF();
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 14, 16);
  pdf.setFont('helvetica', 'normal');
  lines.forEach((line, index) => pdf.text(line, 14, 28 + index * 8));
  pdf.save(`${title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
