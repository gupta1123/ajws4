import { useState, useCallback, useEffect } from 'react';
import { leaveRequestServices } from '@/lib/api/leave-requests';
import { useAuth } from '@/lib/auth/context';
import type { 
  LeaveRequest, 
  ListLeaveRequestsParams, 
  CreateLeaveRequest,
  UpdateLeaveRequestStatus 
} from '@/types/leave-requests';



interface UseLeaveRequestsReturn {
  leaveRequests: LeaveRequest[];
  loading: boolean;
  error: string | null;
  fetchLeaveRequests: (params?: ListLeaveRequestsParams) => Promise<void>;
  createLeaveRequest: (data: CreateLeaveRequest) => Promise<LeaveRequest | null>;
  updateLeaveRequestStatus: (id: string, data: UpdateLeaveRequestStatus) => Promise<boolean>;
  approveLeaveRequest: (id: string) => Promise<boolean>;
  rejectLeaveRequest: (id: string, rejection_reason?: string) => Promise<boolean>;
  getLeaveRequestById: (id: string) => Promise<LeaveRequest | null>;
  clearError: () => void;
}

export const useLeaveRequests = (): UseLeaveRequestsReturn => {
  const { token, user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchLeaveRequests = useCallback(async (params: ListLeaveRequestsParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setError('Authentication token not available');
        return;
      }

      let response;

      // Use teacher-specific endpoint for teachers
      if (user?.role === 'teacher') {
        // For teachers, use the teacher-specific endpoint with date range
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 30); // Next 30 days

        const fromDate = params.start_date || today.toISOString().split('T')[0];
        const toDate = params.end_date || endDate.toISOString().split('T')[0];

        response = await leaveRequestServices.getTeacherLeaveRequests(fromDate, toDate, token);
      } else {
        // For admin/principal, use the general list endpoint
        response = await leaveRequestServices.list(params, token);
      }

      // Handle Blob response (shouldn't happen for JSON endpoints)
      if (response instanceof Blob) {
        setError('Unexpected response format from API');
        return;
      }

      // Handle error response
      if ('status' in response && response.status === 'error') {
        setError(response.message || 'Failed to fetch leave requests');
        return;
      }

      // Handle successful response
      if ('status' in response && response.status === 'success') {
        // New data received, update the state
        setLeaveRequests(response.data.leave_requests);
      } else {
        setError('Failed to fetch leave requests');
      }
    } catch (err) {
      console.error('Leave requests fetch error:', err);
      
      // If it's a 404, the endpoint doesn't exist yet
      if ((err as Error & { status?: number }).status === 404) {
        setError('Leave requests API endpoint not found. Please check the API configuration.');
        setLeaveRequests([]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch leave requests');
      }
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  const createLeaveRequest = useCallback(async (data: CreateLeaveRequest): Promise<LeaveRequest | null> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('Authentication token not available');
        return null;
      }
      
      const response = await leaveRequestServices.create(data, token);

      // Handle Blob response (shouldn't happen for JSON endpoints)
      if (response instanceof Blob) {
        setError('Unexpected response format from API');
        return null;
      }

      // Handle error response
      if ('status' in response && response.status === 'error') {
        setError(response.message || 'Failed to create leave request');
        return null;
      }

      // Handle successful response
      if ('status' in response && response.status === 'success') {
        const newRequest = response.data.leave_request;
        setLeaveRequests(prev => [newRequest, ...prev]);
        return newRequest;
      } else {
        setError('Failed to create leave request');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create leave request');
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateLeaveRequestStatus = useCallback(async (id: string, data: UpdateLeaveRequestStatus): Promise<boolean> => {
    try {
      console.log('🔄 Updating leave request status:', { id, data });
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('Authentication token not available');
        return false;
      }
      
      console.log('📡 Making API call to update status...');
      const response = await leaveRequestServices.updateStatus(id, data, token);
      console.log('📥 API Response:', response);
      
      if (response.status === 'success') {
        // After successful status update, refresh the entire list
        console.log('✅ Status updated successfully, refreshing leave requests...');
        await fetchLeaveRequests();
        return true;
      } else {
        console.error('❌ API returned error status:', response);
        setError('Failed to update leave request status');
        return false;
      }
    } catch (err) {
      console.error('💥 Update leave request status error:', err);
      
      // If it's a 404, the endpoint doesn't exist yet
      if ((err as Error & { status?: number }).status === 404) {
        setError('Leave request update API endpoint not found. Please check the API configuration.');
        return false;
      } else {
        setError(err instanceof Error ? err.message : 'Failed to update leave request status');
        return false;
      }
    } finally {
      setLoading(false);
    }
  }, [token, fetchLeaveRequests]);

  const approveLeaveRequest = useCallback(async (id: string): Promise<boolean> => {
    console.log('🚀 Approving leave request:', id);
    try {
      const result = await updateLeaveRequestStatus(id, { status: 'approved' });
      console.log('✅ Approve result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in approveLeaveRequest:', error);
      return false;
    }
  }, [updateLeaveRequestStatus]);

  const rejectLeaveRequest = useCallback(async (id: string, rejection_reason?: string): Promise<boolean> => {
    console.log('🚀 Rejecting leave request:', id, 'Reason:', rejection_reason);
    try {
      const result = await updateLeaveRequestStatus(id, { status: 'rejected', rejection_reason });
      console.log('✅ Reject result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in rejectLeaveRequest:', error);
      return false;
    }
  }, [updateLeaveRequestStatus]);

  const getLeaveRequestById = useCallback(async (id: string): Promise<LeaveRequest | null> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('Authentication token not available');
        return null;
      }
      
      const response = await leaveRequestServices.getById(id, token);

      // Handle Blob response (shouldn't happen for JSON endpoints)
      if (response instanceof Blob) {
        setError('Unexpected response format from API');
        return null;
      }

      // Handle error response
      if ('status' in response && response.status === 'error') {
        setError(response.message || 'Failed to fetch leave request');
        return null;
      }

      // Handle successful response
      if ('status' in response && response.status === 'success') {
        return response.data.leave_request;
      } else {
        setError('Failed to fetch leave request');
        return null;
      }
    } catch (err) {
      console.error('Get leave request error:', err);
      
      // If it's a 404, the endpoint doesn't exist yet
      if ((err as Error & { status?: number }).status === 404) {
        setError('Leave request API endpoint not found. Please check the API configuration.');
        return null;
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch leave request');
        return null;
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch leave requests on mount only if token is available
  useEffect(() => {
    if (token) {
      fetchLeaveRequests();
    }
  }, [fetchLeaveRequests, token, user?.role]);

  return {
    leaveRequests,
    loading,
    error,
    fetchLeaveRequests,
    createLeaveRequest,
    updateLeaveRequestStatus,
    approveLeaveRequest,
    rejectLeaveRequest,
    getLeaveRequestById,
    clearError
  };
};
