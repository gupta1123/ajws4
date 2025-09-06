'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User } from 'lucide-react';
import { parentServices, type Parent } from '@/lib/api/parents';
import { checkExistingThread, startConversation, type CheckExistingThreadResponse, type StartConversationResponse } from '@/lib/api/messages';
import { useAuth } from '@/lib/auth/context';

interface StartNewChatParentAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onParentThreadReady: (threadId: string) => void;
}

export function StartNewChatParentAdminModal({ open, onOpenChange, onParentThreadReady }: StartNewChatParentAdminModalProps) {
  const { token, user } = useAuth();
  const [parents, setParents] = useState<Parent[]>([]);
  const [filtered, setFiltered] = useState<Parent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParents = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await parentServices.getAllParents(token, { page: 1, limit: 50 });
      if (res && typeof res === 'object' && 'status' in res && res.status === 'success' && 'data' in res && res.data) {
        const list = res.data.parents;
        setParents(list);
        setFiltered(list);
      } else {
        setError('Failed to load parents');
      }
    } catch {
      setError('Failed to load parents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open && token) fetchParents();
  }, [open, token, fetchParents]);

  useEffect(() => {
    if (!search) { setFiltered(parents); return; }
    const s = search.toLowerCase();
    setFiltered(parents.filter(p => p.full_name.toLowerCase().includes(s) || p.phone_number.includes(s) || (p.email || '').toLowerCase().includes(s)));
  }, [search, parents]);

  const handleSelectParent = async (parent: Parent) => {
    if (!user?.id) return;
    try {
      // Try to find existing direct thread
      const check = await checkExistingThread({ participants: [parent.id], thread_type: 'direct' }, token || undefined);
      if (check && typeof check === 'object' && 'status' in check && check.status === 'success' && 'data' in check) {
        const checkData = check.data as unknown as CheckExistingThreadResponse['data'];
        if (checkData.exists && checkData.thread?.id) {
          onParentThreadReady(checkData.thread.id);
          onOpenChange(false);
          return;
        }
      }

      // Start new conversation
      const start = await startConversation({
        participants: [parent.id],
        message_content: `Hello ${parent.full_name}`,
        thread_type: 'direct',
        title: `Chat with ${parent.full_name}`,
      }, token || undefined);

      if (start && typeof start === 'object' && 'status' in start && start.status === 'success' && 'data' in start) {
        const startData = start.data as unknown as StartConversationResponse['data'];
        onParentThreadReady(startData.thread.id);
        onOpenChange(false);
        return;
      }
      setError('Failed to start chat');
    } catch {
      setError('Failed to start chat');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSearch('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Start New Chat with Parent
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parents by name, phone or email..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading parents...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {search ? 'No matches found' : 'No parents available'}
                </h3>
                <p className="text-muted-foreground">
                  {search ? 'Try adjusting your search terms' : 'No parents found.'}
                </p>
              </div>
            ) : (
              filtered.map((p) => (
                <div
                  key={p.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectParent(p)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground truncate">{p.full_name}</h4>
                        {!p.is_registered && (
                          <Badge variant="outline" className="text-xs">Unregistered</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{p.phone_number}{p.email ? ` • ${p.email}` : ''}</p>
                      {p.children && p.children.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Child: {p.children[0].full_name}{p.children.length > 1 ? ` +${p.children.length - 1} more` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
