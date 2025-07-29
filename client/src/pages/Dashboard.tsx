import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LeaveBalance, LOPStatus, Leave, Holiday, ApiResponse } from '../types';
import { formatDate, getLeaveTypeColor, getLeaveTypeLabel } from '../utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { parseISO, isAfter, startOfDay } from 'date-fns';

interface LeaveBalanceCardProps {
  type: keyof LeaveBalance;
  balance: number;
  label: string;
  icon: React.ReactNode;
  color: string;
}

// Consolidated dashboard state interface
interface DashboardState {
  leaveBalance: LeaveBalance | null;
  lopStatus: LOPStatus | null;
  recentLeaves: Leave[];
  upcomingHolidays: Holiday[];
  carryForward: number;
  loading: boolean;
  error: string | null;
  retryCount: number;
}

interface ApiResponseWithData<T> extends ApiResponse<T> {
  data: T;
}

interface LeaveResponse extends ApiResponse<Leave[]> {}
interface HolidayResponse extends ApiResponse<Holiday[]> {}
// Update to match actual API response structure
interface BalanceResponse {
  success: boolean;
  message?: string;
  balance: LeaveBalance;
  carryForward: number;
}

interface LOPResponse {
  success: boolean;
  message?: string;
  lopStatus: LOPStatus;
}

interface LeaveResponse {
  success: boolean;
  message?: string;
  leaves: Leave[];
}

interface HolidayResponse {
  success: boolean;
  message?: string;
  holidays: Holiday[];
}

// Memoized LeaveBalanceCard component for better performance
const LeaveBalanceCard: React.FC<LeaveBalanceCardProps> = React.memo(({ type, balance, label, icon, color }) => {
  console.debug(`Rendering LeaveBalanceCard for ${type}:`, { balance, label });
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
      role="article"
      aria-label={`${label} balance: ${balance} days`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{balance}</p>
          <p className="text-xs text-gray-500 mt-1">days available</p>
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`} aria-hidden="true">
          {icon}
        </div>
      </div>
    </motion.div>
  );
});

LeaveBalanceCard.displayName = 'LeaveBalanceCard';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Consolidated state management
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    leaveBalance: null,
    lopStatus: null,
    recentLeaves: [],
    upcomingHolidays: [],
    carryForward: 0,
    loading: true,
    error: null,
    retryCount: 0,
  });

  // Memoized leave types configuration
  const leaveTypes = useMemo(() => [
    { type: 'sick' as keyof LeaveBalance, label: 'Sick Leave', icon: <CalendarDaysIcon className="h-6 w-6 text-red-600" aria-hidden="true" />, color: 'text-red-600' },
    { type: 'casual' as keyof LeaveBalance, label: 'Casual Leave', icon: <CalendarDaysIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />, color: 'text-blue-600' },
    { type: 'vacation' as keyof LeaveBalance, label: 'Vacation Leave', icon: <CalendarDaysIcon className="h-6 w-6 text-green-600" aria-hidden="true" />, color: 'text-green-600' },
    { type: 'academic' as keyof LeaveBalance, label: 'Academic Leave', icon: <CalendarDaysIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />, color: 'text-indigo-600' },
    { type: 'compOff' as keyof LeaveBalance, label: 'Comp Off', icon: <ClockIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />, color: 'text-purple-600' },
    { type: 'lop' as keyof LeaveBalance, label: 'Loss of Pay', icon: <ExclamationTriangleIcon className="h-6 w-6 text-gray-600" aria-hidden="true" />, color: 'text-gray-600' },
  ], []);

  // Enhanced API call with detailed error handling and retry mechanism
  const fetchDashboardData = useCallback(async (retryAttempt = 0) => {
    if (!user) {
      console.debug('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    console.debug(`Fetching dashboard data (attempt ${retryAttempt + 1})`);

    try {
      setDashboardState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        retryCount: retryAttempt 
      }));

      // Enhanced API calls with individual error tracking
      console.debug('Making API calls for dashboard data');
      const apiCalls = await Promise.allSettled([
        api.getLeaveBalance() as Promise<BalanceResponse>,
        api.getLOPStatus() as Promise<LOPResponse>,
        api.getMyLeaves() as Promise<LeaveResponse>,
        api.getHolidays() as Promise<HolidayResponse>,
      ]);

      const [balanceResult, lopResult, leavesResult, holidaysResult] = apiCalls;
      const errors: string[] = [];

      // Enhanced error checking with detailed logging
      let balanceData: { balance: LeaveBalance; carryForward: number } | null = null;
      if (balanceResult.status === 'fulfilled') {
        const balanceRes = balanceResult.value;
        if (balanceRes.success && balanceRes.balance) {
          balanceData = { balance: balanceRes.balance, carryForward: balanceRes.carryForward || 0 };
          console.debug('Leave balance fetched successfully:', balanceData);
        } else {
          console.error('Leave balance API failed:', JSON.stringify(balanceRes, null, 2));
          errors.push('Failed to fetch leave balance');
        }
      } else {
        console.error('Leave balance API rejected:', balanceResult.reason);
        errors.push(`Leave balance error: ${balanceResult.reason?.message || 'Unknown error'}`);
      }

      let lopData: { lopStatus: LOPStatus } | null = null;
      if (lopResult.status === 'fulfilled') {
        const lopRes = lopResult.value;
        if (lopRes.success && lopRes.lopStatus) {
          lopData = { lopStatus: lopRes.lopStatus };
          console.debug('LOP status fetched successfully:', lopData);
        } else {
          console.error('LOP status API failed:', JSON.stringify(lopRes, null, 2));
          errors.push('Failed to fetch LOP status');
        }
      } else {
        console.error('LOP status API rejected:', lopResult.reason);
        errors.push(`LOP status error: ${lopResult.reason?.message || 'Unknown error'}`);
      }

      let leavesData: Leave[] = [];
      if (leavesResult.status === 'fulfilled') {
        const leavesRes = leavesResult.value;
        if (leavesRes.success && leavesRes.leaves) {
          leavesData = leavesRes.leaves;
          console.debug(`Fetched ${leavesData.length} leaves successfully`);
        } else {
          console.error('Leaves API failed:', JSON.stringify(leavesRes, null, 2));
          errors.push('Failed to fetch leaves');
        }
      } else {
        console.error('Leaves API rejected:', leavesResult.reason);
        errors.push(`Leaves error: ${leavesResult.reason?.message || 'Unknown error'}`);
      }

      let holidaysData: Holiday[] = [];
      if (holidaysResult.status === 'fulfilled') {
        const holidaysRes = holidaysResult.value;
        if (holidaysRes.success && holidaysRes.holidays) {
          holidaysData = holidaysRes.holidays;
          console.debug(`Fetched ${holidaysData.length} holidays successfully`);
        } else {
          console.error('Holidays API failed:', JSON.stringify(holidaysRes, null, 2));
          errors.push('Failed to fetch holidays');
        }
      } else {
        console.error('Holidays API rejected:', holidaysResult.reason);
        errors.push(`Holidays error: ${holidaysResult.reason?.message || 'Unknown error'}`);
      }

      // Process holidays with error handling
      const today = startOfDay(new Date());
      const upcoming = holidaysData
        .filter((holiday: Holiday) => {
          try {
            return isAfter(parseISO(holiday.date), today);
          } catch (error) {
            console.warn('Invalid holiday date:', holiday.date, error);
            return false;
          }
        })
        .sort((a: Holiday, b: Holiday) => {
          try {
            return parseISO(a.date).getTime() - parseISO(b.date).getTime();
          } catch (error) {
            console.warn('Error sorting holidays:', error);
            return 0;
          }
        })
        .slice(0, 5);

      console.debug(`Processed ${upcoming.length} upcoming holidays`);

      // Update state with successful data, even if some APIs failed
      setDashboardState(prev => ({
        ...prev,
        leaveBalance: balanceData?.balance || null,
        carryForward: balanceData?.carryForward || 0,
        lopStatus: lopData?.lopStatus || null,
        recentLeaves: leavesData.slice(0, 5),
        upcomingHolidays: upcoming,
        loading: false,
        error: errors.length > 0 ? errors.join('; ') : null,
      }));

      // Show errors but don't completely fail if we got some data
      if (errors.length > 0) {
        const errorMessage = `Some data failed to load: ${errors.join(', ')}`;
        console.warn(errorMessage);
        toast.error(errorMessage);
      } else {
        console.debug('Dashboard data loaded successfully');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
      console.error('Dashboard data fetch failed:', error);
      
      setDashboardState(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
      
      toast.error(message);
    }
  }, [user, navigate]);

  // Retry mechanism with exponential backoff
  const handleRetry = useCallback(() => {
    const maxRetries = 3;
    if (dashboardState.retryCount < maxRetries) {
      const delay = Math.pow(2, dashboardState.retryCount) * 1000; // Exponential backoff
      console.debug(`Retrying in ${delay}ms (attempt ${dashboardState.retryCount + 1})`);
      
      setTimeout(() => {
        fetchDashboardData(dashboardState.retryCount + 1);
      }, delay);
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
    }
  }, [fetchDashboardData, dashboardState.retryCount]);

  useEffect(() => {
    let mounted = true;
    
    if (!user) {
      navigate('/login');
      return;
    }

    // Only fetch if mounted
    if (mounted) {
      fetchDashboardData();
    }

    return () => {
      mounted = false;
    };
  }, [user, navigate, fetchDashboardData]);

  // Memoized render helpers
  const renderLoadingState = useMemo(() => (
    <div className="flex items-center justify-center h-64" role="status" aria-label="Loading dashboard">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">
          Loading dashboard data{dashboardState.retryCount > 0 && ` (attempt ${dashboardState.retryCount + 1})`}...
        </p>
      </div>
    </div>
  ), [dashboardState.retryCount]);

  const renderErrorState = useMemo(() => (
    <div className="text-center py-12" role="alert">
      <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Dashboard</h3>
      <p className="mt-1 text-sm text-gray-500">{dashboardState.error}</p>
      <div className="mt-4 space-x-4">
        <button
          onClick={handleRetry}
          disabled={dashboardState.retryCount >= 3}
          className="text-sm text-blue-600 hover:text-blue-500 disabled:text-gray-400"
        >
          {dashboardState.retryCount >= 3 ? 'Max retries reached' : 'Try again'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-gray-600 hover:text-gray-500"
        >
          Refresh page
        </button>
      </div>
    </div>
  ), [dashboardState.error, dashboardState.retryCount, handleRetry]);

  if (dashboardState.loading) {
    return renderLoadingState;
  }

  if (dashboardState.error && !dashboardState.leaveBalance) {
    return renderErrorState;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {user?.name}! Here's your leave overview.
        </p>
      </div>

      {/* LOP Alert */}
      {dashboardState.lopStatus?.nearThreshold && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-3" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">LOP Alert</h3>
              <p className="mt-1 text-sm text-yellow-700">
                You have {dashboardState.lopStatus.yearlyLOP} LOP days this year. Maximum allowed: {dashboardState.lopStatus.maxYearlyLOP} days.
                {dashboardState.lopStatus.exceedsYearlyLimit && ' You have exceeded the yearly limit!'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Leave balances">
        {dashboardState.leaveBalance && leaveTypes.map((leave) => (
          <LeaveBalanceCard
            key={leave.type}
            type={leave.type}
            balance={dashboardState.leaveBalance![leave.type]}
            label={leave.label}
            icon={leave.icon}
            color={leave.color}
          />
        ))}
      </div>

      {/* Carry Forward Display */}
      {dashboardState.carryForward > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-blue-50 rounded-lg"
        >
          <p className="text-sm text-blue-800">
            <strong>Carry Forward Balance:</strong> {dashboardState.carryForward} days from previous period
          </p>
        </motion.div>
      )}

      {/* Quick Stats for Managers/Admins */}
      {(user?.role === 'manager' || user?.role === 'admin') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" role="list" aria-label="Team statistics">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <DocumentTextIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <UserGroupIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Team on Leave</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <ChartBarIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Leave Utilization</p>
                <p className="text-2xl font-bold text-gray-900">0%</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leaves */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
          role="region"
          aria-labelledby="recent-leaves-title"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 id="recent-leaves-title" className="text-lg font-semibold text-gray-900">Recent Leave Applications</h2>
          </div>
          <div className="divide-y divide-gray-200" role="list">
            {dashboardState.recentLeaves.length > 0 ? (
              dashboardState.recentLeaves.map((leave) => (
                <div 
                  key={leave._id} 
                  className="px-6 py-4 hover:bg-gray-50"
                  role="listitem"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getLeaveTypeLabel(leave.leaveType)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </p>
                    </div>
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}
                      role="status"
                    >
                      {leave.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No recent leave applications
              </div>
            )}
          </div>
        </motion.div>

        {/* Upcoming Holidays */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
          role="region"
          aria-labelledby="upcoming-holidays-title"
        >
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 id="upcoming-holidays-title" className="text-lg font-semibold text-gray-900">Upcoming Holidays</h2>
          </div>
          <div className="divide-y divide-gray-200" role="list">
            {dashboardState.upcomingHolidays.length > 0 ? (
              dashboardState.upcomingHolidays.map((holiday) => (
                <div 
                  key={holiday._id} 
                  className="px-6 py-4 hover:bg-gray-50"
                  role="listitem"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{holiday.name}</p>
                      <p className="text-sm text-gray-500">{formatDate(holiday.date)}</p>
                    </div>
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      role="status"
                    >
                      {holiday.type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No upcoming holidays
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard; 