import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
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


type CompetencyAssessmentRecordExport = {
  colleagueName: string;
  department: string;
  process: string;
  assessmentType: string;
  assessmentDate: string;
  assessor: string;
  teamLeader: string;
  competency: {
    safety: string;
    process: string;
    quality: string;
    operational: string;
    behavioural: string;
  };
  positiveObservations: string[];
  gapsIdentified: string[];
  developmentActions: string[];
  assessmentOutcome: string;
  nextAction: string;
  targetCompletionDate: string;
  assessmentSummary: string;
};

function tableBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
  };
}

function detailTable(rows: Array<[string, string]>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders(),
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: label, bold: true })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph(value || '-')],
            }),
          ],
        }),
    ),
  });
}

function bulletSection(items: string[], fallback: string) {
  const clean = items.map((item) => item.trim()).filter(Boolean);

  return clean.length
    ? clean.map(
        (item) =>
          new Paragraph({
            text: item,
            bullet: { level: 0 },
          }),
      )
    : [new Paragraph(fallback)];
}

export async function exportCompetencyAssessmentRecord(
  record: CompetencyAssessmentRecordExport,
) {
  const competencyRows: Array<[string, string]> = [
    ['Safety Competence', record.competency.safety],
    ['Process Competence', record.competency.process],
    ['Quality Competence', record.competency.quality],
    ['Operational Competence', record.competency.operational],
    ['Behavioural Competence', record.competency.behavioural],
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'COMPETENCY ASSESSMENT RECORD',
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Manufacturing Competency Assessment Record',
                size: 20,
              }),
            ],
          }),
          new Paragraph(''),
          new Paragraph({
            text: 'Assessment Details',
            heading: HeadingLevel.HEADING_2,
          }),
          detailTable([
            ['Colleague Name', record.colleagueName],
            ['Department', record.department],
            ['Process Assessed', record.process],
            ['Assessment Type', record.assessmentType],
            ['Assessment Date', record.assessmentDate],
            ['Assessor', record.assessor],
            ['Team Leader', record.teamLeader],
          ]),
          new Paragraph(''),
          new Paragraph({
            text: 'Competency Evaluation',
            heading: HeadingLevel.HEADING_2,
          }),
          detailTable(competencyRows),
          new Paragraph(''),
          new Paragraph({
            text: 'Positive Observations',
            heading: HeadingLevel.HEADING_2,
          }),
          ...bulletSection(
            record.positiveObservations,
            'No positive observations recorded.',
          ),
          new Paragraph({
            text: 'Gaps Identified',
            heading: HeadingLevel.HEADING_2,
          }),
          ...bulletSection(
            record.gapsIdentified,
            'No significant competency gaps identified.',
          ),
          new Paragraph({
            text: 'Development Actions Required',
            heading: HeadingLevel.HEADING_2,
          }),
          ...bulletSection(
            record.developmentActions,
            'No development actions required.',
          ),
          new Paragraph({
            text: 'Assessment Outcome & Next Steps',
            heading: HeadingLevel.HEADING_2,
          }),
          detailTable([
            ['Assessment Outcome', record.assessmentOutcome],
            ['Next Action', record.nextAction],
            ['Target Completion Date', record.targetCompletionDate || '-'],
          ]),
          new Paragraph(''),
          new Paragraph({
            text: 'Assessment Summary',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph(record.assessmentSummary),
          new Paragraph(''),
          new Paragraph({
            children: [
              new TextRun({ text: 'Assessor Signature: ', bold: true }),
              new TextRun('____________________________'),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date: ', bold: true }),
              new TextRun('____________________________'),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Competency_Assessment_Record_${record.colleagueName.replace(
    /\s+/g,
    '_',
  )}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
