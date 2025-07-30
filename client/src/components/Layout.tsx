import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  CalendarIcon,
  DocumentTextIcon,
  UsersIcon,
  CogIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  BellIcon,
  PlusIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { cn, getInitials, getRoleColor } from '../utils';

interface User {
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
}

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const { user, logout } = useAuth();
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const newIsDesktop = window.innerWidth >= 1024;
      setIsDesktop(newIsDesktop);
      
      // On desktop, open sidebar by default
      if (newIsDesktop) {
        setSidebarOpen(true);
      } else {
        // On mobile, close sidebar
        setSidebarOpen(false);
      }
    };

    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'My Leaves', href: '/leaves', icon: CalendarIcon },
    { name: 'Apply Leave', href: '/apply-leave', icon: PlusIcon },
    ...(user?.role === 'manager' || user?.role === 'admin' ? [
      { name: 'Team Leaves', href: '/team', icon: UserGroupIcon },
      { name: 'All Leaves', href: '/all-leaves', icon: DocumentTextIcon },
      { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    ] : []),
    ...(user?.role === 'admin' ? [
      { name: 'Users', href: '/users', icon: UsersIcon },
      { name: 'Departments', href: '/departments', icon: BuildingOfficeIcon },
      { name: 'Settings', href: '/settings', icon: CogIcon },
    ] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? '16rem' : '0',
          opacity: sidebarOpen ? 1 : 0,
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-gray-900 dark:bg-gray-950 overflow-hidden",
          isDesktop ? "relative" : "",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <div className={cn(
          "flex h-full flex-col w-64",
          !sidebarOpen && "invisible"
        )}>
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-4">
            <h2 className="text-xl font-bold text-white">HRMS Portal</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* User info */}
          <div className="mx-4 mb-6 rounded-lg bg-gray-800 dark:bg-gray-900 p-4">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full text-white font-medium",
                getRoleColor(user?.role || 'employee')
              )}>
                {getInitials(user?.name || 'User')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-300 capitalize truncate">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 pb-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gray-800 dark:bg-gray-700 text-white"
                      : "text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
              Logout
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-30 relative">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Menu button - show when sidebar is closed or on mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className={cn(
                "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                sidebarOpen && isDesktop ? "hidden" : "block"
              )}
              aria-label="Open sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Right side icons */}
            <div className="flex items-center space-x-4 ml-auto">
              {/* Notifications */}
              <button 
                className="relative p-2 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
                aria-label="View notifications"
              >
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800" />
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button 
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                  aria-label="Open user menu"
                >
                  <UserCircleIcon className="h-8 w-8 text-gray-400 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 