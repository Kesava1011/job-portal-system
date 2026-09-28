import React from 'react';

export default function StatCard({ title, value, icon: Icon, color = 'blue', description }) {
  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-100',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-100',
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
          {description && (
            <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color] || colorMap.blue}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
