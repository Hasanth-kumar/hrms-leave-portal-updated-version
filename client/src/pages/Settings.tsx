import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CogIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { SystemConfig, ApiResponse } from '../types';
import toast from 'react-hot-toast';

interface ConfigResponse extends ApiResponse<SystemConfig> {}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    // Check user role
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    let mounted = true;

    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getSystemConfig() as ConfigResponse;

        if (!mounted) return;

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Failed to fetch system configuration');
        }

        setConfig(response.data);
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Failed to load configuration';
        setError(message);
        toast.error(message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchConfig();

    return () => {
      mounted = false;
    };
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setSaving(true);
      const response = await api.updateSystemConfig(config) as ConfigResponse;

      if (!response.success) {
        throw new Error(response.message || 'Failed to update configuration');
      }

      setConfig(response.data || config);
      toast.success('Settings updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update settings';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section: keyof SystemConfig, key: string, value: any) => {
    if (!config) return;

    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading settings">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" role="alert">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
        <h2 className="mt-2 text-sm font-medium text-gray-900">Error Loading Settings</h2>
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

  if (!config) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure system-wide settings and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Quotas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white shadow-sm rounded-lg border border-gray-200 p-6"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Quotas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regular Employees */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Regular Employees</h3>
              <div className="space-y-4">
                {Object.entries(config.leaveQuotas.regular).map(([key, value]) => (
                  <div key={key}>
                    <label htmlFor={`regular-${key}`} className="block text-sm font-medium text-gray-700">
                      {key.charAt(0).toUpperCase() + key.slice(1)} Leave
                    </label>
                    <input
                      type="number"
                      id={`regular-${key}`}
                      value={value}
                      onChange={(e) => handleChange('leaveQuotas', `regular.${key}`, parseInt(e.target.value))}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Interns */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Interns</h3>
              <div className="space-y-4">
                {Object.entries(config.leaveQuotas.intern).map(([key, value]) => (
                  <div key={key}>
                    <label htmlFor={`intern-${key}`} className="block text-sm font-medium text-gray-700">
                      {key.charAt(0).toUpperCase() + key.slice(1)} Leave
                    </label>
                    <input
                      type="number"
                      id={`intern-${key}`}
                      value={value}
                      onChange={(e) => handleChange('leaveQuotas', `intern.${key}`, parseInt(e.target.value))}
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white shadow-sm rounded-lg border border-gray-200 p-6"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-4">General Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="maxLOPDays" className="block text-sm font-medium text-gray-700">
                Maximum LOP Days (Yearly)
              </label>
              <input
                type="number"
                id="maxLOPDays"
                value={config.systemSettings.maxLOPDays}
                onChange={(e) => handleChange('systemSettings', 'maxLOPDays', parseInt(e.target.value))}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="maxLOPDaysPerMonth" className="block text-sm font-medium text-gray-700">
                Maximum LOP Days (Monthly)
              </label>
              <input
                type="number"
                id="maxLOPDaysPerMonth"
                value={config.systemSettings.maxLOPDaysPerMonth}
                onChange={(e) => handleChange('systemSettings', 'maxLOPDaysPerMonth', parseInt(e.target.value))}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="carryForwardCap" className="block text-sm font-medium text-gray-700">
                Carry Forward Cap
              </label>
              <input
                type="number"
                id="carryForwardCap"
                value={config.systemSettings.carryForwardCap}
                onChange={(e) => handleChange('systemSettings', 'carryForwardCap', parseInt(e.target.value))}
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="hrEmail" className="block text-sm font-medium text-gray-700">
                HR Email Address
              </label>
              <input
                type="email"
                id="hrEmail"
                value={config.systemSettings.hrEmail}
                onChange={(e) => handleChange('systemSettings', 'hrEmail', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </motion.div>

        {/* LOP Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white shadow-sm rounded-lg border border-gray-200 p-6"
        >
          <h2 className="text-lg font-medium text-gray-900 mb-4">LOP Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoConvertNegativeBalance"
                checked={config.systemSettings.lopSettings.autoConvertNegativeBalance}
                onChange={(e) => handleChange('systemSettings', 'lopSettings.autoConvertNegativeBalance', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoConvertNegativeBalance" className="ml-2 block text-sm text-gray-900">
                Auto-convert negative balance to LOP
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allowLOPCarryForward"
                checked={config.systemSettings.lopSettings.allowLOPCarryForward}
                onChange={(e) => handleChange('systemSettings', 'lopSettings.allowLOPCarryForward', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="allowLOPCarryForward" className="ml-2 block text-sm text-gray-900">
                Allow LOP carry forward
              </label>
            </div>

            <div>
              <label htmlFor="lopResetPeriod" className="block text-sm font-medium text-gray-700">
                LOP Reset Period
              </label>
              <select
                id="lopResetPeriod"
                value={config.systemSettings.lopSettings.lopResetPeriod}
                onChange={(e) => handleChange('systemSettings', 'lopSettings.lopResetPeriod', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              saving
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {saving ? (
              <>
                <CogIcon className="animate-spin -ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings; 