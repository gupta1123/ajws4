// src/components/dashboard/teacher/work-items-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/context';
import { homeworkServices } from '@/lib/api/homework';
import { BookOpenCheck, Paperclip } from 'lucide-react';
import Link from 'next/link';

type HW = { id: string; title: string; due_date?: string; class_division_id?: string; subject?: string; attachments?: unknown[] };

function fmtDate(d?: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

export function WorkItemsCard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<HW[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) { setLoading(false); return; }
      try {
        setLoading(true);
        const next7 = new Date(Date.now() + 7 * 86400000);
        const hwResp = await homeworkServices.getHomework(token, {
          date_to: next7.toISOString().slice(0,10)
        });

        const hwList = (hwResp as { data?: { homework?: HW[] } })?.data?.homework || [];
        if (mounted) {
          setHomework(hwList.slice(0,5));
        }
      } catch {
        if (mounted) { setHomework([]); }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Homework</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading homework...</div>
        ) : (
          <div className="space-y-2">
            {homework.length === 0 ? (
              <div className="text-sm text-muted-foreground">No homework due soon.</div>
            ) : homework.map((hw: HW) => (
              <Link key={hw.id} href={`/homework`} className="block border rounded-lg p-3 hover:bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2"><BookOpenCheck className="h-4 w-4" /> {hw.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{hw.subject} • Due {fmtDate(hw.due_date)}</div>
                  </div>
                  {Array.isArray(hw.attachments) && hw.attachments.length > 0 && (
                    <div title="Has attachments" className="text-muted-foreground"><Paperclip className="h-4 w-4" /></div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

