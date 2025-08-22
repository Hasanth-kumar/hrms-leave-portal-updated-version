import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentArrowDownIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Department, ApiResponse, LeaveType, LeaveStatus } from '../types';
import toast from 'react-hot-toast';

interface DepartmentResponse extends ApiResponse<Department[]> {}

interface ReportFilters {
  year: number;
  department: string;
  leaveType: 'all' | LeaveType;
  status: 'all' | LeaveStatus;
}

interface AnalyticsData {
  summary: {
    totalLeaves: number;
    approvedLeaves: number;
    pendingLeaves: number;
    rejectedLeaves: number;
    cancelledLeaves: number;
    totalLeaveDays: number;
    averageLeaveDuration: number;
  };
  leavesByType: { [key: string]: any };
  leavesByMonth: Array<{
    month: string;
    monthNumber: number;
    totalLeaves: number;
    approvedLeaves: number;
    pendingLeaves: number;
    rejectedLeaves: number;
    totalDays: number;
  }>;
  leavesByDepartment: { [key: string]: any };
  leavesByStatus: { [key: string]: number };
  topLeaveUsers: Array<{
    name: string;
    count: number;
    totalDays: number;
    department: string;
  }>;
  lopAnalytics: {
    totalLOPDays: number;
    usersWithLOP: number;
    avgLOPPerUser: number;
  };
  trends: {
    comparedToLastYear: {
      currentYear: number;
      lastYear: number;
      changePercent: string;
    };
  };
}

// Colors for charts
const CHART_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', 
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

// Chart components
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}> = ({ title, value, icon, color, change, changeType }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className={`text-sm mt-2 ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-10`}>
        {icon}
      </div>
    </div>
  </div>
);

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [departmentAnalytics, setDepartmentAnalytics] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'departments'>('overview');
  const [filters, setFilters] = useState<ReportFilters>({
    year: new Date().getFullYear(),
    department: 'all',
    leaveType: 'all',
    status: 'all',
  });

  useEffect(() => {
    // Check user role - allow both admin and manager
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      navigate('/dashboard');
      return;
    }

    let mounted = true;

    const fetchDepartments = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.getDepartments() as DepartmentResponse;

        if (!mounted) return;

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch departments');
        }

        setDepartments(response.data);
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Failed to load departments';
        setError(message);
        toast.error(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDepartments();

    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsResponse, trendsResponse, departmentResponse] = await Promise.all([
        api.getLeaveAnalytics({
          year: filters.year,
          department: filters.department !== 'all' ? filters.department : undefined,
        }),
        api.getLeavetrends({
          period: '12months',
          leaveType: filters.leaveType !== 'all' ? filters.leaveType : undefined,
        }),
        user?.role === 'admin' ? api.getDepartmentAnalytics({ year: filters.year }) : Promise.resolve({ success: true, departmentAnalytics: [] }),
      ]);

      if (analyticsResponse.success) {
        setAnalytics((analyticsResponse as any).analytics);
      }

      if (trendsResponse.success) {
        setTrends((trendsResponse as any).trends || []);
      }

      if (departmentResponse.success && user?.role === 'admin') {
        setDepartmentAnalytics((departmentResponse as any).departmentAnalytics || []);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load analytics';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [filters.year, filters.department, filters.leaveType, user?.role]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'manager')) {
      fetchAnalytics();
    }
  }, [user, fetchAnalytics]);

  const handleFilterChange = (filterName: keyof ReportFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Prepare export parameters
      const params: {
        year?: number;
        department?: string;
        leaveType?: string;
        status?: string;
      } = {
        year: filters.year
      };
      
      if (filters.department !== 'all') {
        params.department = filters.department;
      }
      
      if (filters.leaveType !== 'all') {
        params.leaveType = filters.leaveType;
      }
      
      if (filters.status !== 'all') {
        params.status = filters.status;
      }
      
      // Call the export API
      const blob = await api.exportReport(params);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `leave-report-${filters.year}.csv`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Report exported successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export report';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Data</h2>
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
        <h1 className="text-2xl font-bold text-gray-900">Leave Reports</h1>
        <p className="mt-1 text-sm text-gray-600">
          Generate and export leave reports
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Report Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                id="year"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                id="department"
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.name} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-1">
                Leave Type
              </label>
              <select
                id="leaveType"
                value={filters.leaveType}
                onChange={(e) => handleFilterChange('leaveType', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="vacation">Vacation Leave</option>
                <option value="academic">Academic Leave</option>
                <option value="compOff">Comp Off</option>
                <option value="lop">Loss of Pay</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Report Preview</h2>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <p>Select filters and click Export to download the report.</p>
          <p className="text-sm mt-2">The report will include leave data based on your selected filters.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports; 