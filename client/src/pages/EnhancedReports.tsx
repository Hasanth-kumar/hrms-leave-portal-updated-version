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

const EnhancedReports: React.FC = () => {
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

  if (error && !analytics) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Data</h2>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  // Prepare chart data
  const monthlyChartData = analytics?.leavesByMonth || [];
  const leaveTypeChartData = analytics ? Object.entries(analytics.leavesByType).map(([type, data]: [string, any]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    count: data.count,
    days: data.totalDays,
  })) : [];
  const statusChartData = analytics ? Object.entries(analytics.leavesByStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
  })) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leave Reports & Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Comprehensive leave analytics and reporting dashboard
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Filters & Export</h2>
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
            
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'trends', name: 'Trends', icon: ArrowTrendingUpIcon },
              ...(user?.role === 'admin' ? [{ id: 'departments', name: 'Departments', icon: BuildingOfficeIcon }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading analytics...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Data</h2>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="mt-4 text-sm text-blue-600 hover:text-blue-500"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && analytics && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                      title="Total Leaves"
                      value={analytics.summary.totalLeaves}
                      icon={<CalendarDaysIcon className="h-6 w-6 text-blue-600" />}
                      color="text-blue-600"
                      change={analytics.trends.comparedToLastYear.changePercent ? `${analytics.trends.comparedToLastYear.changePercent}% vs last year` : undefined}
                      changeType={parseFloat(analytics.trends.comparedToLastYear.changePercent) > 0 ? 'positive' : 'negative'}
                    />
                    <StatCard
                      title="Approved Leaves"
                      value={analytics.summary.approvedLeaves}
                      icon={<UserGroupIcon className="h-6 w-6 text-green-600" />}
                      color="text-green-600"
                    />
                    <StatCard
                      title="Pending Approval"
                      value={analytics.summary.pendingLeaves}
                      icon={<ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />}
                      color="text-yellow-600"
                    />
                    <StatCard
                      title="Avg Leave Duration"
                      value={`${analytics.summary.averageLeaveDuration} days`}
                      icon={<ChartBarIcon className="h-6 w-6 text-purple-600" />}
                      color="text-purple-600"
                    />
                  </div>

                  {/* Charts Row 1 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Trends */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Leave Trends</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={monthlyChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="totalLeaves"
                            stackId="1"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.6}
                            name="Total Leaves"
                          />
                          <Area
                            type="monotone"
                            dataKey="approvedLeaves"
                            stackId="2"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.6}
                            name="Approved"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Leave Types Distribution */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Status Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Charts Row 2 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Leave Types by Count */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Types by Count</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={leaveTypeChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="count" fill="#3b82f6" name="Count" />
                          <Bar dataKey="days" fill="#10b981" name="Total Days" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Top Leave Users */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Top Leave Users</h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {analytics.topLeaveUsers.slice(0, 10).map((user, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.department}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{user.totalDays} days</p>
                              <p className="text-sm text-gray-500">{user.count} leaves</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* LOP Analytics */}
                  {analytics.lopAnalytics.totalLOPDays > 0 && (
                    <div className="bg-red-50 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-red-900 mb-4">Loss of Pay (LOP) Analytics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{analytics.lopAnalytics.totalLOPDays}</p>
                          <p className="text-sm text-red-700">Total LOP Days</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{analytics.lopAnalytics.usersWithLOP}</p>
                          <p className="text-sm text-red-700">Users with LOP</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{analytics.lopAnalytics.avgLOPPerUser}</p>
                          <p className="text-sm text-red-700">Avg LOP per User</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Trends Over Time</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="_id.month" 
                          tickFormatter={(value) => `${value}/${trends[0]?._id?.year || new Date().getFullYear()}`}
                        />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="totalLeaves" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Total Leaves"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="approvedLeaves" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Approved"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="pendingLeaves" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          name="Pending"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rejectedLeaves" 
                          stroke="#ef4444" 
                          strokeWidth={2}
                          name="Rejected"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Department Analytics Tab */}
              {activeTab === 'departments' && user?.role === 'admin' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Department-wise Analytics</h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={departmentAnalytics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="totalLeaves" fill="#3b82f6" name="Total Leaves" />
                        <Bar dataKey="avgLeavesPerEmployee" fill="#10b981" name="Avg per Employee" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Department Table */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900">Department Summary</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Leaves</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg per Employee</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {departmentAnalytics.map((dept, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{dept.department}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">{dept.totalEmployees}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">{dept.totalLeaves}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">{dept.approvedLeaves}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">{dept.avgLeavesPerEmployee}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedReports;
