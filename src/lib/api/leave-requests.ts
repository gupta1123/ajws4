import { apiClient, ApiResponse, ApiErrorResponse, ApiResponseWithCache } from './client';
import type {
  CreateLeaveRequest,
  UpdateLeaveRequestStatus,
  ListLeaveRequestsParams
} from '@/types/leave-requests';

export const leaveRequestServices = {
  // Create a new leave request
  create: async (data: CreateLeaveRequest, token: string): Promise<ApiResponse<{ leave_request: import('@/types/leave-requests').LeaveRequest }> | ApiErrorResponse | Blob> => {
    const response = await apiClient.post<{ leave_request: import('@/types/leave-requests').LeaveRequest }>('/api/leave-requests', data, token);
    return response;
  },

  // Get list of leave requests with filters
  list: async (params: ListLeaveRequestsParams = {}, token: string): Promise<ApiResponseWithCache<{ leave_requests: import('@/types/leave-requests').LeaveRequest[] }> | ApiErrorResponse | Blob> => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get<{ leave_requests: import('@/types/leave-requests').LeaveRequest[] }>(`/api/leave-requests${queryString}`, token);
    return response;
  },

  // Get a specific leave request by ID
  getById: async (id: string, token: string): Promise<ApiResponseWithCache<{ leave_request: import('@/types/leave-requests').LeaveRequest }> | ApiErrorResponse | Blob> => {
    const response = await apiClient.get<{ leave_request: import('@/types/leave-requests').LeaveRequest }>(`/api/leave-requests/${id}`, token);
    return response;
  },

  // Update leave request status (approve/reject)
  updateStatus: async (id: string, data: UpdateLeaveRequestStatus, token: string): Promise<ApiResponse<{ leave_request: import('@/types/leave-requests').LeaveRequest }> | ApiErrorResponse> => {
    const response = await apiClient.put<{ leave_request: import('@/types/leave-requests').LeaveRequest }>(`/api/leave-requests/${id}/status`, data, token);
    return response;
  },

  // Approve a leave request
  approve: async (id: string, token: string): Promise<ApiResponse<{ leave_request: import('@/types/leave-requests').LeaveRequest }> | ApiErrorResponse> => {
    return leaveRequestServices.updateStatus(id, { status: 'approved' }, token);
  },

  // Reject a leave request
  reject: async (id: string, rejection_reason: string, token: string): Promise<ApiResponse<{ leave_request: import('@/types/leave-requests').LeaveRequest }> | ApiErrorResponse> => {
    return leaveRequestServices.updateStatus(id, {
      status: 'rejected',
      rejection_reason
    }, token);
  },

  // Get leave requests for a specific student
  getByStudent: async (studentId: string, params: Omit<ListLeaveRequestsParams, 'student_id'> = {}, token: string): Promise<ApiResponseWithCache<{ leave_requests: import('@/types/leave-requests').LeaveRequest[] }> | ApiErrorResponse | Blob> => {
    return leaveRequestServices.list({ ...params, student_id: studentId }, token);
  },

  // Get leave requests for a specific class division
  getByClass: async (classDivisionId: string, params: Omit<ListLeaveRequestsParams, 'class_division_id'> = {}, token: string): Promise<ApiResponseWithCache<{ leave_requests: import('@/types/leave-requests').LeaveRequest[] }> | ApiErrorResponse | Blob> => {
    return leaveRequestServices.list({ ...params, class_division_id: classDivisionId }, token);
  }
};
