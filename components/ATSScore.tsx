"use client";

import React from 'react';

interface ATSScoreProps {
  score: number;
}

const ATSScore: React.FC<ATSScoreProps> = ({ score }) => {
  const getColor = (s: number) => {
    if (s < 60) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (s < 80) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getBarColor = (s: number) => {
    if (s < 60) return 'bg-rose-500';
    if (s < 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={`p-5 rounded-2xl border ${getColor(score)} transition-all duration-300 shadow-sm font-outfit`}>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold uppercase tracking-widest opacity-70">ATS Score Analysis</span>
        <span className="text-3xl font-black">{score}%</span>
      </div>
      <div className="w-full bg-black/5 h-3 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor(score)} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs mt-3 font-medium opacity-80 leading-relaxed">
        {score < 60 ? '⚠️ Low resume-job match. We recommend adding more specific keywords from your target role.' : 
         score < 80 ? '✨ Good match! Your resume has a high chance of passing the initial automated screening.' : 
         '🚀 Excellent match! This resume is fully optimized for top ATS systems.'}
      </p>
    </div>
  );
};

export default ATSScore;
