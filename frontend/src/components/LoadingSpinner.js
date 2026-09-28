import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      {text && <p className="mt-3 text-xs font-semibold text-slate-500">{text}</p>}
    </div>
  );
}
