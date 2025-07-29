import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarIcon,
  FunnelIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { Leave, LeaveStatus, LeaveType, User, ApiResponse } from '../types';
import { formatDate, getLeaveTypeColor, getLeaveStatusColor, getLeaveTypeLabel } from '../utils';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// Updated to match actual API response structure
interface LeaveResponse {
  success: boolean;
  message?: string;
  leaves: Leave[];
}

// Consolidated state interface
interface AllLeavesState {
  leaves: Leave[];
  loading: boolean;
  error: string | null;
  retryCount: number;
  currentPage: number;
  pageSize: number;
}

interface FilterState {
  status: string;
  leaveType: string;
  dateRange: string;
  department: string;
}

// Memoized filter options
const FILTER_OPTIONS = {
  status: [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
  ],
  leaveType: [
    { value: 'all', label: 'All Types' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'casual', label: 'Casual Leave' },
    { value: 'vacation', label: 'Vacation Leave' },
    { value: 'academic', label: 'Academic Leave' },
    { value: 'compOff', label: 'Comp Off' },
    { value: 'wfh', label: 'Work From Home' },
  ],
  dateRange: [
    { value: 'all', label: 'All Time' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' },
  ],
  department: [
    { value: 'all', label: 'All Departments' },
    { value: 'Engineering', label: 'Engineering' },
    { value: 'HR', label: 'HR' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Sales', label: 'Sales' },
  ],
};

// Memoized FilterSelect component
const FilterSelect: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = React.memo(({ value, onChange, options, className = '' }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 ${className}`}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
));

FilterSelect.displayName = 'FilterSelect';

// Memoized LeaveRow component
const LeaveRow: React.FC<{
  leave: Leave;
  onAction: (leaveId: string, action: 'approve' | 'reject') => void;
}> = React.memo(({ leave, onAction }) => {
  const employee = typeof leave.userId === 'string' ? null : leave.userId;
  
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hover:bg-gray-50"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <UserIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {employee?.name || 'Unknown'}
            </div>
            <div className="text-sm text-gray-500">
              {employee?.department || 'No Department'}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
          {getLeaveTypeLabel(leave.leaveType)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
        </div>
        <div className="text-sm text-gray-500">
          {leave.workingDays} working day{leave.workingDays !== 1 ? 's' : ''}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveStatusColor(leave.status)}`}>
          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {leave.status === 'pending' && (
          <div className="flex space-x-2">
            <button
              onClick={() => onAction(leave._id, 'approve')}
              className="text-green-600 hover:text-green-900 transition-colors"
              aria-label={`Approve leave for ${employee?.name || 'employee'}`}
            >
              <CheckIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onAction(leave._id, 'reject')}
              className="text-red-600 hover:text-red-900 transition-colors"
              aria-label={`Reject leave for ${employee?.name || 'employee'}`}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </td>
    </motion.tr>
  );
});

LeaveRow.displayName = 'LeaveRow';

// Pagination component
const Pagination: React.FC<{
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}> = React.memo(({ currentPage, totalItems, pageSize, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    page === currentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';

const AllLeaves: React.FC = () => {
  const { user } = useAuth();
  
  // Consolidated state management
  const [state, setState] = useState<AllLeavesState>({
    leaves: [],
    loading: true,
    error: null,
    retryCount: 0,
    currentPage: 1,
    pageSize: 10,
  });

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    leaveType: 'all',
    dateRange: 'all',
    department: 'all',
  });

  // Enhanced fetch function with retry mechanism
  const fetchLeaves = useCallback(async (retryAttempt = 0) => {
    console.debug(`Fetching all leaves (attempt ${retryAttempt + 1})`);
    
    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        retryCount: retryAttempt,
      }));

      const response = await api.getAllLeaves() as LeaveResponse;
      
      if (response.success && response.leaves) {
        console.debug(`Fetched ${response.leaves.length} leaves successfully`);
        setState(prev => ({
          ...prev,
          leaves: response.leaves || [],
          loading: false,
          error: null,
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch leaves');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch leaves';
      console.error('Error fetching leaves:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
      
      toast.error(message);
    }
  }, []);

  // Retry mechanism with exponential backoff
  const handleRetry = useCallback(() => {
    const maxRetries = 3;
    if (state.retryCount < maxRetries) {
      const delay = Math.pow(2, state.retryCount) * 1000;
      console.debug(`Retrying in ${delay}ms (attempt ${state.retryCount + 1})`);
      
      setTimeout(() => {
        fetchLeaves(state.retryCount + 1);
      }, delay);
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
    }
  }, [fetchLeaves, state.retryCount]);

  // Memoized filter handler
  const handleFilterChange = useCallback((filterName: keyof FilterState, value: string) => {
    console.debug(`Filter changed: ${filterName} = ${value}`);
    setFilters(prev => ({ ...prev, [filterName]: value }));
    setState(prev => ({ ...prev, currentPage: 1 })); // Reset to first page when filters change
  }, []);

  // Memoized filtered and paginated leaves
  const { filteredLeaves, paginatedLeaves, totalFilteredCount } = useMemo(() => {
    console.debug('Applying filters and pagination');
    let filtered = [...state.leaves];

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(leave => leave.status === filters.status);
    }

    // Apply leave type filter
    if (filters.leaveType !== 'all') {
      filtered = filtered.filter(leave => leave.leaveType === filters.leaveType);
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const days = filters.dateRange === '30days' ? 30 : 90;
      const cutoff = new Date(now.getTime());
      cutoff.setDate(cutoff.getDate() - days);
      
      filtered = filtered.filter(leave => {
        try {
        const leaveDate = new Date(leave.startDate);
        return leaveDate.getTime() >= cutoff.getTime() && leaveDate.getTime() <= now.getTime();
        } catch (error) {
          console.warn('Invalid leave date:', leave.startDate, error);
          return false;
        }
      });
    }

    // Apply department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter(leave => {
        const userDept = typeof leave.userId === 'string' ? '' : leave.userId.department;
        return userDept === filters.department;
      });
    }

    // Sort by most recent first
    filtered.sort((a, b) => {
      try {
        return new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime();
      } catch (error) {
        console.warn('Error sorting leaves:', error);
        return 0;
      }
    });

    // Pagination
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = startIndex + state.pageSize;
    const paginated = filtered.slice(startIndex, endIndex);

    console.debug(`Filtered ${filtered.length} leaves, showing ${paginated.length} on page ${state.currentPage}`);

    return {
      filteredLeaves: filtered,
      paginatedLeaves: paginated,
      totalFilteredCount: filtered.length,
    };
  }, [state.leaves, filters, state.currentPage, state.pageSize]);

  // Memoized leave action handler
  const handleLeaveAction = useCallback(async (leaveId: string, action: 'approve' | 'reject') => {
    console.debug(`${action}ing leave ${leaveId}`);
    
    try {
      const response = await api.updateLeaveStatus({
        leaveId,
        status: action === 'approve' ? 'approved' : 'rejected',
        ...(action === 'reject' && { rejectionReason: 'Rejected by admin' }) // Only add rejection reason for rejections
      });

      if (response.success) {
        toast.success(`Leave ${action}d successfully`);
        fetchLeaves(); // Refresh the leaves list
      } else {
        throw new Error(response.message || `Failed to ${action} leave`);
      }
    } catch (error) {
      const message = `Failed to ${action} leave`;
      console.error(`Error ${action}ing leave:`, error);
      toast.error(message);
    }
  }, [fetchLeaves]);

  // Page change handler
  const handlePageChange = useCallback((page: number) => {
    console.debug(`Changing to page ${page}`);
    setState(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Memoized render helpers
  const renderLoadingState = useMemo(() => (
      <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-600">
          Loading all leaves{state.retryCount > 0 && ` (attempt ${state.retryCount + 1})`}...
        </p>
      </div>
    </div>
  ), [state.retryCount]);

  const renderErrorState = useMemo(() => (
    <div className="text-center py-12" role="alert">
      <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Leaves</h3>
      <p className="mt-1 text-sm text-gray-500">{state.error}</p>
      <div className="mt-4 space-x-4">
        <button
          onClick={handleRetry}
          disabled={state.retryCount >= 3}
          className="text-sm text-blue-600 hover:text-blue-500 disabled:text-gray-400"
        >
          {state.retryCount >= 3 ? 'Max retries reached' : 'Try again'}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-gray-600 hover:text-gray-500"
        >
          Refresh page
        </button>
      </div>
    </div>
  ), [state.error, state.retryCount, handleRetry]);

  if (state.loading) {
    return renderLoadingState;
  }

  if (state.error && state.leaves.length === 0) {
    return renderErrorState;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
    <div>
      <h1 className="text-2xl font-bold text-gray-900">All Leaves</h1>
      <p className="mt-1 text-sm text-gray-600">
          View and manage all leave applications across the organization
        </p>
        {totalFilteredCount > 0 && (
          <p className="mt-1 text-sm text-gray-500">
            Showing {totalFilteredCount} leave{totalFilteredCount !== 1 ? 's' : ''} 
            {state.leaves.length !== totalFilteredCount && ` (filtered from ${state.leaves.length} total)`}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <FilterSelect
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            options={FILTER_OPTIONS.status}
          />

          <FilterSelect
            value={filters.leaveType}
            onChange={(value) => handleFilterChange('leaveType', value)}
            options={FILTER_OPTIONS.leaveType}
          />

          <FilterSelect
            value={filters.dateRange}
            onChange={(value) => handleFilterChange('dateRange', value)}
            options={FILTER_OPTIONS.dateRange}
          />

          <FilterSelect
            value={filters.department}
            onChange={(value) => handleFilterChange('department', value)}
            options={FILTER_OPTIONS.department}
          />

          {Object.values(filters).some(filter => filter !== 'all') && (
            <button
              onClick={() => {
                setFilters({
                  status: 'all',
                  leaveType: 'all',
                  dateRange: 'all',
                  department: 'all',
                });
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Leaves List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {totalFilteredCount === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leaves found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {Object.values(filters).every(filter => filter === 'all')
                ? 'No leave applications have been submitted yet.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLeaves.map((leave) => (
                    <LeaveRow
                      key={leave._id}
                      leave={leave}
                      onAction={handleLeaveAction}
                    />
                  ))}
              </tbody>
            </table>
          </div>
            
            {/* Pagination */}
            <Pagination
              currentPage={state.currentPage}
              totalItems={totalFilteredCount}
              pageSize={state.pageSize}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AllLeaves; 