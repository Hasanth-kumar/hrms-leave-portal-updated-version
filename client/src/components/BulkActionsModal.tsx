import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'approve' | 'reject';
  selectedCount: number;
  onConfirm: (reason?: string) => void;
  loading: boolean;
}

const BulkActionsModal: React.FC<BulkActionsModalProps> = ({
  isOpen,
  onClose,
  action,
  selectedCount,
  onConfirm,
  loading,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (action === 'reject' && reason.trim().length < 10) {
      setError('Rejection reason must be at least 10 characters long');
      return;
    }
    
    setError('');
    onConfirm(action === 'reject' ? reason : undefined);
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError('');
      onClose();
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {action === 'approve' ? (
                      <HandThumbUpIcon className="h-6 w-6 text-green-600 mr-2" />
                    ) : (
                      <HandThumbDownIcon className="h-6 w-6 text-red-600 mr-2" />
                    )}
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Bulk {action === 'approve' ? 'Approve' : 'Reject'} Leaves
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={handleClose}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                    <p className="text-sm text-yellow-800">
                      You are about to {action} {selectedCount} leave{selectedCount > 1 ? 's' : ''}. 
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {action === 'reject' && (
                    <div className="mb-4">
                      <label
                        htmlFor="reason"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Rejection Reason *
                      </label>
                      <textarea
                        id="reason"
                        rows={4}
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          setError('');
                        }}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Please provide a clear reason for rejection..."
                        disabled={loading}
                        required
                      />
                      {error && (
                        <p className="mt-1 text-sm text-red-600">{error}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Minimum 10 characters required
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || (action === 'reject' && reason.trim().length < 10)}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        action === 'approve'
                          ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                          : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : (
                        `${action === 'approve' ? 'Approve' : 'Reject'} ${selectedCount} Leave${selectedCount > 1 ? 's' : ''}`
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BulkActionsModal;

