import React from 'react';

interface PityGaugeProps {
  title: string;
  current: number;
  max: number;
  softPity: number;
  winRateText: string;
  colorClass: string;
}

export function PityGauge({ title, current, max, softPity, winRateText, colorClass }: PityGaugeProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const strokeDasharray = 251.2; // 2 * pi * r (r=40)
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* Top Part: The Circle and the Numbers */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
          <circle 
            cx="50" cy="50" r="40" 
            className={`stroke-current ${colorClass} transition-all duration-1000 ease-out`} 
            strokeWidth="8" fill="transparent" 
            strokeDasharray={strokeDasharray} 
            strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-5xl font-bold text-slate-100">{current}</span>
          <span className="text-xs text-slate-400 mt-1">of {max} pulls</span>
        </div>
      </div>

      {/* Bottom Part: The Banner Info (Safely outside the circle) */}
      <div className="mt-6 flex flex-col items-center gap-1 text-center">
        <span className="font-bold text-slate-200 text-lg">{title}</span>
        <span className="text-sm text-slate-400">Soft pity at {softPity}</span>
        <span className="text-sm text-slate-500">{winRateText}</span>
      </div>
    </div>
  );
}