import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths, 
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns';
import { Leave } from '../types';
import { getLeaveTypeColor, getLeaveTypeLabel } from '../utils';

interface LeaveCalendarProps {
  leaves: Leave[];
  loading: boolean;
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  leaves: Leave[];
}

interface LeaveEvent {
  leave: Leave;
  type: 'start' | 'middle' | 'end' | 'single';
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({
  leaves,
  loading,
  onDateClick,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    // Get the first day of the week for the month (start from Sunday)
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - monthStart.getDay());
    
    // Get the last day of the week for the month
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - monthEnd.getDay()));
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(date => {
      const dayLeaves = leaves.filter(leave => {
        const leaveStart = startOfDay(parseISO(leave.startDate));
        const leaveEnd = endOfDay(parseISO(leave.endDate));
        const currentDay = startOfDay(date);
        
        return isWithinInterval(currentDay, { start: leaveStart, end: leaveEnd });
      });

      return {
        date,
        isCurrentMonth: isSameMonth(date, currentMonth),
        isToday: isToday(date),
        leaves: dayLeaves,
      };
    });
  }, [currentMonth, leaves]);

  // Get leave events for each day (to show leave spans)
  const getLeaveEvents = (day: CalendarDay): LeaveEvent[] => {
    return day.leaves.map(leave => {
      const leaveStart = startOfDay(parseISO(leave.startDate));
      const leaveEnd = startOfDay(parseISO(leave.endDate));
      const currentDay = startOfDay(day.date);

      let type: 'start' | 'middle' | 'end' | 'single' = 'middle';
      
      if (isSameDay(leaveStart, leaveEnd)) {
        type = 'single';
      } else if (isSameDay(currentDay, leaveStart)) {
        type = 'start';
      } else if (isSameDay(currentDay, leaveEnd)) {
        type = 'end';
      } else {
        type = 'middle';
      }

      return { leave, type };
    });
  };

  const handleDayClick = (day: CalendarDay) => {
    if (onDateClick) {
      onDateClick(day.date);
    }
    
    if (day.leaves.length === 1) {
      setSelectedLeave(day.leaves[0]);
    } else if (day.leaves.length > 1) {
      // Show a popup or dropdown for multiple leaves
      setSelectedLeave(day.leaves[0]); // For now, show the first one
    }
  };

  const LeaveTooltip = ({ leave }: { leave: Leave }) => {
    const employee = typeof leave.userId === 'string' ? null : leave.userId;
    
    return (
      <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-64 transform -translate-x-1/2 left-1/2 top-full mt-2">
        <div className="flex items-center space-x-3 mb-2">
          <UserIcon className="h-5 w-5 text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">{employee?.name || 'Unknown'}</p>
            <p className="text-sm text-gray-500">{employee?.department || 'No Department'}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Type:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeaveTypeColor(leave.leaveType)}`}>
              {getLeaveTypeLabel(leave.leaveType)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Duration:</span>
            <span className="text-sm font-medium text-gray-900">
              {format(parseISO(leave.startDate), 'MMM d')} - {format(parseISO(leave.endDate), 'MMM d')}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Days:</span>
            <span className="text-sm font-medium text-gray-900">{leave.workingDays} days</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              leave.status === 'approved' ? 'bg-green-100 text-green-800' :
              leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
            </span>
          </div>
          
          {leave.reason && (
            <div>
              <span className="text-sm text-gray-600">Reason:</span>
              <p className="text-sm text-gray-900 mt-1">{leave.reason}</p>
            </div>
          )}
        </div>
        
        {/* Tooltip arrow */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white"></div>
        </div>
      </div>
    );
  };

  const renderLeaveBar = (event: LeaveEvent, index: number) => {
    const { leave, type } = event;
    const baseColor = getLeaveTypeColor(leave.leaveType).replace('bg-', '').replace('-100', '');
    
    let barClass = `h-1.5 text-xs text-white flex items-center justify-center relative`;
    
    switch (type) {
      case 'single':
        barClass += ` bg-${baseColor}-500 rounded-full`;
        break;
      case 'start':
        barClass += ` bg-${baseColor}-500 rounded-l-full`;
        break;
      case 'end':
        barClass += ` bg-${baseColor}-500 rounded-r-full`;
        break;
      case 'middle':
        barClass += ` bg-${baseColor}-500`;
        break;
    }

    return (
      <div
        key={`${leave._id}-${index}`}
        className={barClass}
        style={{ 
          marginBottom: '1px',
          backgroundColor: 
            leave.leaveType === 'sick' ? '#ef4444' :
            leave.leaveType === 'casual' ? '#3b82f6' :
            leave.leaveType === 'vacation' ? '#10b981' :
            leave.leaveType === 'academic' ? '#8b5cf6' :
            leave.leaveType === 'compOff' ? '#f59e0b' :
            leave.leaveType === 'lop' ? '#6b7280' :
            '#6366f1'
        }}
        title={`${(typeof leave.userId === 'object' ? leave.userId?.name : 'Unknown')} - ${getLeaveTypeLabel(leave.leaveType)}`}
      >
        {type === 'start' || type === 'single' ? (
          <span className="text-xs font-medium truncate px-1">
            {typeof leave.userId === 'object' ? leave.userId?.name?.split(' ')[0] : 'Unknown'}
          </span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            Today
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 relative">
        {calendarDays.map((day, dayIndex) => {
          const leaveEvents = getLeaveEvents(day);
          const isSelected = selectedDate && isSameDay(day.date, selectedDate);
          
          return (
            <div
              key={dayIndex}
              className={`relative min-h-24 p-2 border-r border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''} ${
                day.isToday ? 'bg-blue-100' : ''
              }`}
              onClick={() => handleDayClick(day)}
            >
              {/* Date number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${
                  day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {format(day.date, 'd')}
                </span>
                {day.leaves.length > 0 && (
                  <span className="flex items-center text-xs text-gray-500">
                    <UserIcon className="h-3 w-3 mr-1" />
                    {day.leaves.length}
                  </span>
                )}
              </div>

              {/* Leave bars */}
              <div className="space-y-0.5">
                {leaveEvents.slice(0, 3).map((event, index) => 
                  renderLeaveBar(event, index)
                )}
                {leaveEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{leaveEvents.length - 3} more
                  </div>
                )}
              </div>

              {/* Show tooltip on hover for leaves */}
              {selectedLeave && day.leaves.includes(selectedLeave) && (
                <LeaveTooltip leave={selectedLeave} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-wrap items-center space-x-6 text-sm">
          <span className="font-medium text-gray-700 mr-4">Leave Types:</span>
          
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Sick</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">Casual</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Vacation</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">Academic</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Comp Off</span>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading calendar...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveCalendar;

