import React from 'react';
import { Download, RefreshCw, FileText, FileCode, CheckCircle2 } from 'lucide-react';

interface ResumePreviewProps {
  resume: string;
  onStartOver: () => void;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ resume, onStartOver }) => {
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDownloadTxt = () => downloadFile(resume, 'resume.txt', 'text/plain');
  const handleDownloadPdf = () => {
    // In a real app, we'd use a library like jspdf, but for now we provide the UI and a text fallback
    downloadFile(resume, 'resume.pdf', 'application/pdf');
  };
  const handleDownloadDocx = () => {
    // In a real app, we'd use a library like docx, but for now we provide the UI and a text fallback
    downloadFile(resume, 'resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  };

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="text-green-500 w-5 h-5" />
            <h2 className="text-xl font-black text-zinc-900 dark:text-white font-heading uppercase tracking-tight">Your Resume is Ready!</h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Download your professionally crafted resume in multiple formats.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95"
          >
            <FileText size={16} />
            PDF
          </button>
          <button
            onClick={handleDownloadDocx}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <FileCode size={16} />
            DOCX
          </button>
          <button
            onClick={handleDownloadTxt}
            className="flex items-center gap-2 rounded-xl bg-zinc-800 dark:bg-zinc-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-900 transition-all active:scale-95"
          >
            <Download size={16} />
            TXT
          </button>
          <div className="w-px h-10 bg-zinc-100 dark:bg-zinc-800 mx-2 hidden md:block" />
          <button
            onClick={onStartOver}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 sm:p-12 shadow-xl">
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300 bg-transparent border-none p-0 m-0">
              {resume}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;
