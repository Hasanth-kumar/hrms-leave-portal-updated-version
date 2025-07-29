import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  FunnelIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { Leave, LeaveStatus, LeaveType, ApiResponse } from '../types';
import { formatDate, getLeaveTypeColor, getLeaveStatusColor, getLeaveTypeLabel } from '../utils';
import toast from 'react-hot-toast';
import { parseISO, isAfter, startOfDay, subDays } from 'date-fns';

// Updated to match actual API response structure
interface LeaveResponse {
  success: boolean;
  message?: string;
  leaves: Leave[];
}

interface CancelResponse {
  success: boolean;
  message: string;
}

interface Filters {
  status: 'all' | LeaveStatus;
  leaveType: 'all' | LeaveType;
  dateRange: 'all' | '30days' | '90days';
}

const MyLeaves: React.FC = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    leaveType: 'all',
    dateRange: 'all',
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellingLeave, setCancellingLeave] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchLeaves = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getMyLeaves() as LeaveResponse;
        
        if (!mounted) return;

        if (!response.success || !response.leaves) {
          throw new Error(response.message || 'Failed to fetch leaves');
        }

        setLeaves(response.leaves);
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Failed to fetch leaves';
        setError(message);
        toast.error(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchLeaves();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leaves, filters]);

  const applyFilters = () => {
    let filtered = [...leaves];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(leave => leave.status === filters.status);
    }

    // Leave type filter
    if (filters.leaveType !== 'all') {
      filtered = filtered.filter(leave => leave.leaveType === filters.leaveType);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const today = startOfDay(new Date());
      const days = filters.dateRange === '30days' ? 30 : 90;
      const cutoffDate = subDays(today, days);

      filtered = filtered.filter(leave => {
        const createdDate = parseISO(leave.createdAt);
        return isAfter(createdDate, cutoffDate) || createdDate.getTime() === cutoffDate.getTime();
      });
    }

    setFilteredLeaves(filtered);
  };

  const handleFilterChange = (filterType: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const canCancelLeave = (leave: Leave): boolean => {
    const today = startOfDay(new Date());
    const startDate = startOfDay(parseISO(leave.startDate));
    return leave.status !== 'cancelled' && isAfter(startDate, today);
  };

  const handleCancelLeave = async () => {
    if (!selectedLeave) return;

    setCancellingLeave(true);
    try {
      const response = await api.cancelLeave(selectedLeave._id, cancellationReason);
      if (!response.success) {
        throw new Error(response.message || 'Failed to cancel leave');
      }
      
      toast.success('Leave cancelled successfully');
      const updatedLeaves = leaves.map(leave =>
        leave._id === selectedLeave._id
          ? { ...leave, status: 'cancelled' as LeaveStatus }
          : leave
      );
      setLeaves(updatedLeaves);
      handleCloseModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel leave';
      toast.error(message);
    } finally {
      setCancellingLeave(false);
    }
  };

  const handleCloseModal = () => {
    setShowCancelModal(false);
    setSelectedLeave(null);
    setCancellationReason('');
  };

  const getStatusIcon = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return <CheckIcon className="h-5 w-5 text-green-600" aria-hidden="true" />;
      case 'rejected':
        return <XMarkIcon className="h-5 w-5 text-red-600" aria-hidden="true" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" aria-hidden="true" />;
      case 'cancelled':
        return <XMarkIcon className="h-5 w-5 text-gray-600" aria-hidden="true" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading leaves">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" role="alert">
        <XMarkIcon className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
        <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Leaves</h2>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Leaves</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage your leave applications
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4 flex-wrap gap-y-2">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            id="type-filter"
            value={filters.leaveType}
            onChange={(e) => handleFilterChange('leaveType', e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter by leave type"
          >
            <option value="all">All Types</option>
            <option value="sick">Sick Leave</option>
            <option value="casual">Casual Leave</option>
            <option value="vacation">Vacation Leave</option>
            <option value="academic">Academic Leave</option>
            <option value="compOff">Comp Off</option>
            <option value="wfh">Work From Home</option>
          </select>

          <select
            id="date-filter"
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter by date range"
          >
            <option value="all">All Time</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Leaves List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {filteredLeaves.length === 0 ? (
          <div className="text-center py-12" role="status">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
            <h2 className="mt-2 text-sm font-medium text-gray-900">No leaves found</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filters.status === 'all' && filters.leaveType === 'all' && filters.dateRange === 'all'
                ? "You haven't applied for any leaves yet."
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied On
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeaves.map((leave) => (
                  <motion.tr
                    key={leave._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                    role="row"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
                        {getLeaveTypeLabel(leave.leaveType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.workingDays} {leave.isHalfDay && '(Half Day)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveStatusColor(leave.status)}`}
                        role="status"
                      >
                        {getStatusIcon(leave.status)}
                        <span>{leave.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(leave.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {canCancelLeave(leave) && (
                        <button
                          onClick={() => {
                            setSelectedLeave(leave);
                            setShowCancelModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          aria-label={`Cancel leave for ${formatDate(leave.startDate)}`}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && selectedLeave && (
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-labelledby="cancel-modal-title"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h2 id="cancel-modal-title" className="text-lg font-medium text-gray-900 mb-4">
                Cancel Leave
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to cancel this leave? This action cannot be undone.
              </p>
              <div className="mb-4">
                <label htmlFor="cancellationReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  id="cancellationReason"
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Please provide a reason..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Keep Leave
                </button>
                <button
                  type="button"
                  onClick={handleCancelLeave}
                  disabled={cancellingLeave}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    cancellingLeave
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                  aria-disabled={cancellingLeave}
                >
                  {cancellingLeave ? 'Cancelling...' : 'Cancel Leave'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyLeaves; 