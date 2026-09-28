// Utility functions for formatting and styling

export function formatSalary(min, max) {
  if (!min && !max) return 'Competitive Salary';
  const formatNum = (n) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${n}`;
  };
  if (min && max) return `${formatNum(min)} - ${formatNum(max)} / yr`;
  if (min) return `From ${formatNum(min)} / yr`;
  return `Up to ${formatNum(max)} / yr`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  let interval = Math.floor(seconds / 86400);
  if (interval >= 1) return `${interval}d ago`;
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return `${interval}h ago`;
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return `${interval}m ago`;
  return 'Just now';
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'Applied':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Under Review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Shortlisted':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Interview':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
    case 'Selected':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getMatchScoreColor(score) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (score >= 40) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
}
