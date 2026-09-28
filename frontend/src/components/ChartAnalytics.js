'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export function StatusDoughnutChart({ data = [] }) {
  const statusColors = {
    'Applied': '#3b82f6',
    'Under Review': '#f59e0b',
    'Shortlisted': '#a855f7',
    'Interview': '#6366f1',
    'Selected': '#10b981',
    'Rejected': '#f43f5e',
  };

  const safeData = Array.isArray(data) ? data : [];
  const labels = safeData.map((d) => d?.status || 'Unknown');
  const values = safeData.map((d) => parseInt(d?.count || 0, 10));
  const bgColors = labels.map((l) => statusColors[l] || '#94a3b8');

  const chartData = {
    labels: labels.length > 0 ? labels : ['No Data'],
    datasets: [
      {
        data: values.length > 0 ? values : [1],
        backgroundColor: values.length > 0 ? bgColors : ['#e2e8f0'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 11, family: 'Inter' },
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
    cutout: '70%',
  };

  return (
    <div className="h-64 relative flex items-center justify-center">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

export function JobTypesBarChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const labels = safeData.map((d) => d?.job_type || 'Unknown');
  const values = safeData.map((d) => parseInt(d?.count || 0, 10));

  const chartData = {
    labels: labels.length > 0 ? labels : ['Full-time', 'Remote', 'Internship', 'Hybrid'],
    datasets: [
      {
        label: 'Active Postings',
        data: values.length > 0 ? values : [0, 0, 0, 0],
        backgroundColor: '#3b82f6',
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 10 } },
        grid: { color: '#f1f5f9' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}

export function UsersByRolePieChart({ data = [] }) {
  const roleLabels = {
    'job_seeker': 'Candidates',
    'recruiter': 'Recruiters',
    'admin': 'Administrators',
  };
  const roleColors = {
    'job_seeker': '#3b82f6',
    'recruiter': '#10b981',
    'admin': '#8b5cf6',
  };

  const safeData = Array.isArray(data) ? data : [];
  const labels = safeData.map((d) => (d?.role ? roleLabels[d.role] || d.role : 'Other'));
  const values = safeData.map((d) => parseInt(d?.count || 0, 10));
  const bgColors = safeData.map((d) => (d?.role ? roleColors[d.role] || '#94a3b8' : '#94a3b8'));

  const chartData = {
    labels: labels.length > 0 ? labels : ['Candidates', 'Recruiters', 'Administrators'],
    datasets: [
      {
        data: values.length > 0 ? values : [0, 0, 0],
        backgroundColor: bgColors.length > 0 ? bgColors : ['#3b82f6', '#10b981', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          font: { size: 11, family: 'Inter' },
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
    cutout: '65%',
  };

  return (
    <div className="h-64 relative flex items-center justify-center">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

export function JobsByStatusBarChart({ data = [] }) {
  const safeData = Array.isArray(data) ? data : [];
  const labels = safeData.map((d) => {
    if (!d?.status || typeof d.status !== 'string') return 'Unknown';
    return d.status.charAt(0).toUpperCase() + d.status.slice(1);
  });
  const values = safeData.map((d) => parseInt(d?.count || 0, 10));

  const chartData = {
    labels: labels.length > 0 ? labels : ['Active', 'Closed'],
    datasets: [
      {
        label: 'Job Postings',
        data: values.length > 0 ? values : [0, 0],
        backgroundColor: ['#10b981', '#94a3b8'],
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 10 } },
        grid: { color: '#f1f5f9' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } },
      },
    },
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}

