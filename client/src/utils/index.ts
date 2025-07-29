import { format, parseISO, differenceInDays, isWeekend, addDays } from 'date-fns';
import { LeaveType, LeaveStatus } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy');
};

export const formatDateTime = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM dd, yyyy HH:mm');
};

export const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (!isWeekend(currentDate)) {
      count++;
    }
    currentDate = addDays(currentDate, 1);
  }

  return count;
};

export const getLeaveTypeColor = (type: LeaveType): string => {
  const colors: Record<LeaveType, string> = {
    sick: 'bg-red-100 text-red-800 border-red-200',
    casual: 'bg-blue-100 text-blue-800 border-blue-200',
    vacation: 'bg-green-100 text-green-800 border-green-200',
    compOff: 'bg-purple-100 text-purple-800 border-purple-200',
    lop: 'bg-gray-100 text-gray-800 border-gray-200',
    wfh: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    academic: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export const getLeaveStatusColor = (status: LeaveStatus): string => {
  const colors: Record<LeaveStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    approved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getLeaveTypeLabel = (type: LeaveType): string => {
  const labels: Record<LeaveType, string> = {
    sick: 'Sick Leave',
    casual: 'Casual Leave',
    vacation: 'Vacation Leave',
    compOff: 'Comp Off',
    lop: 'Loss of Pay',
    wfh: 'Work From Home',
    academic: 'Academic Leave',
  };
  return labels[type] || type;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getRoleColor = (role: string): string => {
  const colors: Record<string, string> = {
    admin: 'bg-red-500',
    manager: 'bg-blue-500',
    employee: 'bg-green-500',
  };
  return colors[role] || 'bg-gray-500';
};

export const getAdvanceNoticeDays = (leaveType: LeaveType): number => {
  const noticeDays: Record<string, number> = {
    casual: 7,
    vacation: 7,
    academic: 14,
  };
  return noticeDays[leaveType] || 0;
}; 