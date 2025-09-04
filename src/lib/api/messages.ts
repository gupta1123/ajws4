import { apiClient, ApiErrorResponse, ApiResponseWithCache, ApiResponse } from './client';

export interface TeacherLinkedParent {
  parent_id: string;
  full_name: string;
  email: string | null;
  phone_number: string;
  linked_students: {
    student_id: string;
    student_name: string;
    roll_number: string;
    class_division_id: string;
    teacher_assignments: {
      assignment_type: string;
      subject: string;
      is_primary: boolean;
      class_name: string;
      academic_year: string;
    }[];
  }[];
  chat_info: {
    has_thread: boolean;
    thread_id: string;
    message_count: number;
    participants: {
      role: string;
      user: {
        role: string;
        full_name: string;
      };
      user_id: string;
      last_read_at: string | null;
    }[];
    thread_title: string;
    thread_type: string;
    created_at: string;
    updated_at: string;
  };
}

export interface TeacherLinkedParentsResponse {
  status: string;
  data: {
    teacher: {
      id: string;
      full_name: string;
      assignments: {
        assignment_type: string;
        subject: string;
        is_primary: boolean;
        class_name: string;
        academic_year: string;
      }[];
    };
    linked_parents: TeacherLinkedParent[];
    principal: {
      id: string;
      full_name: string;
      email: string | null;
      phone_number: string;
      role: string;
    };
    summary: {
      total_linked_parents: number;
      total_students: number;
      total_classes: number;
      total_assignments: number;
      primary_teacher_for: number;
      subject_teacher_for: number;
      parents_with_chat: number;
      parents_without_chat: number;
    };
  };
}

export async function getTeacherLinkedParents(token?: string, teacherId?: string): Promise<ApiResponseWithCache<TeacherLinkedParentsResponse> | ApiErrorResponse | Blob> {
  const endpoint = teacherId
    ? `/api/users/teacher-linked-parents?teacher_id=${teacherId}`
    : '/api/users/teacher-linked-parents';

  try {
    const response = await apiClient.get<TeacherLinkedParentsResponse>(endpoint, token);

    // Handle different response types
    if (response instanceof Blob) {
      console.warn('Received blob response for teacher linked parents, this is unexpected');
      return response;
    }

    // Check if it's an error response
    if ('status' in response && response.status === 'error') {
      console.error('API Error for teacher linked parents:', response.message);
      return response;
    }

    // Check if response has expected structure
    if ('status' in response && response.status === 'success' && 'data' in response) {
      // Validate the response data structure
      const data = response.data;
      if (typeof data === 'object' && data !== null &&
          'linked_parents' in data &&
          Array.isArray(data.linked_parents)) {
        return response as ApiResponseWithCache<TeacherLinkedParentsResponse>;
      } else {
        console.warn('Unexpected response structure for teacher linked parents:', data);
        return {
          status: 'error',
          message: 'Invalid response format from server',
          statusCode: 200,
          error: 'Invalid response structure',
          details: { endpoint, response: data }
        };
      }
    }

    // If we get here, the response format is unexpected
    console.error('Unexpected response format for teacher linked parents:', response);
    return {
      status: 'error',
      message: 'Unexpected response format from server',
      statusCode: 200,
      error: 'Unexpected response structure',
      details: { endpoint, response }
    };

  } catch (error) {
    console.error('Network error fetching teacher linked parents:', error);
    return {
      status: 'error',
      message: 'Network error while fetching parents',
      statusCode: 0,
      error: 'Network error',
      details: { endpoint, error: error instanceof Error ? error.message : String(error) }
    };
  }
}

// Chat thread interfaces
export interface ChatThread {
  id: string;
  thread_type: 'direct' | 'group';
  title: string;
  created_by: string;
  status: string;
  created_at: string;
  updated_at: string;
  participants: {
    role: string;
    user: {
      role: string;
      full_name: string;
    };
    user_id: string;
    last_read_at: string | null;
  }[];
  last_message: {
    sender: {
      full_name: string;
    };
    content: string;
    created_at: string;
  }[];
}

export interface ChatThreadsResponse {
  status: string;
  data: {
    threads: ChatThread[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

export interface StartConversationPayload {
  participants: string[];
  message_content: string;
  thread_type: 'direct' | 'group';
  title: string;
}

export interface StartConversationResponse {
  status: string;
  data: {
    thread: {
      id: string;
      thread_type: string;
      title: string;
      created_by: string;
      created_at: string;
    };
    message: {
      id: string;
      content: string;
      sender: {
        role: string;
        full_name: string;
      };
      created_at: string;
    };
    participants: number;
  };
}

// Get all chat threads
export async function getChatThreads(token?: string): Promise<ApiResponseWithCache<ChatThreadsResponse> | ApiErrorResponse | Blob> {
  const response = await apiClient.get<ChatThreadsResponse>('/api/chat/threads', token);
  return response;
}

// Start a new conversation
export async function startConversation(
  payload: StartConversationPayload, 
  token?: string
): Promise<ApiResponse<StartConversationResponse> | ApiErrorResponse | Blob> {
  const response = await apiClient.post<StartConversationResponse>('/api/chat/start-conversation', payload, token);
  return response;
}

// Send message to existing thread
export interface SendMessagePayload {
  thread_id: string;
  content: string;
}

export interface SendMessageResponse {
  status: string;
  data: {
    id: string;
    thread_id: string;
    sender_id: string;
    content: string;
    message_type: string;
    status: string;
    moderated: boolean;
    moderated_by: string | null;
    moderated_at: string | null;
    moderation_reason: string | null;
    created_at: string;
    updated_at: string;
    sender: {
      role: string;
      full_name: string;
    };
  };
}

export async function sendMessage(
  payload: SendMessagePayload,
  token?: string
): Promise<ApiResponse<SendMessageResponse> | ApiErrorResponse | Blob> {
  const response = await apiClient.post<SendMessageResponse>('/api/chat/messages', payload, token);
  return response;
}

// Check existing thread interfaces
export interface CheckExistingThreadPayload {
  participants: string[];
  thread_type: 'direct' | 'group';
}

export interface CheckExistingThreadResponse {
  status: string;
  data: {
    exists: boolean;
    thread?: {
      id: string;
      title: string;
      thread_type: string;
      created_at: string;
      updated_at: string;
      created_by: string;
      status: string;
      participants: {
        user_id: string;
        role: string;
        last_read_at: string | null;
        user: {
          role: string;
          full_name: string;
        };
      }[];
      message_count: number;
    };
  };
}

export interface DivisionParentsResponse {
  status: string;
  data: {
    class_division_id: string;
    students: {
      student: {
        id: string;
        name: string;
        roll_number: string;
      };
      parents: {
        id: string;
        name: string;
        email: string | null;
        phone_number: string;
        relationship: string;
        is_primary_guardian: boolean;
      }[];
    }[];
    total_students: number;
    total_parents: number;
    summary: {
      students_with_parents: number;
      students_without_parents: number;
    };
  };
}

// Check if a thread already exists between participants
export async function checkExistingThread(
  payload: CheckExistingThreadPayload,
  token?: string
): Promise<ApiResponse<CheckExistingThreadResponse> | ApiErrorResponse | Blob> {
  const response = await apiClient.post<CheckExistingThreadResponse>('/api/chat/check-existing-thread', payload, token);
  return response;
}

// Get parents for a specific class division
export async function getDivisionParents(
  classDivisionId: string,
  token?: string
): Promise<ApiResponseWithCache<DivisionParentsResponse> | ApiErrorResponse | Blob> {
  const response = await apiClient.get<DivisionParentsResponse>(`/api/users/division/${classDivisionId}/parents`, token);
  return response;
}
