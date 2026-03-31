"use client";

import React, { useState } from 'react';
import { Download, FileText, Layout, Loader2 } from 'lucide-react';
import ATSScore from './ATSScore';
import ResumePreview from './ResumePreview';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';



interface ResumeSectionProps {
  resume: string;
  atsScore: number;
}

const ResumeSection: React.FC<ResumeSectionProps> = ({ resume, atsScore }) => {
  const [template, setTemplate] = useState<'Modern' | 'Minimal'>('Modern');
  const [isExporting, setIsExporting] = useState(false);

  // Requirement 6: Error Handling for empty resume
  if (!resume || resume.trim().length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-50/50 backdrop-blur-xl border-2 border-dashed border-slate-200 rounded-[2.5rem] w-full h-full min-h-[500px] text-center font-outfit">
        <div className="bg-white p-6 rounded-[2rem] shadow-xl mb-6 ring-8 ring-slate-100">
          <FileText className="w-12 h-12 text-blue-500 opacity-60" />
        </div>
        <h3 className="text-2xl font-black text-slate-800">No Resume Generated Yet</h3>
        <p className="text-slate-500 max-w-sm mt-3 text-lg font-medium leading-relaxed">
          Complete the smart chat session to unlock your professionally crafted resume and ATS score.
        </p>
      </div>
    );
  }

  // Requirement 3: PDF Export
  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = document.getElementById('resume-to-export');
      if (!element) return;

      const opt = {
        margin: 0,
        filename: `resume_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2.5, 
          useCORS: true, 
          letterRendering: true,
          logging: false
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF Export failed:", err);
    }
    setIsExporting(false);
  };

  // Requirement 4: DOCX Export
  const exportDOCX = async () => {
    setIsExporting(true);
    try {
      const sections = resume.split(/\n\s*\n/).filter(s => s.trim().length > 0);
      
      const docChildren = sections.map((section, sIdx) => {
        const lines = section.split('\n').filter(l => l.trim().length > 0);
        const title = lines[0].trim();
        const content = lines.slice(1);

        if (sIdx === 0) {
            // Header
            return [
                new Paragraph({
                    children: [new TextRun({ text: title, bold: true, size: 28, font: 'Inter' })],
                    spacing: { after: 200 },
                    alignment: AlignmentType.CENTER
                }),
                ...content.map(line => new Paragraph({
                    children: [new TextRun({ text: line, size: 20, font: 'Inter' })],
                    alignment: AlignmentType.CENTER
                })),
                new Paragraph({ spacing: { after: 400 } })
            ];
        }

        return [
          new Paragraph({
              children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 24, font: 'Inter' })],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 200 },
          }),
          ...content.map(line => {
              const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*');
              const text = isBullet ? line.trim().substring(1).trim() : line.trim();
              return new Paragraph({
                  children: [new TextRun({ text: text, size: 22, font: 'Inter' })],
                  bullet: isBullet ? { level: 0 } : undefined,
                  alignment: AlignmentType.LEFT,
                  spacing: { before: 80 }
              });
          })
        ];
      }).flat();

      const doc = new Document({
        sections: [{
          properties: {},
          children: docChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `resume_${new Date().toISOString().split('T')[0]}.docx`);
    } catch (err) {
      console.error("DOCX Export failed:", err);
    }
    setIsExporting(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative animate-in fade-in duration-700">
      {/* Requirement 7: Tool Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-2xl border-b border-slate-200/60 p-4 px-6 flex flex-wrap gap-4 items-center justify-between shadow-sm">
         <div className="flex items-center gap-3 bg-slate-100/80 p-1.5 rounded-2xl ring-1 ring-slate-200">
           <button 
             onClick={() => setTemplate('Modern')}
             className={`px-5 py-2 rounded-xl text-sm font-black flex items-center gap-2.5 transition-all ${template === 'Modern' ? 'bg-white text-blue-600 shadow-xl shadow-blue-100 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
           >
             <Layout className="w-4 h-4" />
             Modern
           </button>
           <button 
             onClick={() => setTemplate('Minimal')}
             className={`px-5 py-2 rounded-xl text-sm font-black flex items-center gap-2.5 transition-all ${template === 'Minimal' ? 'bg-white text-slate-900 shadow-xl shadow-slate-200 scale-105' : 'text-slate-500 hover:text-slate-800'}`}
           >
             <Layout className="w-4 h-4" />
             Minimal
           </button>
         </div>

         <div className="flex items-center gap-3">
           <button 
             onClick={exportDOCX}
             disabled={isExporting}
             className="flex items-center gap-2.5 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-slate-700 text-sm font-black hover:bg-slate-50 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
           >
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             DOCX
           </button>
           <button 
             onClick={exportPDF}
             disabled={isExporting}
             className="flex items-center gap-2.5 px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-black hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
           >
             {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
             PDF
           </button>
         </div>
      </div>

      {/* Requirement 7: Main Content Area */}
      <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-10 scrollbar-thin scrollbar-thumb-slate-200">
         <div className="max-w-[850px] mx-auto w-full">
            <ATSScore score={atsScore} />
         </div>

         <div className="flex-1 pb-20">
            <ResumePreview resumeText={resume} template={template} />
         </div>
      </div>
    </div>
  );
};

export default ResumeSection;
