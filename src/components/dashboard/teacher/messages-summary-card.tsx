// src/components/dashboard/teacher/messages-summary-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { chatThreadsServices, ChatThread } from '@/lib/api/chat-threads';

export function MessagesSummaryCard() {
  const { token } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) { setLoading(false); return; }
      try {
        setLoading(true);
        const resp = await chatThreadsServices.getChatThreads(token);
        const list = resp.data?.threads || [];
        if (mounted) setThreads(list.slice(0, 3));
      } catch {
        if (mounted) setThreads([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Messages</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link href="/messages">Open</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading messages...</div>
        ) : threads.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recent conversations.</div>
        ) : (
          <div className="space-y-2">
            {threads.map((t) => (
              <Link key={t.id} href={`/messages`} className="block border rounded-lg p-3 hover:bg-muted/50">
                <div className="flex items-start gap-2">
                  <div className="rounded-full bg-primary/10 p-2"><MessageSquare className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.title || 'Conversation'}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.last_message?.content || 'No messages yet'}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

