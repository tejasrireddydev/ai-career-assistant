"use client";

import React, { useState } from "react";
import { Download, FileText, CheckCircle, Percent, Loader2 } from "lucide-react";

interface ResumeSectionProps {
  resume: string;
  atsScore: number;
  suggestedRoles?: string[];
  recommendedCourses?: string[];
}

export default function ResumeSection({ 
  resume, 
  atsScore,
  suggestedRoles = [],
  recommendedCourses = []
}: ResumeSectionProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const originalElement = document.getElementById('resume-to-render');
      if (!originalElement) return;

      // v6.6 TRUE-RENDER: Isolated Iframe Strategy
      const iframe = document.createElement('iframe');
      iframe.style.visibility = 'hidden';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '800px';
      iframe.style.height = '1100px';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) return;

      const htmlContent = originalElement.innerHTML;
      doc.open();
      // Inject 100% Clean CSS for the Iframe
      doc.write(`
        <html>
          <head>
            <style>
              body { margin: 0; padding: 60px; font-family: 'Arial', sans-serif; background: #ffffff; color: #18181b; }
              h1 { font-size: 24pt; font-weight: 900; text-align: center; margin-bottom: 20pt; border-bottom: 2pt solid #18181b; padding-bottom: 5pt; text-transform: uppercase; }
              h2 { font-size: 13pt; font-weight: 900; color: #2563eb; margin-top: 25pt; margin-bottom: 10pt; border-bottom: 1pt solid #dbeafe; padding-bottom: 3pt; text-transform: uppercase; letter-spacing: 1pt; }
              p { font-size: 11pt; color: #3f3f46; margin-bottom: 8pt; line-height: 1.5; font-weight: 500; }
              li { font-size: 11pt; color: #3f3f46; margin-bottom: 6pt; line-height: 1.5; font-weight: 500; margin-left: 20pt; }
              strong { font-weight: 900; color: #18181b; text-transform: uppercase; margin-right: 5pt; }
              * { box-sizing: border-box; }
            </style>
          </head>
          <body>
            ${htmlContent}
          </body>
        </html>
      `);
      doc.close();

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `resume_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg' as const, quality: 1 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      // Wait a frame for the iframe content to settle
      await new Promise(r => setTimeout(r, 100));
      await html2pdf().set(opt).from(doc.body).save();
      document.body.removeChild(iframe);
    } catch (err) {
      console.error("PDF Export failed:", err);
    }
    setIsExporting(false);
  };

  if (!resume || resume.trim().length < 20) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-zinc-100 shadow-sm relative">
           <FileText className="w-10 h-10 text-zinc-300" />
           <div className="absolute top-0 right-0 w-3 h-3 bg-zinc-200 rounded-full animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-3 font-outfit">Document Preview Ready</h2>
        <p className="text-zinc-500 text-sm max-w-xs leading-relaxed font-outfit">Your professionally crafted resume will appear here once the generation is complete.</p>
      </div>
    );
  }

  // --- v6.1 COLOR SAFETY NORMALIZATION ---
  const normalizedResume = resume.replace(/\\n/g, "\n");
  const rawLines = normalizedResume.split("\n");
  
  const isHeading = (line: string) => line === line.toUpperCase() && line.trim().length > 3;
  const isBullet = (line: string) => line.trim().startsWith("-");

  const COLORS = {
    BLUE_HEADER: "#2563eb",
    EMERALD_ACCENT: "#059669",
    TEXT_DARK: "#18181b",
    TEXT_GRAY: "#3f3f46",
    BORDER: "#e4e4e7"
  };

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-700 font-outfit">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-zinc-100 px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-100" style={{ backgroundColor: '#f0fdf4', color: COLORS.EMERALD_ACCENT }}>
             <CheckCircle className="w-3.5 h-3.5" />
             <span className="text-[10px] font-black uppercase tracking-widest leading-none">ColorSafe_v6.1</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
             <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">ATS Compatibility</span>
             <span className="text-base font-black flex items-center gap-1" style={{ color: COLORS.EMERALD_ACCENT }}>
                {atsScore} <Percent className="w-3.5 h-3.5" />
             </span>
          </div>
          <button 
            onClick={exportPDF} 
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all active:scale-95 shadow-lg shadow-zinc-200 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 bg-zinc-50 p-8 sm:p-12 overflow-y-auto no-scrollbar">
        <div 
          id="resume-to-render"
          className="max-w-[800px] mx-auto bg-white shadow-2xl shadow-zinc-200 min-h-[1100px] p-12 sm:p-16 border border-zinc-100 rounded-sm"
          style={{ backgroundColor: '#ffffff', color: COLORS.TEXT_DARK }}
        >
          {rawLines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} className="h-4" />;

            // Name / First Line (FIX 3)
            if (i === 0) {
              return (
                <h1 key={i} className="text-3xl font-black text-center mb-8 tracking-tight uppercase border-b-2 pb-2" style={{ color: COLORS.TEXT_DARK, borderBottomColor: COLORS.TEXT_DARK }}>
                  {trimmed}
                </h1>
              );
            }

            // Headings (FIX 2)
            if (isHeading(trimmed)) {
              return (
                <h2 key={i} className="text-sm font-black mt-8 mb-3 uppercase tracking-[0.2em] border-b pb-1" style={{ color: COLORS.BLUE_HEADER, borderBottomColor: '#dbeafe' }}>
                  {trimmed}
                </h2>
              );
            }

            // Bullets (FIX 3)
            if (isBullet(trimmed)) {
              return (
                <li key={i} className="ml-5 text-[13px] mb-2 list-disc leading-relaxed pl-2 font-medium" style={{ color: COLORS.TEXT_GRAY }}>
                  {trimmed.replace(/^-/, "").trim()}
                </li>
              );
            }

            // KEY-VALUE BOLDING (e.g., Skills: Java)
            const parts = trimmed.split(':');
            if (parts.length > 1 && parts[0].length < 30) {
              return (
                <p key={i} className="text-[13px] mb-2 leading-relaxed" style={{ color: COLORS.TEXT_GRAY }}>
                   <strong className="font-bold uppercase tracking-wide mr-1" style={{ color: COLORS.TEXT_DARK }}>{parts[0]}:</strong>{parts.slice(1).join(':')}
                </p>
              );
            }

            // Standard Text
            return (
              <p key={i} className="text-[13px] mb-2 leading-relaxed font-medium" style={{ color: COLORS.TEXT_GRAY }}>
                {trimmed}
              </p>
            );
          })}
        </div>

      </div>
    </div>
  );
}
