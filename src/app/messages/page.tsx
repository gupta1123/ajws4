'use client';

import { Button } from '@/components/ui/button';
import { Users, MessageSquare, Filter, Loader2, AlertCircle, Calendar, UserCheck, UserX, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ChatInterface } from '@/components/messages/chat-interface';
import { StartNewChatModal } from '@/components/messages/start-new-chat-modal';
import { StartNewChatAdminModal } from '@/components/messages/start-new-chat-admin-modal';
import { StartNewChatParentAdminModal } from '@/components/messages/start-new-chat-parent-admin-modal';
import { StartChatParentsByClassModal } from '@/components/messages/start-chat-parents-by-class-modal';
import { StartChatTeacherModal } from '@/components/messages/start-chat-teacher-modal';
import { useToast } from '@/hooks/use-toast';
import { checkExistingThread, startConversation } from '@/lib/api/messages';
import { useAuth } from '@/lib/auth/context';
import { usePrincipalChats } from '@/hooks/use-principal-chats';
import { useClassDivisions } from '@/hooks/use-class-divisions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/date-picker/calendar';

export default function MessagesPage() {
  const { toast } = useToast();
  const { user, token } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [isStartNewChatModalOpen, setIsStartNewChatModalOpen] = useState(false);
  const [isStartNewChatAdminModalOpen, setIsStartNewChatAdminModalOpen] = useState(false);
  const [isStartNewChatParentAdminModalOpen, setIsStartNewChatParentAdminModalOpen] = useState(false);
  const [isStartChatParentsByClassOpen, setIsStartChatParentsByClassOpen] = useState(false);
  const [isStartChatTeacherModalOpen, setIsStartChatTeacherModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Hooks for admin/principal functionality
  const { chatsData, loading, error, filters, updateFilters, refreshChats } = usePrincipalChats();
  const { classDivisionsList } = useClassDivisions();

  const isAdminOrPrincipal = user?.role === 'admin' || user?.role === 'principal';

  // Page-level skeleton loader
  useEffect(() => {
    if (isAdminOrPrincipal) {
      // Use hook loading state for admin/principal skeleton
      setPageLoading(loading);
    } else {
      // Brief initial skeleton for teachers
      const t = setTimeout(() => setPageLoading(false), 600);
      return () => clearTimeout(t);
    }
  }, [isAdminOrPrincipal, loading]);


  const handleParentSelected = (parent: { parent_id: string; full_name: string }) => {
    // Close the modal
    setIsStartNewChatModalOpen(false);
    
    // Set the selected parent ID to open their chat
    setSelectedParentId(parent.parent_id);
    
    // Don't trigger refresh key for parent selection - let the ChatInterface handle it
    // setRefreshKey(prev => prev + 1);
    
    // Show success toast
    toast({
      title: "Chat Started!",
      description: `Chat opened with ${parent.full_name}`,
      variant: "success"
    });
    
    console.log('Parent selected for chat:', parent);
  };

  const handleTeacherSelected = async (teacher: { teacher_id: string; full_name: string; user_id?: string }) => {
    // Close the modal
    setIsStartNewChatAdminModalOpen(false);

    try {
      // We need a user_id to start/check a conversation
      if (!user?.id) throw new Error('Missing current user');
      if (!teacher.user_id) throw new Error('Selected teacher is missing user ID');

      // Check if a thread already exists between admin/principal and the teacher

      const checkResp = await checkExistingThread({
        participants: [teacher.user_id],
        thread_type: 'direct',
      }, token || undefined);

      let threadId: string | null = null;
      if (checkResp && typeof checkResp === 'object' && 'status' in checkResp && checkResp.status === 'success' && 'data' in checkResp && checkResp.data) {
        const data = checkResp.data as unknown as { exists: boolean; thread?: { id: string } };
        if (data.exists && data.thread?.id) {
          threadId = data.thread.id;
        }
      }

      if (!threadId) {
        // Create a new conversation
        const startResp = await startConversation({
          participants: [teacher.user_id],
          message_content: `Hello ${teacher.full_name}`,
          thread_type: 'direct',
          title: `Chat with ${teacher.full_name}`,
        }, token || undefined);

        if (startResp && typeof startResp === 'object' && 'status' in startResp && startResp.status === 'success' && 'data' in startResp && startResp.data) {
          const data = startResp.data as unknown as { thread: { id: string } };
          threadId = data.thread.id;
        }
      }

      if (threadId) {
        // Trigger refresh and select the created/found thread
        setRefreshKey(prev => prev + 1);
        if (isAdminOrPrincipal) {
          refreshChats();
        }
        setSelectedParentId(threadId);
        setSelectedThreadId(threadId);
        toast({ title: 'Chat Ready', description: `Opening conversation with ${teacher.full_name}` });
      } else {
        throw new Error('Failed to open or create chat');
      }
    } catch (err) {
      console.error('Failed to start/open teacher chat:', err);
      toast({ title: 'Could not start chat', variant: 'error', description: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleTeacherChatStarted = (threadId: string, isExisting: boolean) => {
    // Close the modal
    setIsStartChatTeacherModalOpen(false);

    // Trigger a refresh of the chat interface to show the new thread
    setRefreshKey(prev => prev + 1);

    // Actively select the opened/created thread so it focuses immediately
    setSelectedParentId(threadId);
    setSelectedThreadId(threadId);

    // Show appropriate success toast based on whether it's existing or new
    if (isExisting) {
      toast({
        title: "Chat Opened!",
        description: "Opening your existing conversation.",
        variant: "default"
      });
    } else {
      toast({
        title: "Chat Created!",
        description: "Your new chat has been created and is now available in your chat list.",
        variant: "success"
      });
    }

    console.log(`Teacher ${isExisting ? 'opened existing' : 'created new'} chat with thread ID:`, threadId);
  };

  const handleParentThreadReady = (threadId: string) => {
    setIsStartNewChatParentAdminModalOpen(false);
    setRefreshKey(prev => prev + 1);
    if (isAdminOrPrincipal) {
      refreshChats();
    }
    setSelectedParentId(threadId);
    setSelectedThreadId(threadId);
    toast({ title: 'Chat Ready', description: 'Opening conversation with parent' });
  };

  // Clear selected parent ID after the chat interface has had time to process it
  useEffect(() => {
    if (refreshKey > 0 && (selectedParentId || selectedThreadId)) {
      // Give more time for the chat interface to load and select the parent
      const timer = setTimeout(() => {
        setSelectedParentId(null);
        setSelectedThreadId(null);
      }, 2000); // Increased from 1000ms to 2000ms to ensure proper loading
      return () => clearTimeout(timer);
    }
  }, [refreshKey, selectedParentId, selectedThreadId]);



  // Handle class division filter change
  const handleClassDivisionChange = (classDivisionId: string) => {
    updateFilters({ class_division_id: classDivisionId === 'all' ? undefined : classDivisionId });
  };

  // Participation filter removed; default includes_me is always 'yes'



  // Clear all filters
  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    updateFilters({
      chat_type: 'all',
      includes_me: 'yes',
      class_division_id: undefined,
      start_date: undefined,
      end_date: undefined
    });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.chat_type !== 'all' || 
                          filters.includes_me !== 'yes' || 
                          filters.class_division_id || 
                          startDate || 
                          endDate;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-full max-w-6xl px-4">
          <div className="mb-6 h-10 w-48 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded" />
            </div>
            <div className="lg:col-span-2 space-y-3">
              <div className="h-12 bg-muted animate-pulse rounded" />
              <div className="h-64 bg-muted animate-pulse rounded" />
              <div className="h-12 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAdminOrPrincipal && error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Chats</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tabs and Actions */}
      <div className="flex flex-col gap-4">
        {/* Action Buttons */}
        {isAdminOrPrincipal && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsStartNewChatAdminModalOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chat with Teacher
            </Button>
            <Button variant="outline" onClick={() => setIsStartChatParentsByClassOpen(true)}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chat with Parents
            </Button>
          </div>
        )}

        {/* Filters Section */}
        {isAdminOrPrincipal && (
          <div className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Filters</h3>
                {hasActiveFilters && (
                  <Badge variant="outline" className="text-xs">
                    {Object.values(filters).filter(v => v && v !== 'all' && v !== null).length + 
                     (startDate ? 1 : 0) + 
                     (endDate ? 1 : 0)} active
                  </Badge>
                )}
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Class Division Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Class</Label>
                <Select
                  onValueChange={handleClassDivisionChange}
                  defaultValue="all"
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classDivisionsList?.map((division) => (
                      <SelectItem key={division.id} value={division.id}>
                        {division.class_level.name} {division.division}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Participation filter removed: default includes_me = 'yes' */}

              {/* Start Date Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date) {
                          updateFilters({ start_date: format(date, 'yyyy-MM-dd') });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        if (date) {
                          updateFilters({ end_date: format(date, 'yyyy-MM-dd') });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons for Teachers */}
        {!isAdminOrPrincipal && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsStartChatTeacherModalOpen(true)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Start Chat
            </Button>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <ChatInterface
        selectedParentId={selectedParentId || undefined}
        selectedThreadId={selectedThreadId || undefined}
        isAdminOrPrincipal={isAdminOrPrincipal}
        chatsData={chatsData || undefined}
        refreshKey={refreshKey}
      />


      {/* Start New Chat Modal */}
      <StartNewChatModal
        open={isStartNewChatModalOpen}
        onOpenChange={setIsStartNewChatModalOpen}
        onParentSelected={handleParentSelected}
      />

      {/* Start New Chat Admin Modal */}
      <StartNewChatAdminModal
        open={isStartNewChatAdminModalOpen}
        onOpenChange={setIsStartNewChatAdminModalOpen}
        onTeacherSelected={handleTeacherSelected}
      />

      {/* Start New Chat Parent (Admin/Principal) Modal */}
      <StartNewChatParentAdminModal
        open={isStartNewChatParentAdminModalOpen}
        onOpenChange={setIsStartNewChatParentAdminModalOpen}
        onParentThreadReady={handleParentThreadReady}
      />

      {/* Start Chat Parents By Class (Admin/Principal) */}
      <StartChatParentsByClassModal
        open={isStartChatParentsByClassOpen}
        onOpenChange={setIsStartChatParentsByClassOpen}
        onThreadReady={(threadId) => {
          setIsStartChatParentsByClassOpen(false);
          setRefreshKey(prev => prev + 1);
          if (isAdminOrPrincipal) refreshChats();
          setSelectedParentId(threadId);
          setSelectedThreadId(threadId);
          toast({ title: 'Chat Ready', description: 'Opening conversation' });
        }}
      />

      {/* Start Chat Teacher Modal */}
      <StartChatTeacherModal
        open={isStartChatTeacherModalOpen}
        onOpenChange={setIsStartChatTeacherModalOpen}
        onChatStarted={handleTeacherChatStarted}
      />
    </div>
  );
}
