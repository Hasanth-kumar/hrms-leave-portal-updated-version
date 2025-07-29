import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { User, ApiResponse } from '../types';
import toast from 'react-hot-toast';

// Updated to match actual API response structure
interface UsersResponse {
  success: boolean;
  message?: string;
  users: User[];
}

interface UserFormData {
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  joinDate: string;
  employeeId: string;
  isIntern: boolean;
}

interface UserModalState {
  show: boolean;
  mode: 'create' | 'edit' | 'delete';
  user: User | null;
}

interface Filters {
  role: 'all' | 'employee' | 'manager' | 'admin';
  department: string;
  status: 'all' | 'active' | 'inactive';
  search: string;
}

const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    role: 'all',
    department: 'all',
    status: 'all',
    search: '',
  });
  const [modal, setModal] = useState<UserModalState>({
    show: false,
    mode: 'create',
    user: null,
  });
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'employee',
    department: '',
    joinDate: '',
    employeeId: '',
    isIntern: false,
  });
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});

  useEffect(() => {
    // Check user role - only admins can manage users
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [usersRes, deptRes] = await Promise.all([
          api.getAllUsers() as Promise<UsersResponse>,
          api.getDepartments(),
        ]);

        if (!mounted) return;

        if (!usersRes.success || !usersRes.users) {
          throw new Error(usersRes.message || 'Failed to fetch users');
        }

        if (!deptRes.success || !deptRes.data) {
          throw new Error(deptRes.message || 'Failed to fetch departments');
        }

        setUsers(usersRes.users);
        // Extract department names from the Department objects
        const departmentNames = deptRes.data.map(dept => dept.name);
        setDepartments(departmentNames);
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
  }, [currentUser, navigate]);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const applyFilters = () => {
    let filtered = [...users];

    // Role filter
    if (filters.role !== 'all') {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Department filter
    if (filters.department !== 'all') {
      filtered = filtered.filter(user => user.department === filters.department);
    }

    // Status filter
    if (filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        user.employeeId?.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleFilterChange = (filterName: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const openModal = (mode: 'create' | 'edit' | 'delete', user?: User) => {
    setModal({ show: true, mode, user: user || null });
    
    if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        role: 'employee',
        department: '',
        joinDate: '',
        employeeId: '',
        isIntern: false,
      });
    } else if (mode === 'edit' && user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        joinDate: user.joinDate || '',
        employeeId: user.employeeId || '',
        isIntern: user.isIntern || false,
      });
    }
    setFormErrors({});
  };

  const closeModal = () => {
    setModal({ show: false, mode: 'create', user: null });
    setFormData({
      name: '',
      email: '',
      role: 'employee',
      department: '',
      joinDate: '',
      employeeId: '',
      isIntern: false,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<UserFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    if (!formData.department.trim()) {
      errors.department = 'Department is required';
    }

    if (!formData.employeeId.trim()) {
      errors.employeeId = 'Employee ID is required';
    }

    if (!formData.joinDate) {
      errors.joinDate = 'Join date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      let response: ApiResponse<User>;

      if (modal.mode === 'create') {
        response = await api.createUser(formData) as ApiResponse<User>;
      } else if (modal.mode === 'edit' && modal.user) {
        response = await api.updateUser(modal.user.id, formData) as ApiResponse<User>;
      } else {
        return;
      }

      if (response.success && response.data) {
        toast.success(`User ${modal.mode === 'create' ? 'created' : 'updated'} successfully`);
        
        if (modal.mode === 'create') {
          setUsers(prev => [...prev, response.data!]);
        } else {
          setUsers(prev =>
            prev.map(user =>
              user.id === modal.user?.id ? response.data! : user
            )
          );
        }

        closeModal();
      } else {
        throw new Error(response.message || `Failed to ${modal.mode} user`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `Failed to ${modal.mode} user`;
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modal.user) return;

    try {
      setSaving(true);

      const response = await api.deleteUser(modal.user.id) as ApiResponse<void>;

      if (response.success) {
        toast.success('User deleted successfully');
        setUsers(prev => prev.filter(user => user.id !== modal.user?.id));
        closeModal();
      } else {
        throw new Error(response.message || 'Failed to delete user');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await api.toggleUserStatus(userId, isActive) as ApiResponse<User>;

      if (response.success && response.data) {
        toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
        setUsers(prev =>
          prev.map(user =>
            user.id === userId ? response.data! : user
          )
        );
      } else {
        throw new Error(response.message || 'Failed to update user status');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update user status';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading users">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" role="alert">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
        <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Users</h2>
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
      <div className="flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Users</h1>
      <p className="mt-1 text-sm text-gray-600">
        Manage users and their permissions
      </p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Add new user"
        >
          <PlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <div className="flex flex-wrap gap-4">
            <select
              id="role-filter"
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              aria-label="Filter by role"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>

            <select
              id="department-filter"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              aria-label="Filter by department"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>

            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                aria-label="Search users"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12" role="status">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
            <h2 className="mt-2 text-sm font-medium text-gray-900">No users found</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.role !== 'all' || filters.department !== 'all' || filters.status !== 'all'
                ? 'Try adjusting your filters.'
                : 'Get started by adding a new user.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                    role="row"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <UserIcon className="h-10 w-10 text-gray-400" aria-hidden="true" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                            {user.isIntern && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Intern
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.department || 'No Department'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.employeeId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(user.id, !user.isActive)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        aria-label={`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal('edit', user)}
                          className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          aria-label={`Edit ${user.name}`}
                        >
                          <PencilIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => openModal('delete', user)}
                            className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            aria-label={`Delete ${user.name}`}
                          >
                            <TrashIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal.show && (
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-labelledby="modal-title"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              {modal.mode === 'delete' ? (
                <>
                  <h2 id="modal-title" className="text-lg font-medium text-gray-900 mb-4">
                    Delete User
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete {modal.user?.name}? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {saving ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 id="modal-title" className="text-lg font-medium text-gray-900 mb-4">
                    {modal.mode === 'create' ? 'Add New User' : 'Edit User'}
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          formErrors.name ? 'border-red-300' : ''
                        }`}
                        required
                        aria-invalid={!!formErrors.name}
                        aria-describedby={formErrors.name ? 'name-error' : undefined}
                      />
                      {formErrors.name && (
                        <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          formErrors.email ? 'border-red-300' : ''
                        }`}
                        required
                        aria-invalid={!!formErrors.email}
                        aria-describedby={formErrors.email ? 'email-error' : undefined}
                      />
                      {formErrors.email && (
                        <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Role *
                      </label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'employee' | 'manager' | 'admin' }))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                        Department *
                      </label>
                      <input
                        type="text"
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          formErrors.department ? 'border-red-300' : ''
                        }`}
                        required
                        aria-invalid={!!formErrors.department}
                        aria-describedby={formErrors.department ? 'department-error' : undefined}
                      />
                      {formErrors.department && (
                        <p id="department-error" className="mt-1 text-sm text-red-600" role="alert">
                          {formErrors.department}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700">
                        Employee ID *
                      </label>
                      <input
                        type="text"
                        id="employeeId"
                        value={formData.employeeId}
                        onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          formErrors.employeeId ? 'border-red-300' : ''
                        }`}
                        required
                        aria-invalid={!!formErrors.employeeId}
                        aria-describedby={formErrors.employeeId ? 'employeeId-error' : undefined}
                      />
                      {formErrors.employeeId && (
                        <p id="employeeId-error" className="mt-1 text-sm text-red-600" role="alert">
                          {formErrors.employeeId}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="joinDate" className="block text-sm font-medium text-gray-700">
                        Join Date *
                      </label>
                      <input
                        type="date"
                        id="joinDate"
                        value={formData.joinDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, joinDate: e.target.value }))}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                          formErrors.joinDate ? 'border-red-300' : ''
                        }`}
                        required
                        aria-invalid={!!formErrors.joinDate}
                        aria-describedby={formErrors.joinDate ? 'joinDate-error' : undefined}
                      />
                      {formErrors.joinDate && (
                        <p id="joinDate-error" className="mt-1 text-sm text-red-600" role="alert">
                          {formErrors.joinDate}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isIntern"
                        checked={formData.isIntern}
                        onChange={(e) => setFormData(prev => ({ ...prev, isIntern: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isIntern" className="ml-2 block text-sm text-gray-900">
                        Is Intern
                      </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : modal.mode === 'create' ? 'Create' : 'Update'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users; 