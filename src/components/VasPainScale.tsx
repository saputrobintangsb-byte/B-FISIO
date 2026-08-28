import React from 'react';

interface VasPainScaleProps {
  value: number; // 0 - 10
  onChange: (value: number) => void;
  label?: string;
  className?: string;
  showDetails?: boolean;
}

export interface VasInterpretation {
  score: number;
  level: string;
  category: 'Tidak Nyeri' | 'Nyeri Ringan' | 'Nyeri Sedang' | 'Nyeri Berat' | 'Nyeri Sangat Berat / Tak Tertahankan';
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  emoji: string;
  clinicalDescription: string;
}

export function getVasInterpretation(score: number): VasInterpretation {
  const num = Math.min(10, Math.max(0, Math.round(score)));

  if (num === 0) {
    return {
      score: 0,
      level: 'Skala 0 / 10',
      category: 'Tidak Nyeri',
      color: '#10B981', // emerald
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      emoji: '😊',
      clinicalDescription: 'Bebas rasa nyeri, tidak ada keluhan rasa sakit sama sekali.',
    };
  } else if (num >= 1 && num <= 3) {
    return {
      score: num,
      level: `Skala ${num} / 10`,
      category: 'Nyeri Ringan',
      color: '#3B82F6', // blue
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-700 dark:text-blue-300',
      emoji: '🙂',
      clinicalDescription: 'Rasa nyeri ringan, sedikit mengganggu namun aktivitas harian tidak terganggu.',
    };
  } else if (num >= 4 && num <= 6) {
    return {
      score: num,
      level: `Skala ${num} / 10`,
      category: 'Nyeri Sedang',
      color: '#F59E0B', // amber
      bgColor: 'bg-amber-50 dark:bg-amber-950/40',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-700 dark:text-amber-300',
      emoji: '😐',
      clinicalDescription: 'Nyeri cukup terasa, mulai mengganggu konsentrasi dan aktivitas fungsional fisik.',
    };
  } else if (num >= 7 && num <= 9) {
    return {
      score: num,
      level: `Skala ${num} / 10`,
      category: 'Nyeri Berat',
      color: '#F97316', // orange/rose
      bgColor: 'bg-orange-50 dark:bg-orange-950/40',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-700 dark:text-orange-300',
      emoji: '😣',
      clinicalDescription: 'Nyeri berat terkontrol, sangat membatasi gerakan dan aktivitas sehari-hari.',
    };
  } else {
    return {
      score: 10,
      level: 'Skala 10 / 10',
      category: 'Nyeri Sangat Berat / Tak Tertahankan',
      color: '#EF4444', // red
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200 dark:border-rose-800',
      textColor: 'text-rose-700 dark:text-rose-300',
      emoji: '😫',
      clinicalDescription: 'Nyeri luar biasa / tak tertahankan, pasien tidak mampu melakukan gerakan mandiri.',
    };
  }
}

export const VasPainScale: React.FC<VasPainScaleProps> = ({
  value = 0,
  onChange,
  label = 'Pemeriksaan Derajat Nyeri (VAS - Visual Analog Scale)',
  className = '',
  showDetails = true,
}) => {
  const interp = getVasInterpretation(value);

  return (
    <div className={`p-4 rounded-xl border ${interp.borderColor} ${interp.bgColor} space-y-3 transition-colors ${className}`}>
      {/* Header & Score Badge */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            {label}
          </label>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Geser tuas skala 0 (tanpa nyeri) s.d. 10 (nyeri hebat tak tertahankan)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xl select-none">{interp.emoji}</span>
          <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs text-right">
            <div className="text-xs font-extrabold font-mono text-slate-900 dark:text-white">
              VAS: {value} <span className="text-[10px] font-normal text-slate-400">/ 10</span>
            </div>
            <div className={`text-[10px] font-bold ${interp.textColor}`}>
              {interp.category}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Slider Input */}
      <div className="space-y-1.5 pt-1">
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {/* 0 to 10 Numbers Ruler */}
        <div className="flex justify-between px-1 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
                value === num
                  ? 'bg-blue-600 text-white font-bold'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Clinical Interpretation Description */}
      {showDetails && (
        <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-[11px] flex items-start gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">
            Interpretasi Klinis:
          </span>
          <span className="text-slate-600 dark:text-slate-400 leading-snug">
            {interp.clinicalDescription}
          </span>
        </div>
      )}
    </div>
  );
};
