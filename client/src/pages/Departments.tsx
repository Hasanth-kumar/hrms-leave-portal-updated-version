import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Department, ApiResponse } from '../types';
import toast from 'react-hot-toast';

interface DepartmentResponse extends ApiResponse<Department[]> {}

const Departments: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check user role
    if (!user || user.role !== 'admin') {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Departments</h2>
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
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and manage company departments
          </p>
        </div>
        <button
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => toast.success('Department creation feature coming soon!')}
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Department
        </button>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-2 text-sm font-medium text-gray-900">No departments found</h2>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new department.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <motion.div
              key={department.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 p-3 bg-blue-100 rounded-full">
                    <BuildingOfficeIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{department.name}</h3>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" aria-hidden="true" />
                    <span className="text-sm text-gray-500">
                      {department.employeeCount} Employees
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" aria-hidden="true" />
                    <span className="text-sm text-gray-500">
                      {department.totalLeavesThisYear} Leaves this year
                    </span>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => toast.success(`${department.name} details coming soon!`)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Departments; 