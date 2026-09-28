import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

export default function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;

  const styles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const icons = {
    info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
  };

  return (
    <div className={`flex items-start justify-between p-4 rounded-2xl border text-xs font-medium mb-4 ${styles[type] || styles.info}`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <span>{message}</span>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 ml-3">
          ✕
        </button>
      )}
    </div>
  );
}
