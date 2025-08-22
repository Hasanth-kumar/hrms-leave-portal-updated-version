import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  FunnelIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Leave, LeaveStatus, LeaveType, User, ApiResponse, TeamMember } from '../types';
import { formatDate, getLeaveTypeColor, getLeaveStatusColor, getLeaveTypeLabel } from '../utils';
import toast from 'react-hot-toast';
import LeaveCalendar from '../components/LeaveCalendar';

interface LeaveResponse extends ApiResponse<{
  leaves: Leave[];
  teamMembers: TeamMember[];
}> {}

interface TeamMembersResponse extends ApiResponse<{
  departments: string[];
  members: Record<string, TeamMember[]>;
}> {}

interface Filters {
  status: 'all' | LeaveStatus;
  leaveType: 'all' | LeaveType;
  dateRange: 'all' | '30days' | '90days';
  employee: string;
}

interface ActionModalState {
  show: boolean;
  leave: Leave | null;
  action: 'approve' | 'reject' | null;
  reason: string;
}

const TeamLeaves: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    leaveType: 'all',
    dateRange: 'all',
    employee: 'all',
  });
  const [actionModal, setActionModal] = useState<ActionModalState>({
    show: false,
    leave: null,
    action: null,
    reason: '',
  });

  useEffect(() => {
    // Check user role
    if (!user || (user.role !== 'manager' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get team leaves - this now returns both leaves and team members
        const leavesRes = await api.getTeamLeaves() as LeaveResponse;

        if (!mounted) return;

        if (!leavesRes.success || !leavesRes.data) {
          throw new Error(leavesRes.message || 'Failed to fetch team leaves');
        }

        setLeaves(leavesRes.data.leaves);
        setTeamMembers(leavesRes.data.teamMembers);
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Failed to load data';
        setError(message);
        toast.error(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  useEffect(() => {
    applyFilters();
  }, [leaves, filters]);

  const applyFilters = () => {
    let filtered = [...leaves];

    if (filters.status !== 'all') {
      filtered = filtered.filter(leave => leave.status === filters.status);
    }

    if (filters.leaveType !== 'all') {
      filtered = filtered.filter(leave => leave.leaveType === filters.leaveType);
    }

    if (filters.employee !== 'all') {
      filtered = filtered.filter(leave => {
        const userId = typeof leave.userId === 'string' ? leave.userId : leave.userId.id;
        return userId === filters.employee;
      });
    }

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const days = filters.dateRange === '30days' ? 30 : 90;
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(leave => new Date(leave.startDate) >= cutoff);
    }

    setFilteredLeaves(filtered);
  };

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleAction = async () => {
    if (!actionModal.leave || !actionModal.action) return;

    try {
      const status = actionModal.action === 'approve' ? 'approved' : 'rejected';
      
      const response = await api.updateLeaveStatus({
        leaveId: actionModal.leave._id,
        status: status,
        rejectionReason: actionModal.reason,
      });

      if (response.success) {
        toast.success(`Leave ${actionModal.action}d successfully`);
        // Update local state
        setLeaves(prev =>
          prev.map(leave =>
            leave._id === actionModal.leave?._id
              ? { ...leave, status: status }
              : leave
          )
        );
        setActionModal({ show: false, leave: null, action: null, reason: '' });
      } else {
        throw new Error(response.message || `Failed to ${actionModal.action} leave`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${actionModal.action} leave`;
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading team leaves">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" role="alert">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
        <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Team Leaves</h2>
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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Leaves</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage your team's leave applications
        </p>
      </div>
      
      {/* View Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <QueueListIcon className="h-5 w-5 mr-2" />
          List View
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'calendar'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarDaysIcon className="h-5 w-5 mr-2" />
          Calendar View
        </button>
      </div>
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
            id="employee-filter"
            value={filters.employee}
            onChange={(e) => handleFilterChange('employee', e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter by employee"
          >
            <option value="all">All Employees</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
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

      {/* Content based on view mode */}
      {viewMode === 'calendar' ? (
        <LeaveCalendar
          leaves={filteredLeaves}
          loading={loading}
        />
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          {filteredLeaves.length === 0 ? (
            <div className="text-center py-12" role="status">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
              <h2 className="mt-2 text-sm font-medium text-gray-900">No leaves found</h2>
              <p className="mt-1 text-sm text-gray-500">
                {filters.status === 'all' && filters.leaveType === 'all' && filters.dateRange === 'all'
                  ? 'No leave applications from your team members.'
                  : 'Try adjusting your filters.'}
              </p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
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
                {filteredLeaves.map((leave) => {
                  const employee = typeof leave.userId === 'string'
                    ? teamMembers.find(m => m.id === leave.userId)
                    : leave.userId;

                  return (
                    <motion.tr
                      key={leave._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                      role="row"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <UserIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {leave.workingDays} working day{leave.workingDays !== 1 ? 's' : ''}
                          {leave.isHalfDay && ' (Half Day)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getLeaveStatusColor(leave.status)}`}
                          role="status"
                        >
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(leave.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leave.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setActionModal({
                                show: true,
                                leave,
                                action: 'approve',
                                reason: '',
                              })}
                              className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              aria-label={`Approve leave for ${employee?.name}`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => setActionModal({
                                show: true,
                                leave,
                                action: 'reject',
                                reason: '',
                              })}
                              className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              aria-label={`Reject leave for ${employee?.name}`}
                            >
                              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {actionModal.show && actionModal.leave && actionModal.action && (
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-labelledby="action-modal-title"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h2 id="action-modal-title" className="text-lg font-medium text-gray-900 mb-4">
                {actionModal.action === 'approve' ? 'Approve' : 'Reject'} Leave
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to {actionModal.action} this leave request?
              </p>

              {actionModal.action === 'reject' && (
                <div className="mb-4">
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for rejection
                  </label>
                  <textarea
                    id="reason"
                    rows={3}
                    value={actionModal.reason}
                    onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Please provide a reason..."
                    required
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActionModal({ show: false, leave: null, action: null, reason: '' })}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    actionModal.action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamLeaves; 