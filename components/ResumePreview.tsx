"use client";

import React from 'react';

interface ResumePreviewProps {
  resumeText: string;
  template: 'Modern' | 'Minimal';
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ resumeText, template }) => {
  if (!resumeText) return null;

  // Split sections by double newline (\n\n)
  const sections = resumeText.split(/\n\s*\n/).filter(s => s.trim().length > 0);

  const styles = {
    Modern: {
      container: 'bg-white p-12 shadow-2xl border-t-8 border-blue-600 min-h-[1120px] print:p-0 print:shadow-none print:border-none',
      header: 'text-center mb-10 border-b border-gray-100 pb-8',
      name: 'text-4xl font-black text-gray-900 mb-2 uppercase tracking-tight',
      subtitle: 'text-lg font-bold text-blue-600 mb-3',
      contact: 'flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-500 font-medium',
      section: 'mb-8',
      title: 'text-sm font-black uppercase tracking-[0.2em] text-blue-700 mb-4 border-b border-blue-100 pb-2 flex items-center gap-3',
      content: 'text-[14px] text-gray-800 leading-relaxed font-inter space-y-1.5',
      bullet: 'relative pl-5 before:content-["•"] before:absolute before:left-0 before:text-blue-600 before:font-bold'
    },
    Minimal: {
      container: 'bg-white p-10 shadow-lg border border-gray-100 min-h-[1120px] print:p-0 print:shadow-none print:border-none',
      header: 'text-left mb-8 border-b-2 border-gray-900 pb-6',
      name: 'text-3xl font-bold text-gray-900 mb-1 tracking-tight',
      subtitle: 'font-semibold text-gray-700 mb-2',
      contact: 'text-sm text-gray-500 flex flex-wrap gap-x-3',
      section: 'mb-7',
      title: 'text-xs font-bold uppercase tracking-[0.3em] text-gray-900 mb-4 border-b border-gray-200 pb-1',
      content: 'text-[13px] text-gray-700 leading-snug font-inter space-y-1',
      bullet: 'relative pl-4 before:content-["-"] before:absolute before:left-0 before:text-gray-400'
    }
  }[template];

  return (
    <div 
      id="resume-to-export" 
      className={`w-full max-w-[850px] mx-auto overflow-hidden ${styles.container} transition-all duration-300 font-inter`}
      style={{ boxSizing: 'border-box' }}
    >
      {sections.map((section, sIdx) => {
        const lines = section.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return null;

        // The first line of every section is usually the TITLE
        const titleLine = lines[0].trim();
        const contentLines = lines.slice(1);

        // Special handling for the Header Section (Section 0)
        if (sIdx === 0) {
          const name = titleLine;
          // Look for role in line 2
          const possibleRole = contentLines[0] || '';
          const contactInfo = contentLines.slice(1);

          return (
            <div key={sIdx} className={styles.header}>
              <h1 className={styles.name}>{name}</h1>
              {possibleRole && <div className={styles.subtitle}>{possibleRole}</div>}
              <div className={styles.contact}>
                 {contactInfo.map((info, idx) => (
                   <span key={idx} className="whitespace-nowrap">
                     {idx > 0 && template === 'Modern' && <span className="mx-2 text-gray-300 opacity-50">|</span>}
                     {info.trim()}
                   </span>
                 ))}
              </div>
            </div>
          );
        }

        return (
          <div key={sIdx} className={styles.section}>
            <h2 className={styles.title}>
              {template === 'Modern' && <span className="w-1.5 h-4 bg-blue-600 rounded-full inline-block" />}
              {titleLine}
            </h2>
            <div className={styles.content}>
               {contentLines.map((line, lIdx) => {
                 const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*');
                 const text = isBullet ? line.trim().substring(1).trim() : line.trim();
                 
                 return (
                   <div key={lIdx} className={isBullet ? styles.bullet : ''}>
                     {text}
                   </div>
                 );
               })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ResumePreview;
