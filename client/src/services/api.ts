import axios from 'axios';
import { 
  ApiResponse, 
  Leave, 
  LeaveApplicationForm, 
  User, 
  SystemConfig, 
  LoginForm,
  LeaveBalance,
  LOPStatus,
  Holiday,
  DashboardStats,
  TeamMember,
  Department
} from '../types';

class ApiService {
  private api;

  constructor() {
    // Set the correct base URL based on the environment
    const baseURL = process.env.NODE_ENV === 'production' 
      ? '/api'
      : 'http://localhost:3000/api';
      
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // Important for CORS with credentials
    });

    // Add request interceptor to attach token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }, (error) => {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    });

    // Add response interceptor to handle errors globally
    this.api.interceptors.response.use(
      response => response,
      error => {
        console.error('API Error Details:', {
          message: error.message,
          status: error?.response?.status,
          data: error?.response?.data,
          url: error?.config?.url,
          method: error?.config?.method
        });
        
        // Handle 401 Unauthorized
        if (error?.response?.status === 401) {
          // Clear token and redirect to login
          localStorage.removeItem('token');
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(credentials: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await this.api.get('/auth/current-user');
    return response.data;
  }

  // Dashboard
  async getLeaveBalance(): Promise<ApiResponse<{ balance: LeaveBalance; carryForward: number }>> {
    const response = await this.api.get('/leaves/balance');
    return response.data;
  }

  async getLOPStatus(): Promise<ApiResponse<{ lopStatus: LOPStatus }>> {
    const response = await this.api.get('/leaves/lop-status');
    return response.data;
  }

  async getHolidays(): Promise<ApiResponse<Holiday[]>> {
    const response = await this.api.get('/leaves/holidays');
    return response.data;
  }

  // Leaves
  async getMyLeaves(): Promise<ApiResponse<Leave[]>> {
    const response = await this.api.get('/leaves/my-leaves');
    return response.data;
  }

  async getAllLeaves(): Promise<ApiResponse<Leave[]>> {
    const response = await this.api.get('/leaves/all');
    return response.data;
  }

  async getTeamLeaves(): Promise<ApiResponse<{
    leaves: Leave[];
    teamMembers: TeamMember[];
  }>> {
    const response = await this.api.get('/leaves/team');
    return response.data;
  }

  async applyLeave(data: LeaveApplicationForm): Promise<ApiResponse<Leave>> {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key !== 'documents') {
        formData.append(key, String(data[key as keyof LeaveApplicationForm]));
      }
    });
    
    if (data.documents && data.documents.length > 0) {
      data.documents.forEach(doc => {
        formData.append('documents', doc);
      });
    }
    
    // Corrected endpoint path to match server route (/leaves/apply)
    const response = await this.api.post('/leaves/apply', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async cancelLeave(leaveId: string, reason: string): Promise<ApiResponse<Leave>> {
    const response = await this.api.put(`/leaves/cancel/${leaveId}`, { reason });
    return response.data;
  }

  async updateLeaveStatus(data: {
    leaveId: string;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
  }): Promise<ApiResponse<Leave>> {
    const response = await this.api.put(`/leaves/update-status/${data.leaveId}`, { 
      status: data.status, 
      rejectionReason: data.rejectionReason 
    });
    return response.data;
  }

  // Team Management
  async getTeamMembers(): Promise<ApiResponse<{
    departments: string[];
    members: Record<string, TeamMember[]>;
  }>> {
    const response = await this.api.get('/team/members');
    return response.data;
  }

  // User Management
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    const response = await this.api.get('/admin/users');
    return response.data;
  }

  async createUser(userData: {
    name: string;
    email: string;
    role: 'employee' | 'manager' | 'admin';
    department: string;
    joinDate: string;
    employeeId: string;
    isIntern: boolean;
  }): Promise<ApiResponse<User>> {
    const response = await this.api.post('/admin/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: {
    name: string;
    email: string;
    role: 'employee' | 'manager' | 'admin';
    department: string;
    joinDate: string;
    employeeId: string;
    isIntern: boolean;
  }): Promise<ApiResponse<User>> {
    const response = await this.api.put(`/admin/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    const response = await this.api.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<User>> {
    const response = await this.api.patch(`/admin/users/${userId}/status`, { isActive });
    return response.data;
  }

  // Department Management
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    const response = await this.api.get('/admin/departments');
    return response.data;
  }

  // System Configuration
  async getSystemConfig(): Promise<ApiResponse<SystemConfig>> {
    const response = await this.api.get('/admin/settings');
    return response.data;
  }

  async updateSystemConfig(config: SystemConfig): Promise<ApiResponse<SystemConfig>> {
    const response = await this.api.put('/admin/settings', config);
    return response.data;
  }

  // Stats and Reports
  async getStats(params: {
    startDate: string;
    endDate: string;
    department?: string;
    leaveType?: string;
  }): Promise<ApiResponse<DashboardStats>> {
    const response = await this.api.get('/admin/leave-stats', { params });
    return response.data;
  }

  async exportReport(params: {
    year?: number;
    department?: string;
    leaveType?: string;
    status?: string;
  }): Promise<Blob> {
    const response = await this.api.get('/admin/reports/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }
}

export default new ApiService(); 