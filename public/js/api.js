// API utility functions with JWT authentication

const API_BASE = '/api';

// Helper function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Helper function to handle API responses
async function handleResponse(response) {
    const data = await response.json();
    
    if (response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.clear();
        window.location.href = '/';
        return null;
    }
    
    if (!response.ok) {
        throw new Error(data.message || 'An error occurred');
    }
    
    return data;
}

// API functions
const api = {
    // Auth endpoints
    auth: {
        login: async (email, password) => {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            return handleResponse(response);
        },
        
        getCurrentUser: async () => {
            const response = await fetch(`${API_BASE}/auth/current-user`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        logout: async () => {
            const response = await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        }
    },
    
    // Leave endpoints
    leaves: {
        getBalance: async () => {
            const response = await fetch(`${API_BASE}/leaves/balance`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        getMyLeaves: async () => {
            const response = await fetch(`${API_BASE}/leaves/my-leaves`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        getAllLeaves: async () => {
            const response = await fetch(`${API_BASE}/leaves/all`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        getPendingLeaves: async () => {
            const response = await fetch(`${API_BASE}/leaves/pending`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        applyLeave: async (leaveData) => {
            const response = await fetch(`${API_BASE}/leaves/apply`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(leaveData)
            });
            return handleResponse(response);
        },
        
        updateStatus: async (leaveId, status, rejectionReason) => {
            const response = await fetch(`${API_BASE}/leaves/update-status/${leaveId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status, rejectionReason })
            });
            return handleResponse(response);
        },
        
        cancelLeave: async (leaveId, cancellationReason) => {
            const response = await fetch(`${API_BASE}/leaves/cancel/${leaveId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ cancellationReason })
            });
            return handleResponse(response);
        },
        
        markWFH: async (date, reason) => {
            const response = await fetch(`${API_BASE}/leaves/wfh`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ date, reason })
            });
            return handleResponse(response);
        },
        
        addCompOff: async (days, reason) => {
            const response = await fetch(`${API_BASE}/leaves/comp-off`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ days, reason })
            });
            return handleResponse(response);
        },
        
        getHolidays: async () => {
            const response = await fetch(`${API_BASE}/leaves/holidays`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        }
    },
    
    // Admin endpoints
    admin: {
        getUsers: async () => {
            const response = await fetch(`${API_BASE}/admin/users`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        addUser: async (userData) => {
            const response = await fetch(`${API_BASE}/admin/users`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData)
            });
            return handleResponse(response);
        },
        
        updateUser: async (userId, userData) => {
            const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData)
            });
            return handleResponse(response);
        },
        
        toggleUserStatus: async (userId) => {
            const response = await fetch(`${API_BASE}/admin/users/${userId}/toggle-status`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        getQuotas: async () => {
            const response = await fetch(`${API_BASE}/admin/quotas`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        updateQuotas: async (quotas) => {
            const response = await fetch(`${API_BASE}/admin/quotas`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(quotas)
            });
            return handleResponse(response);
        },
        
        getHolidays: async () => {
            const response = await fetch(`${API_BASE}/admin/holidays`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        addHoliday: async (holidayData) => {
            const response = await fetch(`${API_BASE}/admin/holidays`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(holidayData)
            });
            return handleResponse(response);
        },
        
        deleteHoliday: async (holidayId) => {
            const response = await fetch(`${API_BASE}/admin/holidays/${holidayId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        getSettings: async () => {
            const response = await fetch(`${API_BASE}/admin/settings`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        updateSettings: async (settings) => {
            const response = await fetch(`${API_BASE}/admin/settings`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(settings)
            });
            return handleResponse(response);
        },
        
        getAccrualInfo: async () => {
            const response = await fetch(`${API_BASE}/admin/accrual/info`, {
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        runAccrual: async () => {
            const response = await fetch(`${API_BASE}/admin/accrual/run`, {
                method: 'POST',
                headers: getAuthHeaders()
            });
            return handleResponse(response);
        },
        
        updateAccrualRates: async (rates) => {
            const response = await fetch(`${API_BASE}/admin/accrual/rates`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(rates)
            });
            return handleResponse(response);
        }
    }
};

// Check authentication on page load
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '/';
        return null;
    }
    
    return JSON.parse(user);
} 