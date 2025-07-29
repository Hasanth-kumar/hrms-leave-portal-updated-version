import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { format, addDays, isWeekend, parseISO } from 'date-fns';
import {
  CalendarIcon,
  DocumentIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { LeaveType, LeaveApplicationForm, ApiResponse } from '../types';
import { getLeaveTypeLabel, formatFileSize, getAdvanceNoticeDays, calculateWorkingDays } from '../utils';
import toast from 'react-hot-toast';

interface LeaveResponse extends ApiResponse<{ message: string }> {}

// Consolidated state interface
interface ApplyLeaveState {
  formData: LeaveApplicationForm;
  loading: boolean;
  workingDays: number;
  error: string | null;
  retryCount: number;
  uploadProgress: { [key: string]: number };
  errors: Partial<Record<keyof LeaveApplicationForm, string>>;
}

// Memoized leave types
const LEAVE_TYPES: LeaveType[] = ['sick', 'casual', 'vacation', 'academic', 'compOff'];

// Memoized FormField component
const FormField: React.FC<{
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = React.memo(({ label, error, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="mt-1">
      {children}
    </div>
    {error && (
      <p className="mt-1 text-sm text-red-600" role="alert">{error}</p>
    )}
  </div>
));

FormField.displayName = 'FormField';

// Memoized FileUploadItem component
const FileUploadItem: React.FC<{
  file: File;
  index: number;
  onRemove: (index: number) => void;
  progress?: number;
}> = React.memo(({ file, index, onRemove, progress }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" role="listitem">
    <div className="flex items-center space-x-3">
      <DocumentIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{file.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        {typeof progress === 'number' && progress < 100 && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="text-red-500 hover:text-red-700 transition-colors"
      aria-label={`Remove ${file.name}`}
    >
      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
    </button>
  </div>
));

FileUploadItem.displayName = 'FileUploadItem';

// Memoized WorkingDaysDisplay component
const WorkingDaysDisplay: React.FC<{ days: number }> = React.memo(({ days }) => {
  if (days <= 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 p-3 bg-blue-50 rounded-md"
    >
      <div className="flex">
        <InformationCircleIcon className="h-5 w-5 text-blue-400" />
        <p className="ml-2 text-sm text-blue-700">
          This leave will consume <strong>{days}</strong> working day(s) from your balance
        </p>
      </div>
    </motion.div>
  );
});

WorkingDaysDisplay.displayName = 'WorkingDaysDisplay';

const ApplyLeave: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Consolidated state management
  const [state, setState] = useState<ApplyLeaveState>({
    formData: {
      leaveType: 'casual',
      startDate: '',
      endDate: '',
      reason: '',
      isHalfDay: false,
      documents: [],
    },
    loading: false,
    workingDays: 0,
    error: null,
    retryCount: 0,
    uploadProgress: {},
    errors: {},
  });

  // Redirect if user is not logged in
  useEffect(() => {
    if (!user) {
      console.debug('User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Memoized working days calculation
  const workingDaysCalculation = useMemo(() => {
    if (!state.formData.startDate || !state.formData.endDate) return 0;
    
    try {
      const start = new Date(state.formData.startDate);
      const end = new Date(state.formData.endDate);
      if (start <= end) {
        const days = calculateWorkingDays(start, end);
        const result = state.formData.isHalfDay ? days - 0.5 : days;
        console.debug(`Calculated working days: ${result} (isHalfDay: ${state.formData.isHalfDay})`);
        return result;
      }
    } catch (error) {
      console.warn('Error calculating working days:', error);
    }
    return 0;
  }, [state.formData.startDate, state.formData.endDate, state.formData.isHalfDay]);

  // Update working days when calculation changes
  useEffect(() => {
    setState(prev => ({ ...prev, workingDays: workingDaysCalculation }));
  }, [workingDaysCalculation]);

  // Memoized validation function
  const validate = useCallback((): boolean => {
    console.debug('Validating form data', state.formData);
    const newErrors: Partial<Record<keyof LeaveApplicationForm, string>> = {};

    if (!state.formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      try {
        const startDate = parseISO(state.formData.startDate);
        if (isWeekend(startDate)) {
          newErrors.startDate = 'Start date cannot be a weekend';
        }
      } catch (error) {
        newErrors.startDate = 'Invalid start date';
      }
    }

    if (!state.formData.endDate) {
      newErrors.endDate = 'End date is required';
    } else {
      try {
        const endDate = parseISO(state.formData.endDate);
        if (isWeekend(endDate)) {
          newErrors.endDate = 'End date cannot be a weekend';
        }
      } catch (error) {
        newErrors.endDate = 'Invalid end date';
      }
    }

    if (state.formData.startDate && state.formData.endDate) {
      try {
        const start = new Date(state.formData.startDate);
        const end = new Date(state.formData.endDate);
        if (start > end) {
          newErrors.endDate = 'End date must be after start date';
        }
      } catch (error) {
        console.warn('Error validating date range:', error);
      }
    }

    if (!state.formData.reason || state.formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }

    if (state.formData.leaveType === 'academic') {
      if (state.formData.reason.trim().length < 50) {
        newErrors.reason = 'Academic leave requires a detailed reason (minimum 50 characters)';
      }
      if (!state.formData.documents || state.formData.documents.length === 0) {
        newErrors.documents = 'Academic leave requires supporting documents';
      }
    }

    // Check advance notice
    const advanceDays = getAdvanceNoticeDays(state.formData.leaveType);
    if (advanceDays > 0 && state.formData.startDate) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(state.formData.startDate);
        const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < advanceDays) {
          newErrors.startDate = `${getLeaveTypeLabel(state.formData.leaveType)} requires ${advanceDays} days advance notice`;
        }
      } catch (error) {
        console.warn('Error checking advance notice:', error);
      }
    }

    setState(prev => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [state.formData]);

  // Enhanced file upload with progress
  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.debug(`Uploading ${acceptedFiles.length} files`);
    
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        documents: [...(prev.formData.documents || []), ...acceptedFiles],
      },
      errors: { ...prev.errors, documents: '' }, // Clear document error
    }));

    // Simulate upload progress
    acceptedFiles.forEach((file, index) => {
      const fileKey = `${file.name}_${Date.now()}_${index}`;
      setState(prev => ({
        ...prev,
        uploadProgress: { ...prev.uploadProgress, [fileKey]: 0 }
      }));

      // Simulate progressive upload
      const progressInterval = setInterval(() => {
        setState(prev => {
          const currentProgress = prev.uploadProgress[fileKey] || 0;
          if (currentProgress >= 100) {
            clearInterval(progressInterval);
            const { [fileKey]: removed, ...rest } = prev.uploadProgress;
            return { ...prev, uploadProgress: rest };
          }
          return {
            ...prev,
            uploadProgress: {
              ...prev.uploadProgress,
              [fileKey]: Math.min(currentProgress + Math.random() * 30, 100)
            }
          };
        });
      }, 200);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 5242880, // 5MB
    disabled: state.formData.leaveType !== 'academic',
  });

  // Memoized remove document handler
  const removeDocument = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        documents: prev.formData.documents?.filter((_, i) => i !== index),
      },
    }));
    console.debug(`Removed document at index ${index}`);
  }, []);

  // Memoized form change handler
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: type === 'checkbox' ? checked : value,
      },
      errors: { ...prev.errors, [name]: '' }, // Clear error when user starts typing
    }));
  }, []);

  // Enhanced form submission with retry mechanism
  const handleSubmit = useCallback(async (e: React.FormEvent, retryAttempt = 0) => {
    e.preventDefault();
    console.debug(`Submitting leave application (attempt ${retryAttempt + 1})`, state.formData);
    
    if (!validate()) return;

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        retryCount: retryAttempt,
      }));

      const response = await api.applyLeave(state.formData);
      
      if (response.success) {
        console.debug('Leave application submitted successfully');
        toast.success('Leave application submitted successfully!');
        navigate('/leaves');
      } else {
        throw new Error(response.message || 'Failed to submit leave application');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit leave application';
      console.error('Error submitting leave application:', error);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
      
      toast.error(message);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [state.formData, validate, navigate]);

  // Retry mechanism with exponential backoff
  const handleRetry = useCallback(() => {
    const maxRetries = 3;
    if (state.retryCount < maxRetries) {
      const delay = Math.pow(2, state.retryCount) * 1000;
      console.debug(`Retrying submission in ${delay}ms (attempt ${state.retryCount + 1})`);
      
      setTimeout(() => {
        handleSubmit(new Event('submit') as any, state.retryCount + 1);
      }, delay);
    } else {
      toast.error('Maximum retry attempts reached. Please try again later.');
    }
  }, [handleSubmit, state.retryCount]);

  // Memoized leave type options
  const leaveTypeOptions = useMemo(() => 
    LEAVE_TYPES.map(type => ({
      value: type,
      label: getLeaveTypeLabel(type),
    })), []
  );

  // Memoized error state render
  const renderErrorState = useMemo(() => {
    if (!state.error) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
        role="alert"
      >
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Submission Failed</h3>
            <p className="mt-1 text-sm text-red-700">{state.error}</p>
            <div className="mt-4 space-x-4">
              <button
                onClick={handleRetry}
                disabled={state.retryCount >= 3}
                className="text-sm text-red-600 hover:text-red-500 disabled:text-gray-400"
              >
                {state.retryCount >= 3 ? 'Max retries reached' : 'Try again'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [state.error, state.retryCount, handleRetry]);

  // Check if form is valid
  const isFormValid = useMemo(() => {
    return state.formData.startDate && 
           state.formData.endDate && 
           state.formData.reason.trim().length >= 10 &&
           (state.formData.leaveType !== 'academic' || 
            (state.formData.documents && state.formData.documents.length > 0)) &&
           Object.keys(state.errors).every(key => !state.errors[key as keyof typeof state.errors]);
  }, [state.formData, state.errors]);

  if (!user) {
    return null; // Early return while redirecting
  }

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apply for Leave</h1>
          <p className="mt-1 text-sm text-gray-600">
            Submit your leave application with all required details
          </p>
        </div>

        {renderErrorState}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Details</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Leave Type */}
              <FormField label="Leave Type" error={state.errors.leaveType} required>
                <select
                  name="leaveType"
                  value={state.formData.leaveType}
                  onChange={handleChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {leaveTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Half Day Option */}
              <div className="flex items-center">
                <input
                  id="isHalfDay"
                  name="isHalfDay"
                  type="checkbox"
                  checked={state.formData.isHalfDay}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isHalfDay" className="ml-2 block text-sm text-gray-900">
                  Half Day Leave
                </label>
              </div>

              {/* Start Date */}
              <FormField label="Start Date" error={state.errors.startDate} required>
                <div className="relative">
                  <input
                    type="date"
                    name="startDate"
                    value={state.formData.startDate}
                    onChange={handleChange}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      state.errors.startDate ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-blue-500 focus:border-blue-500`}
                  />
                  <CalendarIcon className="absolute right-3 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </FormField>

              {/* End Date */}
              <FormField label="End Date" error={state.errors.endDate} required>
                <div className="relative">
                  <input
                    type="date"
                    name="endDate"
                    value={state.formData.endDate}
                    onChange={handleChange}
                    min={state.formData.startDate || format(new Date(), 'yyyy-MM-dd')}
                    className={`block w-full rounded-md shadow-sm sm:text-sm ${
                      state.errors.endDate ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-blue-500 focus:border-blue-500`}
                  />
                  <CalendarIcon className="absolute right-3 top-2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </FormField>
            </div>

            {/* Working Days Display */}
            <WorkingDaysDisplay days={state.workingDays} />

            {/* Reason */}
            <div className="mt-6">
              <FormField label="Reason for Leave" error={state.errors.reason} required>
                <textarea
                  name="reason"
                  rows={4}
                  value={state.formData.reason}
                  onChange={handleChange}
                  placeholder={
                    state.formData.leaveType === 'academic' 
                      ? 'Please provide detailed reason (minimum 50 characters)' 
                      : 'Please provide reason for your leave request'
                  }
                  className={`block w-full rounded-md shadow-sm sm:text-sm ${
                    state.errors.reason ? 'border-red-300' : 'border-gray-300'
                  } focus:ring-blue-500 focus:border-blue-500`}
                />
              </FormField>
            </div>

            {/* Document Upload for Academic Leave */}
            {state.formData.leaveType === 'academic' && (
              <div className="mt-6">
                <FormField 
                  label="Supporting Documents" 
                  error={state.errors.documents} 
                  required
                >
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                    } ${state.errors.documents ? 'border-red-300' : ''}`}
                    role="button"
                    aria-label="Upload documents"
                    tabIndex={0}
                  >
                    <input {...getInputProps()} aria-label="File upload input" />
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                    <p className="mt-2 text-sm text-gray-600">
                      {isDragActive
                        ? 'Drop the files here...'
                        : 'Drag & drop files here, or click to select'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, PNG, JPG, DOC, DOCX up to 5MB
                    </p>
                  </div>
                </FormField>

                {/* Uploaded Files List */}
                {state.formData.documents && state.formData.documents.length > 0 && (
                  <div className="mt-4 space-y-2" role="list" aria-label="Uploaded documents">
                    {state.formData.documents.map((file, index) => (
                      <FileUploadItem
                        key={`${file.name}_${index}`}
                        file={file}
                        index={index}
                        onRemove={removeDocument}
                        progress={state.uploadProgress[`${file.name}_${Date.now()}_${index}`]}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={state.loading || !isFormValid}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${
                state.loading || !isFormValid
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              aria-disabled={state.loading || !isFormValid}
            >
              {state.loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default ApplyLeave; 