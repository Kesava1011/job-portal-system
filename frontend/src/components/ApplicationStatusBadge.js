import React from 'react';
import {
  Clock,
  Eye,
  CheckCircle,
  Calendar,
  Award,
  XCircle,
} from 'lucide-react';
import { getStatusBadgeClass } from '../lib/utils';

export default function ApplicationStatusBadge({ status }) {
  const getIcon = (st) => {
    switch (st) {
      case 'Applied':
        return <Clock className="w-3.5 h-3.5" />;
      case 'Under Review':
        return <Eye className="w-3.5 h-3.5" />;
      case 'Shortlisted':
        return <CheckCircle className="w-3.5 h-3.5" />;
      case 'Interview':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'Selected':
        return <Award className="w-3.5 h-3.5" />;
      case 'Rejected':
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
        status
      )}`}
    >
      {getIcon(status)}
      {status}
    </span>
  );
}
