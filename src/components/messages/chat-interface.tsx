// src/components/messages/chat-interface.tsx

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, 
  Search, 
  User, 
  Users, 
  Bell,
  Check,
  CheckCheck,
  AlertCircle,
  Loader2,
  Star,
  MessageSquare,
  UserCheck
} from 'lucide-react';
import {
  getTeacherLinkedParents,
  TeacherLinkedParent,
  getChatThreads,
  startConversation,
  sendMessage,
  checkExistingThread,
  ChatThread,
  StartConversationPayload,
  SendMessagePayload,
  CheckExistingThreadPayload
} from '@/lib/api/messages';
import { useAuth } from '@/lib/auth/context';
import { ChatWebSocket, WebSocketMessage } from '@/lib/api/websocket';
import { useChatMessages } from '@/hooks/use-chat-threads';
import { ChatMessage as ApiChatMessage } from '@/lib/api/chat-threads';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isOwn: boolean;
  created_at?: string;
}

interface ChatContact {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  type: 'individual' | 'group' | 'announcement' | 'principal';
  avatar?: string;
  parentData?: TeacherLinkedParent | { parent_id: string; full_name: string; role: string } | null;
  threadData?: ChatThread;
  isGroup?: boolean;
  groupMembers?: string[];
  principalData?: { id: string; full_name: string; role: string };
  teacherData?: { teacher_id: string; full_name: string; role: string } | null;

}

interface TeacherLinkedParentsResponse {
  status: 'success' | 'error';
  message?: string;
  data?: {
    linked_parents: TeacherLinkedParent[];
    principal?: { id: string; full_name: string; role: string };
  };
}

interface StudentData {
  student_name: string;
  student_id: string;
  teacher_assignments?: Array<{ class_name: string }>;
}

interface ConversationResponse {
  status: 'success' | 'error';
  data?: {
    thread: {
      id: string;
    };
    message?: {
      id: string;
      sender: { full_name: string; id: string };
      content: string;
      created_at: string;
    };
  };
}

// Function to format date as "11 Aug' 25"
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month}' ${year}`;
};

// Function to format time as "8:00 PM"
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Function to get date label (Today, Yesterday, or formatted date)
const getDateLabel = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Reset time to compare only dates
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    return formatDate(dateString);
  }
};

// Function to check if two dates are on the same day
const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Function to transform API data to chat contacts
const transformParentDataToContacts = (parents: TeacherLinkedParent[]): ChatContact[] => {
  return parents.map(parent => {
    const studentNames = parent.linked_students.map(student => student.student_name).join(', ');

    return {
      id: parent.parent_id,
      name: `${parent.full_name} (Parent of ${studentNames})`,
      lastMessage: parent.chat_info.has_thread ? 'Previous conversation available' : 'No messages yet',
      lastMessageTime: parent.chat_info.updated_at ? formatDate(parent.chat_info.updated_at) : 'New',
      unreadCount: parent.chat_info.message_count || 0,
      isOnline: false, // We'll keep this as false for now since API doesn't provide online status
      type: 'individual' as const,
      parentData: parent
    };
  });
};

// Function to transform principal data to chat contact
const transformPrincipalToContact = (principal: { id: string; full_name: string; role: string }): ChatContact => {
  return {
    id: `principal-${principal.id}`,
    name: `${principal.full_name} (Principal)`,
    lastMessage: 'Available for administrative discussions',
    lastMessageTime: 'Always',
    unreadCount: 0,
    isOnline: false,
    type: 'principal' as const,
    principalData: principal
  };
};

// Function to sort contacts (no pinned sorting needed)
const sortContacts = (contacts: ChatContact[]): ChatContact[] => {
  return contacts; // Keep original order
};

// Function to transform chat threads to contacts
const transformThreadsToContacts = (threads: ChatThread[], user: { id: string } | null): ChatContact[] => {
  return threads.map(thread => {
    const isGroup = thread.thread_type === 'group';
    const lastMessage = thread.last_message && thread.last_message.length > 0 
      ? thread.last_message[thread.last_message.length - 1] 
      : null;
    
    // Get group members (excluding the current user)
    const groupMembers = thread.participants
      .filter(p => p.user_id !== user?.id)
      .map(p => p.user.full_name);
    
    // Compute a friendly display name using recipients (exclude me)
    const otherNames = groupMembers.filter(Boolean);
    let displayName = thread.title;
    if (otherNames.length > 0) {
      if (isGroup) {
        displayName = otherNames.length <= 2
          ? otherNames.join(', ')
          : `${otherNames.slice(0, 2).join(', ')} …`;
      } else {
        // direct chat
        displayName = otherNames[0];
      }
    }
    
    
    // Find teacher data if this is a teacher chat
    const teacherParticipant = thread.participants.find(p => p.user.role === 'teacher');
    const teacherData = teacherParticipant ? {
      teacher_id: teacherParticipant.user_id,
      full_name: teacherParticipant.user.full_name,
      role: teacherParticipant.user.role
    } : null;
    
    // Find parent data if this is a parent chat
    const parentParticipant = thread.participants.find(p => p.user.role === 'parent');
    const parentData = parentParticipant ? {
      parent_id: parentParticipant.user_id,
      full_name: parentParticipant.user.full_name,
      role: parentParticipant.user.role
    } : null;
    
    return {
      id: thread.id,
      name: displayName || thread.title,
      lastMessage: lastMessage ? lastMessage.content : 'No messages yet',
      lastMessageTime: lastMessage ? formatDate(lastMessage.created_at) : formatDate(thread.created_at),
      unreadCount: 0, // TODO: Implement unread count logic
      isOnline: false,
      type: isGroup ? 'group' : 'individual',
      isGroup: isGroup,
      groupMembers: groupMembers,

      teacherData: teacherData, // Add teacher data for admin/principal
      parentData: parentData, // Add parent data for admin/principal
      threadData: thread
    };
  });
};



// Function to transform API messages to chat interface format
const transformApiMessagesToChatMessages = (apiMessages: ApiChatMessage[], user: { id: string } | null): ChatMessage[] => {
  return apiMessages.map((msg) => ({
    id: msg.id,
    senderId: msg.sender_id,
    senderName: msg.sender.full_name,
    content: msg.content,
    timestamp: msg.created_at,
    status: msg.status as 'sent' | 'delivered' | 'read',
    isOwn: msg.sender_id === user?.id,
    created_at: msg.created_at
  }));
};



interface ChatInterfaceProps {
  selectedParentId?: string;
  selectedThreadId?: string;
  isAdminOrPrincipal?: boolean;
  chatsData?: { threads?: unknown[] };
  refreshKey?: number;
}

export function ChatInterface({ selectedParentId, selectedThreadId, isAdminOrPrincipal, chatsData, refreshKey }: ChatInterfaceProps) {
  const { token, user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [activeChat, setActiveChat] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(!isAdminOrPrincipal); // Only show loading for teachers initially
  const [error, setError] = useState<string | null>(null);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [websocket, setWebsocket] = useState<ChatWebSocket | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [currentVisibleDate, setCurrentVisibleDate] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [selectingParent, setSelectingParent] = useState(false);
  const lastPrincipalThreadsKeyRef = useRef<string>('');
  const lastSelectedThreadIdRef = useRef<string | null>(null);

  // Hooks for real API data - only fetch messages for teachers, not principals
  const { messages: apiMessages, loading: messagesLoading, refreshMessages } = useChatMessages(currentThreadId);





  // Initialize WebSocket connection - TEMPORARILY DISABLED
  useEffect(() => {
    // When a specific thread ID is provided, open it immediately and load messages
    if (!selectedThreadId) return;
    if (lastSelectedThreadIdRef.current === selectedThreadId) return;
    lastSelectedThreadIdRef.current = selectedThreadId;

    // Set thread for message fetching
    setCurrentThreadId(selectedThreadId);
    // Try to select contact by thread id when available
    const candidate = contacts.find(c => c.threadData?.id === selectedThreadId);
    if (candidate) {
      setActiveChat(candidate);
    }
    setSelectingParent(false);
  }, [selectedThreadId, contacts]);

  useEffect(() => {
    if (token) {
      // Temporarily disabled WebSocket - causing connection errors
      // const ws = new ChatWebSocket(token);
      // ws.connect().then(() => {
      //   setWebsocket(ws);
      //   console.log('WebSocket connected successfully');
      //   // Clear any previous connection errors when WebSocket connects successfully
      //   setError(null);
      // }).catch((error) => {
      //   console.error('Failed to connect WebSocket:', error);
      //   // Don't set error - allow chat to work without WebSocket
      //   console.warn('Chat will work without real-time updates due to WebSocket connection failure');
      //   setWebsocket(null);
      // });

      // Temporarily set websocket to null to disable real-time features
      setWebsocket(null);
      console.log('WebSocket temporarily disabled to prevent connection errors');

      // Set up connection status monitoring - DISABLED
      // const checkConnection = () => {
      //   if (ws.isConnected()) {
      //     setError(null);
      //   }
      // };

      // Check connection status every 2 seconds - DISABLED
      // const interval = setInterval(checkConnection, 2000);

      return () => {
        // clearInterval(interval);
        // ws.disconnect();
      };
    }
  }, [token]);

  // Normalize principal/admin threads into canonical thread shape
  const normalizePrincipalThreads = useCallback((threads: unknown[]): ChatThread[] => {
    interface PrincipalThread {
      id?: string;
      thread_id?: string;
      thread_type?: string;
      title?: string;
      created_by?: string;
      created_at?: string;
      updated_at?: string;
      is_principal_participant?: boolean;
      badges?: { includes_principal?: boolean };
      participants?: { all?: PrincipalParticipant[] };
      last_message?: {
        sender?: { full_name?: string };
        content?: string;
        created_at?: string;
      };
    }
    
    interface PrincipalParticipant {
      role?: string;
      user?: { role?: string; full_name?: string };
      user_id?: string;
      last_read_at?: string;
    }
    
    // Do not filter by participation here; API already scoped via includes_me
    return (threads || [])
      .map((t) => {
        const thread = t as PrincipalThread;
        const participants = (thread.participants?.all || []).map((p: PrincipalParticipant) => ({
          role: p.role,
          user: { role: p.user?.role, full_name: p.user?.full_name },
          user_id: p.user_id,
          last_read_at: p.last_read_at,
        }));
        const lastMsg = thread.last_message ? [{
          sender: { full_name: thread.last_message.sender?.full_name || '' },
          content: thread.last_message.content || '',
          created_at: thread.last_message.created_at || thread.updated_at || thread.created_at,
        }] : [];
        const id = thread.id || thread.thread_id;
        return {
          id,
          thread_type: thread.thread_type,
          title: thread.title,
          created_by: thread.created_by || '',
          status: 'active',
          created_at: thread.created_at,
          updated_at: thread.updated_at,
          participants,
          last_message: lastMsg as ChatThread['last_message'],
        } as ChatThread;
      });
  }, []);

  // Handle principal chats data for admin/principal users
  useEffect(() => {
    if (isAdminOrPrincipal && chatsData) {
      // Prevent reprocessing the same threads set repeatedly
      const threads = (chatsData.threads || []) as unknown[];
      const key = Array.isArray(threads)
        ? threads.map((t) => ((t as { id?: string; thread_id?: string }).id || (t as { id?: string; thread_id?: string }).thread_id || '')).join('|')
        : '';
      if (lastPrincipalThreadsKeyRef.current === key) {
        return;
      }
      lastPrincipalThreadsKeyRef.current = key;
      console.log('=== ADMIN/PRINCIPAL CHATS DATA ===');
      console.log('Chats data:', chatsData);
      console.log('Threads:', chatsData.threads);

      // Normalize principal/admin threads and transform to contacts
      const normalizedThreads = normalizePrincipalThreads(chatsData.threads || []);
      const transformedContacts: ChatContact[] = transformThreadsToContacts(normalizedThreads, user);
      console.log('Transformed contacts:', transformedContacts);

      const sortedContacts = sortContacts(transformedContacts);
      // Only update contacts if actually changed to avoid loops
      setContacts((prev: ChatContact[]) => {
        const prevKey = prev.map((c) => c.id).join('|');
        const nextKey = sortedContacts.map((c) => c.id).join('|');
        if (prevKey === nextKey) return prev;
        return sortedContacts;
      });
      // Ensure loading is set to false when data is loaded
      setLoading(prev => (prev ? false : prev));

      // Set first contact as active if none is selected and not in the middle of a specific selection
      if (transformedContacts.length > 0 && !activeChat && !selectingParent && !selectedParentId) {
        const firstContact = transformedContacts[0];
        if (firstContact) {
          console.log('Setting first contact as active:', firstContact);
          setActiveChat(firstContact);
          // Set the thread ID for the first contact to load messages
          const firstThreadId = firstContact.threadData?.id;
          if (firstThreadId && currentThreadId !== firstThreadId) {
            console.log('Setting thread ID for first contact:', firstThreadId);
            setCurrentThreadId(firstThreadId);
          }
        }
      }
    } else if (isAdminOrPrincipal && !chatsData) {
      // If it's a principal but no data yet, show loading
      setLoading(true);
    }
  }, [isAdminOrPrincipal, chatsData, user, normalizePrincipalThreads, activeChat, selectingParent, selectedParentId, currentThreadId]);

  // Handle API messages when thread changes (all roles)
  useEffect(() => {
    console.log('=== API MESSAGES UPDATED ===');
    console.log('API Messages count:', apiMessages.length);
    console.log('Current Thread ID:', currentThreadId);
    console.log('Is Admin/Principal:', isAdminOrPrincipal);
    console.log('User:', user);
    if (apiMessages.length > 0) {
      // For teachers, use the fetched messages
      const transformedMessages = transformApiMessagesToChatMessages(apiMessages, user);
      console.log('Transformed messages:', transformedMessages);
      setMessages(transformedMessages);
      console.log('Messages state updated with', transformedMessages.length, 'messages');
      
      // Set the current visible date to the latest message date
      if (transformedMessages.length > 0) {
        const latestMessage = transformedMessages[transformedMessages.length - 1];
        setCurrentVisibleDate(latestMessage.created_at || latestMessage.timestamp);
      }
    } else {
      console.log('No API messages, clearing messages array');
      setMessages([]);
      setCurrentVisibleDate(null);
    }
  }, [apiMessages, user, currentThreadId, isAdminOrPrincipal]);

  // Polling fallback: ensure messages refresh while a thread is open
  useEffect(() => {
    if (!currentThreadId || !token) return;
    let cancelled = false;
    const interval = setInterval(() => {
      if (!cancelled) {
        refreshMessages(true); // silent refresh to avoid flicker
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentThreadId, token, refreshMessages]);

  // Fetch teacher-linked parents data (only for teachers)
  const fetchParents = useCallback(async () => {
    if (!token) {
      console.log('No authentication token available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getTeacherLinkedParents(token, user?.id);
      console.log('API Response:', response); // Debug log

      // Handle Blob response (shouldn't happen for this endpoint)
      if (response instanceof Blob) {
        console.error('Unexpected Blob response');
        setError('Unexpected response format');
        return;
      }

            // Check if response has error status
      if (response.status === 'error') {
        const errorMessage = (response as TeacherLinkedParentsResponse).message || 'Failed to fetch parents';
        console.error('API Error:', errorMessage);
        setError('Unexpected response format');
        return;
      }

      // Check if response has success status
      if (response.status === 'success' && 'data' in response && response.data && 'linked_parents' in response.data) {
        const responseData = response.data as TeacherLinkedParentsResponse['data'];
        if (!responseData) return; // Safety check
        const linkedParents = responseData.linked_parents as TeacherLinkedParent[];
        const transformedContacts = transformParentDataToContacts(linkedParents);

        // Add principal to contacts if available
        let allContacts = [...transformedContacts];
        if (responseData.principal) {
          const principalContact = transformPrincipalToContact(responseData.principal);
          allContacts = [principalContact, ...allContacts]; // Principal appears first
        }

        // Sort contacts with pinned ones at the top
        const sortedContacts = sortContacts(allContacts);
        setContacts(sortedContacts);
        // Don't auto-select a contact here - let the thread loading handle it
      } else {
        console.error('Unexpected response format:', response);
      }
    } catch (error) {
      console.error('Error fetching teacher-linked parents:', error);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    if (isAdminOrPrincipal) return; // Skip for admin/principal users
    fetchParents();
  }, [isAdminOrPrincipal, fetchParents]);

  // Fetch chat threads function
  const fetchThreads = useCallback(async (isGroupRefresh = false) => {
    if (!token) {
      console.log('❌ No token available for fetchThreads');
      return;
    }

    try {
      console.log('🔍 Starting fetchThreads, isGroupRefresh:', isGroupRefresh);

      const response = await getChatThreads(token);
      console.log('📡 fetchThreads response:', response);

      if (response instanceof Blob) {
        console.error('❌ Unexpected Blob response from threads');
        return;
      }

      if (response.status === 'success' && 'data' in response && response.data && 'threads' in response.data) {
        const threads = response.data.threads as ChatThread[];
        console.log('✅ Fetched threads:', threads.length, 'threads');
        console.log('📋 Thread details:', threads.map(t => ({ id: t.id, title: t.title, type: t.thread_type })));
        setChatThreads(threads);
        
        // Transform threads to contacts and add them to the contacts list
        if (user) {
          const threadContacts = transformThreadsToContacts(threads, user);
          console.log('🔄 Transformed thread contacts:', threadContacts.length, 'contacts');
          console.log('👥 Contact details:', threadContacts.map(c => ({ id: c.id, name: c.name, hasThreadData: !!c.threadData })));
          setContacts(prevContacts => {
            // Combine parent contacts with thread contacts, avoiding duplicates
            const existingIds = new Set(prevContacts.map(c => c.id));
            const newThreadContacts = threadContacts.filter(c => !existingIds.has(c.id));
            const allContacts = [...prevContacts, ...newThreadContacts];

            console.log('📊 Contact merge stats:');
            console.log('  - Previous contacts:', prevContacts.length);
            console.log('  - New thread contacts:', newThreadContacts.length);
            console.log('  - Total contacts after merge:', allContacts.length);
            
            // Sort contacts with pinned ones at the top
            const sortedContacts = sortContacts(allContacts);
            
            // Auto-select the first contact if none is currently selected AND no specific parent is selected
            if (sortedContacts.length > 0 && !activeChat && !selectedParentId) {
              // Select the first contact in the list
              setActiveChat(sortedContacts[0]);
            }
            
            return sortedContacts;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching chat threads:', error);
    } finally {
      // Cleanup if needed
    }
  }, [token, user, activeChat, selectedParentId]);

  // Fetch chat threads on component mount (only for teachers)
  useEffect(() => {
    if (!isAdminOrPrincipal) {
      fetchThreads();
    }
  }, [token, user, isAdminOrPrincipal, fetchThreads]);

  // Keep teacher thread list fresh so side list updates
  useEffect(() => {
    if (isAdminOrPrincipal) return;
    let cancelled = false;
    const interval = setInterval(() => {
      if (!cancelled) {
        fetchThreads();
      }
    }, 10000); // Refresh threads every 10s for teachers
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAdminOrPrincipal, fetchThreads]);

  // When fresh messages load, update the active contact preview
  useEffect(() => {
    if (!activeChat || !currentThreadId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    setContacts(prev => prev.map(c => {
      if (c.threadData?.id === currentThreadId) {
        return {
          ...c,
          lastMessage: last.content,
          lastMessageTime: getDateLabel(last.created_at || last.timestamp)
        };
      }
      return c;
    }));
  }, [messages, activeChat, currentThreadId]);

  // Track last processed selection to avoid repeated scheduling
  const lastSelectionIdRef = useRef<string | null>(null);

  // Auto-select chat when selectedParentId is provided
  useEffect(() => {
    if (!selectedParentId) {
      lastSelectionIdRef.current = null;
      return;
    }
    // Avoid rescheduling for the same selection id
    if (lastSelectionIdRef.current === selectedParentId) return;
    lastSelectionIdRef.current = selectedParentId;

    if (selectedParentId) {
      console.log('=== SELECTION START ===');
      console.log('Selected ID:', selectedParentId);
      console.log('Available contacts:', contacts.length);
      console.log('Contact details:', contacts.map((c: ChatContact) => ({
        id: c.id,
        name: c.name,
        parentId: c.parentData?.parent_id,
        isGroup: c.isGroup
      })));
      
      // Debug: Log all parent IDs to see what's available
      const allParentIds = contacts
        .filter((c: ChatContact) => c.parentData)
        .map((c: ChatContact) => c.parentData?.parent_id);
      console.log('All available parent IDs:', allParentIds);
      console.log('Looking for selected ID:', selectedParentId);
      console.log('Parent ID found in list:', allParentIds.includes(selectedParentId));
      
      if (!selectingParent) setSelectingParent(true);
      
      // Clear any existing active chat to prevent showing default chat
      setActiveChat(null);
      setMessages([]);
      setCurrentThreadId(null);
      
      if (contacts.length === 0) {
        // If contacts are not loaded yet, wait a bit and try again
        console.log('Contacts not loaded yet, will retry...');
        return;
      }
      
      // Add a small delay to ensure contacts are properly processed
      const timer = setTimeout(() => {
        let selectedContact = contacts.find(contact => 
          contact.parentData?.parent_id === selectedParentId ||
          contact.threadData?.id === selectedParentId
        ) as ChatContact | undefined;
        if (!selectedContact && isAdminOrPrincipal) {
          // For admin/principal also allow selecting by teacher ID
          selectedContact = contacts.find(contact =>
            contact.teacherData?.teacher_id === selectedParentId
          ) as ChatContact | undefined;
        }
        
        if (selectedContact) {
          console.log('✅ Found selected contact:', selectedContact.name);
          console.log('Contact data:', selectedContact);
          if (!activeChat || activeChat.id !== selectedContact.id) {
            setActiveChat(selectedContact);
          }
          // Ensure messages are fetched by setting thread ID when available
          if (selectedContact.threadData?.id) {
            setCurrentThreadId(selectedContact.threadData.id);
          }
          setSearchTerm('');
          if (selectingParent) setSelectingParent(false);
          console.log('=== PARENT SELECTION SUCCESS ===');

          // Ensure the contact is visible by scrolling to it if needed
          setTimeout(() => {
            const contactElement = document.querySelector(`[data-contact-id="${selectedContact.id}"]`);
            if (contactElement) {
              contactElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 100);
        } else {
          console.log('❌ Selected contact not found in contacts:', selectedParentId);
          console.log('Available IDs:', contacts.map(c => c.threadData?.id || (c.parentData && ('parent_id' in c.parentData ? c.parentData.parent_id : undefined)) || c.teacherData?.teacher_id));
        // If the parent is not found, it might be because contacts are still loading
        // We'll let the contacts loading effect handle this
      }
    }, 100); // Small delay to ensure contacts are ready
    return () => clearTimeout(timer);
  }
  }, [selectedParentId, contacts, isAdminOrPrincipal, selectingParent, activeChat]);

  // Retry parent selection when contacts finish loading
  useEffect(() => {
    if (selectedParentId && contacts.length > 0 && !loading && selectingParent) {
      console.log('=== RETRYING PARENT SELECTION ===');
      console.log('Selected Parent ID:', selectedParentId);
      console.log('Contacts loaded:', contacts.length);
      console.log('Loading state:', loading);
      console.log('Selecting parent state:', selectingParent);
      console.log('Active chat:', activeChat);
      
      // Check if we need to retry the selection
      let selectedContact = contacts.find(contact => 
        contact.parentData?.parent_id === selectedParentId ||
        contact.threadData?.id === selectedParentId
      );
      if (!selectedContact && isAdminOrPrincipal) {
        selectedContact = contacts.find(contact =>
          contact.teacherData?.teacher_id === selectedParentId
        );
      }
      
      if (selectedContact && (!activeChat || activeChat.id !== selectedContact.id)) {
        console.log('✅ Retry successful - Found selected contact:', selectedContact.name);
        setActiveChat(selectedContact);
        if (selectedContact.threadData?.id) {
          setCurrentThreadId(selectedContact.threadData.id);
        }
        setSearchTerm('');
        if (selectingParent) setSelectingParent(false);
        console.log('=== RETRY PARENT SELECTION SUCCESS ===');
      } else {
        console.log('❌ Retry failed - Contact not found or already active');
        console.log('Selected contact found:', !!selectedContact);
        console.log('Active chat exists:', !!activeChat);
      }
    }
  }, [selectedParentId, contacts, loading, activeChat, selectingParent, isAdminOrPrincipal]);

  // Refresh after creating a new chat; for teachers only we refetch threads here.
  // Principals are refreshed by the parent page via use-principal-chats.
  useEffect(() => {
    if (!refreshKey || refreshKey <= 0) return;
    console.log('🔄 Refresh triggered (refreshKey):', refreshKey);

    if (!isAdminOrPrincipal) {
      // Teacher flow: refetch own threads
      setTimeout(() => {
        console.log('🚀 Teacher: fetching threads after delay');
        fetchThreads();
      }, 500);
      // Let existing selection persist; do not clear activeChat for stability
    } else {
      // Principal/Admin flow: no-op here; Messages page handles refresh via use-principal-chats
      console.log('ℹ️ Principal/Admin: refresh handled upstream, skipping local fetch');
    }
  }, [refreshKey, fetchThreads, isAdminOrPrincipal]);

  // Prevent auto-selection of first contact when we have a selectedParentId
  useEffect(() => {
    if (selectedParentId && !selectingParent) {
      // Don't auto-select any contact if we're waiting for a specific parent
      return;
    }
    
    // Only auto-select first contact if no specific parent is selected
    if (contacts.length > 0 && !activeChat && !selectedParentId) {
      const firstDirect = contacts.find(c => !c.isGroup);
      if (firstDirect) {
        console.log('Auto-selecting first direct contact:', firstDirect.name);
        setActiveChat(firstDirect);
      }
    }
  }, [contacts, activeChat, selectedParentId, selectingParent]);



  // Filter contacts based on search and active tab
  const filteredContacts = contacts.filter(contact => {
    
    const nameMatch = contact.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (contact.parentData) {
      // Search in parent name and student names
      const parentMatch = contact.parentData.full_name.toLowerCase().includes(searchTerm.toLowerCase());
          const studentMatch = contact.parentData && 'linked_students' in contact.parentData ?
      contact.parentData.linked_students.some((student: StudentData) =>
        student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
      ) : false;
      return nameMatch || parentMatch || studentMatch;
    } else if (contact.isGroup && contact.groupMembers) {
      // Search in group name and member names
      const memberMatch = contact.groupMembers.some(member => 
        member.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return nameMatch || memberMatch;
    } else if (contact.principalData) {
      // Search in principal name
      const principalMatch = contact.principalData.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || principalMatch;
    }
    
    return nameMatch;
  });

  // Set up WebSocket message handling
  useEffect(() => {
    if (websocket) {
      websocket.onMessage((message: WebSocketMessage) => {
        if (message.type === 'message_received' && message.thread_id === currentThreadId) {
          // Add new message to the current chat
          const newMessage: ChatMessage = {
            id: Date.now().toString(),
            senderId: 'other',
            senderName: message.sender?.full_name || 'Unknown',
            content: message.content || '',
            timestamp: message.created_at || new Date().toISOString(),
            status: 'delivered',
            isOwn: false,
            created_at: message.created_at
          };
          setMessages(prev => [...prev, newMessage]);
          
          // Update the contact's last message for real-time updates
          setContacts(prevContacts => 
            prevContacts.map(contact => {
              if (contact.threadData?.id === message.thread_id) {
                return {
                  ...contact,
                  lastMessage: message.content || '',
                  lastMessageTime: message.created_at ? getDateLabel(message.created_at) : getDateLabel(new Date().toISOString())
                };
              }
              return contact;
            })
          );
        }
      });

      // Clear connection errors when WebSocket is available
      if (websocket.isConnected()) {
        setError(null);
      }
    }
  }, [websocket, currentThreadId]);

  // Update messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      console.log('=== CHAT OPENED ===');
      console.log('Active chat:', activeChat);
      console.log('Chat type:', activeChat.type);
      console.log('Is principal:', !!activeChat.principalData);
      console.log('Principal data:', activeChat.principalData);
      
      // Clear the selecting parent state when a chat is actually opened
      if (selectingParent) {
        setSelectingParent(false);
      }
      
      let existingThread: ChatThread | undefined;
      
      if (isAdminOrPrincipal && activeChat.threadData) {
        // For admin/principal users, use the thread data directly from the contact
        existingThread = activeChat.threadData;
        console.log('Found existing thread for admin/principal:', existingThread);
      } else if (activeChat.isGroup && activeChat.threadData) {
        // This is a group chat, use the thread data directly
        existingThread = activeChat.threadData;
        console.log('Found existing group thread:', existingThread);
      } else if (activeChat.parentData) {
        // This is an individual parent chat, find the thread
        existingThread = chatThreads.find(thread => 
          thread.participants.some(p => p.user_id === activeChat.parentData?.parent_id)
        );
        console.log('Found existing parent thread:', existingThread);
      } else if (activeChat.principalData) {
        // This is a principal chat, find the thread
        existingThread = chatThreads.find(thread => 
          thread.participants.some(p => p.user_id === activeChat.principalData?.id)
        );
        console.log('Found existing principal thread:', existingThread);
        console.log('Available threads:', chatThreads);
        console.log('Looking for principal ID:', activeChat.principalData?.id);
      }
      
      if (existingThread) {
        console.log('Loading messages from existing thread:', existingThread);
        setCurrentThreadId(existingThread.id);
        
        // For admin/principal users, we'll let the useChatMessages hook handle message loading
        // For teachers, we'll load messages from the thread data
        if (!isAdminOrPrincipal && existingThread.last_message && existingThread.last_message.length > 0) {
          const threadMessages: ChatMessage[] = existingThread.last_message.map((msg: { sender: { full_name: string }; content: string; created_at: string }, index: number) => ({
            id: `${existingThread.id}-${index}-${Date.now()}`,
            senderId: msg.sender.full_name === user?.full_name ? 'me' : 'other',
            senderName: msg.sender.full_name,
            content: msg.content,
            timestamp: msg.created_at,
            status: 'read',
            isOwn: msg.sender.full_name === user?.full_name,
            created_at: msg.created_at
          }));
          console.log('Setting thread messages:', threadMessages);
          setMessages(threadMessages);
        } else if (isAdminOrPrincipal) {
          // For admin/principal users, clear messages and let the hook load them
          console.log('Clearing messages for admin/principal to let hook load them');
          setMessages([]);
        } else {
          console.log('No existing messages in thread, setting empty array');
          setMessages([]);
        }
        
        // Subscribe to the thread
        if (websocket) {
          websocket.subscribeToThread(existingThread.id);
          console.log(`Subscribed to ${existingThread.thread_type} thread:`, existingThread.id);
        }
      } else {
        console.log('No existing thread found, clearing messages and thread ID');
        setCurrentThreadId(null);
        setMessages([]);
      }
    }
  }, [activeChat, chatThreads, websocket, user, selectingParent, isAdminOrPrincipal]);

 
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle scroll to update current visible date
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || messages.length === 0) return;

    const container = messagesContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerHeight = containerRect.height;
    
    // Find the date header that's currently most visible
    const dateHeaders = container.querySelectorAll('[data-date-header]');
    let mostVisibleDate = null;
    let minDistance = Infinity;

    dateHeaders.forEach((header) => {
      const headerRect = header.getBoundingClientRect();
      const headerTop = headerRect.top - containerTop;
      const headerBottom = headerRect.bottom - containerTop;
      
      // Check if header is visible in the container
      if (headerTop < containerHeight && headerBottom > 0) {
        const distance = Math.abs(headerTop);
        if (distance < minDistance) {
          minDistance = distance;
          mostVisibleDate = header.getAttribute('data-date');
        }
      }
    });

    if (mostVisibleDate && mostVisibleDate !== currentVisibleDate) {
      setCurrentVisibleDate(mostVisibleDate);
    }
  }, [messages, currentVisibleDate]);

  // Add scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      // Initial check
      handleScroll();
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !token) {
      console.log('Cannot send message - missing requirements:', {
        hasMessage: !!newMessage.trim(),
        hasActiveChat: !!activeChat,
        hasToken: !!token
      });
      return;
    }

    try {
      let threadId = currentThreadId;


      if (!threadId) {
        if (activeChat.parentData) {
          console.log('Checking for existing conversation with parent:', activeChat.parentData);

          // First check if a thread already exists
          const checkPayload: CheckExistingThreadPayload = {
            participants: [activeChat.parentData.parent_id],
            thread_type: 'direct'
          };

          console.log('Checking existing thread payload:', checkPayload);
          const checkResponse = await checkExistingThread(checkPayload, token);
          console.log('Check existing thread response:', checkResponse);

          let existingThreadId: string | null = null;

          if (checkResponse instanceof Blob) {
            console.error('Unexpected Blob response from check existing thread');
          } else if (checkResponse.status === 'success' && 'data' in checkResponse && checkResponse.data) {
            const checkData = checkResponse.data as unknown as { exists: boolean; thread?: { id: string } };
            if (checkData.exists && checkData.thread) {
              console.log('Found existing thread:', checkData.thread);
              existingThreadId = checkData.thread.id;
              threadId = existingThreadId;
              setCurrentThreadId(threadId);

              // Subscribe to the existing thread
              if (websocket && threadId) {
                websocket.subscribeToThread(threadId);
                console.log('Subscribed to existing thread:', threadId);
              }
            }
          }

          // If no existing thread found, create a new one
          if (!existingThreadId) {
            console.log('No existing thread found, creating new conversation with parent:', activeChat.parentData);
            const payload: StartConversationPayload = {
              participants: [activeChat.parentData.parent_id],
              message_content: newMessage,
              thread_type: 'direct',
              title: `Chat with ${activeChat.parentData.full_name}`
            };

            console.log('Sending conversation payload:', payload);
            const response = await startConversation(payload, token);
            console.log('Conversation response:', response);

            if (response instanceof Blob) {
              console.error('Unexpected Blob response');
              return;
            }

            if (response.status === 'success' && 'data' in response && response.data && 'thread' in response.data) {
              const threadData = response.data as ConversationResponse['data'];
              if (!threadData?.thread) return;
              threadId = threadData.thread.id;
              setCurrentThreadId(threadId);
              console.log('Created thread with ID:', threadId);

              // Add the initial message to the messages array
              if (threadData.message) {
                const initialMessage: ChatMessage = {
                  id: `${threadData.message.id}-${Date.now()}`,
                  senderId: threadData.message.sender.full_name === user?.full_name ? 'me' : 'other',
                  senderName: threadData.message.sender.full_name,
                  content: threadData.message.content,
                  timestamp: threadData.message.created_at,
                  status: 'read',
                  isOwn: threadData.message.sender.full_name === user?.full_name,
                  created_at: threadData.message.created_at
                };
                console.log('Setting initial message:', initialMessage);
                setMessages([initialMessage]);
              } else {
                console.log('No message data in response');
              }

              if (websocket && threadId) {
                websocket.subscribeToThread(threadId);
                console.log('Subscribed to new thread:', threadId);
              }
            } else {
              console.error('Failed to create conversation:', response);
              return;
            }
          }
        } else if (activeChat.principalData) {
          console.log('Checking for existing conversation with principal:', activeChat.principalData);

          // First check if a thread already exists
          const checkPayload: CheckExistingThreadPayload = {
            participants: [activeChat.principalData.id],
            thread_type: 'direct'
          };

          console.log('Checking existing thread payload:', checkPayload);
          const checkResponse = await checkExistingThread(checkPayload, token);
          console.log('Check existing thread response:', checkResponse);

          let existingThreadId: string | null = null;

          if (checkResponse instanceof Blob) {
            console.error('Unexpected Blob response from check existing thread');
          } else if (checkResponse.status === 'success' && 'data' in checkResponse && checkResponse.data) {
            const checkData = checkResponse.data as unknown as { exists: boolean; thread?: { id: string } };
            if (checkData.exists && checkData.thread) {
              console.log('Found existing thread:', checkData.thread);
              existingThreadId = checkData.thread.id;
              threadId = existingThreadId;
              setCurrentThreadId(threadId);

              // Subscribe to the existing thread
              if (websocket && threadId) {
                websocket.subscribeToThread(threadId);
                console.log('Subscribed to existing thread:', threadId);
              }
            }
          }

          // If no existing thread found, create a new one
          if (!existingThreadId) {
            console.log('No existing thread found, creating new conversation with principal:', activeChat.principalData);
            const payload: StartConversationPayload = {
              participants: [activeChat.principalData.id],
              message_content: newMessage,
              thread_type: 'direct',
              title: `Chat with ${activeChat.principalData.full_name} (Principal)`
            };

            console.log('Sending conversation payload:', payload);
            const response = await startConversation(payload, token);
            console.log('Conversation response:', response);

            if (response instanceof Blob) {
              console.error('Unexpected Blob response');
              return;
            }

            if (response.status === 'success' && 'data' in response && response.data && 'thread' in response.data) {
              const threadData = response.data as ConversationResponse['data'];
              if (!threadData?.thread) return;
              threadId = threadData.thread.id;
              setCurrentThreadId(threadId);
              console.log('Created thread with ID:', threadId);

              // Add the initial message to the messages array
              if (threadData.message) {
                const initialMessage: ChatMessage = {
                  id: `${threadData.message.id}-${Date.now()}`,
                  senderId: threadData.message.sender.full_name === user?.full_name ? 'me' : 'other',
                  senderName: threadData.message.sender.full_name,
                  content: threadData.message.content,
                  timestamp: threadData.message.created_at,
                  status: 'read',
                  isOwn: threadData.message.sender.full_name === user?.full_name,
                  created_at: threadData.message.created_at
                };
                console.log('Setting initial message:', initialMessage);
                setMessages([initialMessage]);
              } else {
                console.log('No message data in response');
              }

              if (websocket && threadId) {
                websocket.subscribeToThread(threadId);
                console.log('Subscribed to new thread:', threadId);
              }
            } else {
              console.error('Failed to create conversation:', response);
              return;
            }
          }
        } else {
          console.error('Cannot create conversation: no parent data, principal data, or thread data');
          return;
        }
      }

 
      if (threadId) {
        // Send message via API
        try {
          const payload: SendMessagePayload = {
            thread_id: threadId,
            content: newMessage
          };
          
          // Validate payload before sending
          if (!payload.thread_id || !payload.content) {
            console.error('Invalid payload:', payload);
            setError('Invalid message data');
            return;
          }
          
          console.log('Sending message with payload:', payload);
          console.log('Using token:', token ? 'Token present' : 'No token');
          
          const response = await sendMessage(payload, token);
          
          console.log('Send message response:', response);
          console.log('Response type:', typeof response);
          console.log('Response instanceof Blob:', response instanceof Blob);
          
          if (response instanceof Blob) {
            console.error('Unexpected Blob response from sendMessage');
            setError('Unexpected response format');
            return;
          }
          
          // Check if response is valid
          if (!response || typeof response !== 'object') {
            console.error('Invalid response format:', response);
            setError('Invalid response from server');
            return;
          }
          
          // Check for error status
          if (response.status === 'error') {
            const errorResponse = response as { status: string; message?: string; statusCode?: number; error?: string; details?: unknown };
            console.error('API Error:', {
              status: errorResponse.status,
              message: errorResponse.message,
              statusCode: errorResponse.statusCode,
              error: errorResponse.error,
              details: errorResponse.details
            });
            setError(errorResponse.message || 'Failed to send message');
            return;
          }
          
          // Check for success status
          if (response.status === 'success' && 'data' in response && response.data) {
            const messageData = response.data as unknown as { id: string; sender_id: string; sender: { full_name: string }; content: string; created_at: string; status: string };
            
            console.log('Message sent successfully:', messageData);
            
            // Add the sent message to the messages array
            const message: ChatMessage = {
              id: messageData.id,
              senderId: messageData.sender_id,
              senderName: messageData.sender.full_name,
              content: messageData.content,
              timestamp: messageData.created_at,
              status: messageData.status as 'sent' | 'delivered' | 'read',
              isOwn: messageData.sender_id === user?.id,
              created_at: messageData.created_at
            };
            
            setMessages(prev => [...prev, message]);
            setNewMessage('');
            setError(null); // Clear any previous errors
            
            // Also send via WebSocket if available
            if (websocket) {
              websocket.sendMessage(threadId, newMessage);
            }
          } else {
            console.error('Unexpected response structure:', {
              hasStatus: 'status' in response,
              status: response.status,
              hasData: 'data' in response,
              data: 'data' in response ? (response as { data: unknown }).data : undefined,
              responseKeys: Object.keys(response)
            });
            setError('Unexpected response format from server');
          }
        } catch (error) {
          console.error('Exception in sendMessage:', error);
          console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          setError('Network error: Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="h-4 w-4" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4" />;
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getTypeIcon = (type: ChatContact['type']) => {
    switch (type) {
      case 'individual':
        return <User className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      case 'announcement':
        return <Bell className="h-4 w-4" />;
      case 'principal':
        return <Star className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[560px] border rounded-lg overflow-hidden bg-card">
      {/* Contacts List */}
      <div className="w-80 flex-shrink-0 border-r flex flex-col bg-card">

        
        <div className="p-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading chats...
              </p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                No Chats Found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'No chats match your search.' : 'You don\'t have any chats yet. Start a conversation to get connected!'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredContacts.map((contact) => {
                return (
                  <div key={contact.id}>
                    <div 
                      data-contact-id={contact.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 transition-all duration-200 ${
                        activeChat?.id === contact.id
                          ? 'bg-muted border-l-4 border-primary'
                          : ''
                      } ${selectingParent && contact.parentData?.parent_id === selectedParentId ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`}
                      onClick={() => {
                        console.log('=== CONTACT CLICKED ===');
                        console.log('Contact:', contact);
                        console.log('Contact thread data:', contact.threadData);
                        console.log('Contact thread data ID:', contact.threadData?.id);
                        console.log('Is Admin/Principal:', isAdminOrPrincipal);

                        // Set active chat first
                        if (!activeChat || activeChat.id !== contact.id) {
                          setActiveChat(contact);
                        }
                        console.log('ActiveChat set to:', contact);

                        // Set current thread ID for API message fetching
        const fallbackThreadId = (contact.parentData && ('chat_info' in contact.parentData)
          ? (contact.parentData as import('@/lib/api/messages').TeacherLinkedParent).chat_info?.thread_id
          : null);
                        if (contact.threadData && contact.threadData.id) {
                          console.log('Setting thread ID:', contact.threadData.id);
                          setCurrentThreadId(contact.threadData.id);
                        } else if (fallbackThreadId) {
                          console.log('Setting fallback thread ID from parent chat_info:', fallbackThreadId);
                          setCurrentThreadId(fallbackThreadId);
                          // Subscribe to WebSocket if available
                          if (websocket) {
                            websocket.subscribeToThread(fallbackThreadId);
                          }
                        } else {
                          console.log('No thread data or ID, clearing thread ID');
                          setCurrentThreadId(null);
                        }

                        // Clear messages only if switching to a different thread
                        if (currentThreadId && ((contact.threadData && contact.threadData.id !== currentThreadId) || (!contact.threadData && currentThreadId))) {
                          setMessages([]);
                        }
                        console.log('Messages cleared, should trigger re-fetch');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                            {getTypeIcon(contact.type)}
                          </div>
                          {/* Principal-in-thread indicator */}
                          {user?.role === 'principal' && contact.threadData?.participants?.some(p => p.user_id === user?.id) && (
                            <div
                              className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow"
                              title="You are in this chat"
                            >
                              <UserCheck className="h-3 w-3" />
                            </div>
                          )}
                          {contact.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background"></div>
                          )}

                        </div>
                        <div className="flex-grow min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-medium text-sm truncate flex-1 min-w-0">
                              {contact.parentData ? contact.parentData.full_name :
                               contact.principalData ? contact.principalData.full_name :
                               contact.name}
                            </h3>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {contact.lastMessageTime}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                              {contact.parentData && 'linked_students' in contact.parentData
                                ? contact.parentData.linked_students.length > 0
                                  ? `${contact.parentData.linked_students[0].student_name}${contact.parentData.linked_students.length > 1 ? ` +${contact.parentData.linked_students.length - 1}` : ''}`
                                  : 'No students'
                                : contact.principalData
                                  ? 'Principal'
                                  : contact.teacherData
                                    ? `Teacher • ${contact.teacherData.full_name}`
                                    : contact.isGroup
                                      ? `${contact.groupMembers?.length || 0} members`
                                      : contact.lastMessage || 'No messages yet'
                              }
                            </p>
                            {contact.unreadCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ml-2">
                                {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                              </span>
                            )}
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
    
      <div className="flex-1 min-w-0 flex flex-col bg-card">
        {(() => {
          console.log('=== CHAT AREA RENDER ===');
          console.log('ActiveChat:', activeChat);
          console.log('CurrentThreadId:', currentThreadId);
          console.log('Messages count:', messages.length);
          return null;
        })()}
        {activeChat ? (
          <>
            {(() => {
              console.log('=== RENDERING CHAT FOR ===', activeChat.name);
              return null;
            })()}
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    {getTypeIcon(activeChat.type)}
                  </div>

                  <div className={`absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full transition-colors duration-200 border border-background ${
                    websocket?.isConnected() ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </div>
                <div>
                  <h2 className="font-medium text-sm">
                    {activeChat.threadData
                      ? activeChat.name
                      : activeChat.parentData ? activeChat.parentData.full_name
                      : activeChat.principalData ? activeChat.principalData.full_name
                      : activeChat.teacherData ? activeChat.teacherData.full_name
                      : activeChat.name}
                  </h2>
                  {activeChat.parentData && 'linked_students' in activeChat.parentData ? (
                    activeChat.parentData.linked_students.length > 0 ? (
                      activeChat.parentData.linked_students.map((student: StudentData, index: number) => (
                        <div key={index}>
                          <p className="text-xs text-muted-foreground">
                            {student.student_name} • Grade {student.teacher_assignments?.[0]?.class_name.split(' ')[1]} {student.teacher_assignments?.[0]?.class_name.split(' ')[2]}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No students linked
                      </p>
                    )
                  ) : activeChat.principalData ? (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Principal
                      </p>
                    </div>
                  ) : activeChat.isGroup ? (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Group • {activeChat.groupMembers?.length || 0} members
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {activeChat.isOnline ? 'Online' : 'Offline'}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
       
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-400 shrink-0">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}



   
            <div className="flex-1 min-h-0 flex flex-col">
              {selectingParent ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading chat...</p>
                  </div>
                </div>
              ) : messagesLoading ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {[0,1,2,3,4,5].map((i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex items-end gap-2 max-w-[85%] ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                        <div className={`rounded-2xl ${i % 2 === 0 ? 'rounded-bl-md' : 'rounded-br-md'} bg-muted animate-pulse h-6 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Sticky Date Header at Top */}
                  {currentVisibleDate && (
                    <div className="sticky top-0 z-30 flex justify-center py-2 bg-card/95 backdrop-blur-sm border-b border-border/50">
                      <div className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium shadow-sm">
                        {getDateLabel(currentVisibleDate)}
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-1 relative">
                    {messages.map((message, index) => {
                      const showDateHeader = index === 0 || 
                        (index > 0 && !isSameDay(message.created_at || message.timestamp, messages[index - 1].created_at || messages[index - 1].timestamp));
                      
                      return (
                        <div key={message.id}>
                        
                          {showDateHeader && (
                            <div 
                              className="sticky top-4 z-20 flex justify-center my-4"
                              data-date-header
                              data-date={message.created_at || message.timestamp}
                            >
                              <div className="text-xs px-3 py-1.5 rounded-full bg-muted/90 text-muted-foreground shadow-md backdrop-blur-md border border-border/50">
                                {getDateLabel(message.created_at || message.timestamp)}
                              </div>
                            </div>
                          )}
                        
             
                        <div className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
                          <div className={`flex items-end gap-2 max-w-[85%] ${message.isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar for all chats (sender avatar on respective side) */}
                            {(() => {
                              const nameForAvatar = message.isOwn ? (user?.full_name || 'Me') : (message.senderName || 'User');
                              const hue = Array.from(nameForAvatar).reduce((a,c)=>a+c.charCodeAt(0),0)%360;
                              const bg = `hsl(${hue}, 80%, 90%)`;
                              const fg = `hsl(${hue}, 70%, 35%)`;
                              const initials = nameForAvatar.split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
                              return (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium select-none flex-shrink-0"
                                  style={{ backgroundColor: bg, color: fg }}
                                  aria-hidden
                                >
                                  {initials}
                                </div>
                              );
                            })()}

                            <div className="flex flex-col max-w-full">
                              {/* Sender name for group chats */}
                              {!message.isOwn && activeChat?.isGroup && (
                                <div
                                  className="text-xs font-medium mb-1 px-1"
                                  style={{
                                    color: `hsl(${(Array.from(message.senderName).reduce((a,c)=>a+c.charCodeAt(0),0)%360)}, 70%, 40%)`
                                  }}
                                >
                                  {message.senderName}
                                </div>
                              )}
                              
                              {/* Message bubble */}
                              <div
                                className={`relative px-4 py-2.5 leading-relaxed text-sm break-words shadow-sm
                                  ${message.isOwn
                                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                                    : 'bg-muted text-foreground rounded-2xl rounded-bl-md'}
                                `}
                                style={{
                                  maxWidth: '100%',
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word'
                                }}
                              >
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                                
                                {/* Timestamp and status */}
                                <div className={`flex items-center gap-1 mt-1.5 text-xs opacity-75 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                                  <span className="text-xs">{formatTime(message.created_at || message.timestamp)}</span>
                                  {message.isOwn && (
                                    <div className="ml-1">
                                      {getStatusIcon(message.status)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                                      })}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              )}
            </div>
            
     
            <div className="px-3 py-2 border-t shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  placeholder={selectingParent || messagesLoading ? "Loading chat..." : "Type a message..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-grow h-10 text-sm"
                  disabled={selectingParent || messagesLoading}
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || selectingParent || messagesLoading}
                  className="h-10 w-10 p-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              {selectingParent ? (
                <>
                  <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Opening Chat...
                  </h3>
                  <p className="text-muted-foreground">
                    Please wait while we open the selected parent&apos;s chat
                  </p>
                </>
              ) : (
                <>
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    {loading ? 'Loading...' : 'Select a chat'}
                  </h3>
                  <p className="text-muted-foreground">
                    {loading ? 'Please wait while we load your chats...' : 'Choose a parent, principal, or group from the list to start messaging'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
