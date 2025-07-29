// User related types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  type: 'regular' | 'intern';
  department?: string;
  leaveBalance: LeaveBalance;
  carryForward?: number;
  joiningDate?: string; // Some APIs use 'joiningDate'
  joinDate?: string; // Some APIs use 'joinDate'
  employeeId?: string; // Employee ID for identification
  isIntern?: boolean; // Whether the user is an intern
  isActive: boolean;
  managerId?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  type: 'regular' | 'intern';
  department?: string;
  joiningDate?: string;
}

export interface Department {
  name: string;
  employeeCount: number;
  totalLeavesThisYear: number;
}

export interface LeaveBalance {
  sick: number;
  casual: number;
  vacation: number;
  academic: number;
  compOff: number;
  lop: number;
}

// Leave related types
export interface Leave {
  _id: string;
  userId: User | string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  workingDays: number;
  isHalfDay?: boolean;
  documents?: SupportDocument[];
  approvedBy?: User | string;
  approvedOn?: string;
  rejectedBy?: User | string;
  rejectedOn?: string;
  rejectionReason?: string;
  cancelledOn?: string;
  cancellationReason?: string;
  compOffDays?: number;
  balanceDeducted?: boolean;
  lopDays?: number;
  createdAt: string;
  updatedAt: string;
}

export type LeaveType = 'sick' | 'casual' | 'vacation' | 'compOff' | 'lop' | 'wfh' | 'academic';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface SupportDocument {
  fileName: string;
  fileUrl?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
}

// Holiday related types
export interface Holiday {
  _id: string;
  date: string;
  name: string;
  year: number;
  type: 'national' | 'regional' | 'optional';
  isActive: boolean;
}

// Config related types
export interface SystemConfig {
  leaveQuotas: {
    regular: LeaveQuota;
    intern: LeaveQuota;
  };
  accrualRates: {
    regular: LeaveQuota;
    intern: LeaveQuota;
  };
  systemSettings: SystemSettings;
}

export interface LeaveQuota {
  sick: number;
  casual: number;
  vacation: number;
  academic: number;
}

export interface SystemSettings {
  maxLOPDays: number;
  maxLOPDaysPerMonth: number;
  carryForwardCap: number;
  advanceNotice: {
    casual: number;
    vacation: number;
    academic: number;
  };
  sickLeaveCutoffTime: string;
  hrEmail: string;
  workingDays: number[];
  lopSettings: LOPSettings;
  academicLeaveSettings: AcademicLeaveSettings;
}

export interface LOPSettings {
  autoConvertNegativeBalance: boolean;
  lopResetPeriod: 'monthly' | 'yearly';
  allowLOPCarryForward: boolean;
  lopAlertThreshold: number;
  restrictLeaveAfterMaxLOP: boolean;
  lopDeductionFromSalary: boolean;
}

export interface AcademicLeaveSettings {
  requireDocuments: boolean;
  maxDocuments: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  minAdvanceNotice: number;
  maxConsecutiveDays: number;
  requireManagerApproval: boolean;
  requireHRApproval: boolean;
}

// LOP Status
export interface LOPStatus {
  exceedsYearlyLimit: boolean;
  exceedsMonthlyLimit: boolean;
  nearThreshold: boolean;
  yearlyLOP: number;
  monthlyLOP: number;
  maxYearlyLOP: number;
  maxMonthlyLOP: number;
  lopHistory: LOPHistoryItem[];
  totalLOPBalance: number;
}

export interface LOPHistoryItem {
  date: string;
  days: number;
  reason: string;
  leaveId?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Form types
export interface LeaveApplicationForm {
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  isHalfDay?: boolean;
  documents?: File[];
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Dashboard stats
export interface DashboardStats {
  totalEmployees?: number;
  pendingLeaves?: number;
  approvedLeaves?: number;
  todayAbsent?: number;
  leaveStats?: LeaveStatItem[];
}

export interface LeaveStatItem {
  _id: {
    status: LeaveStatus;
    leaveType: LeaveType;
  };
  count: number;
  totalDays: number;
} 