// src/components/dashboard/teacher/work-items-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth/context';
import { homeworkServices } from '@/lib/api/homework';
import { classworkServices } from '@/lib/api/classwork';
import { BookOpenCheck, ClipboardList, Paperclip } from 'lucide-react';
import Link from 'next/link';

type HW = { id: string; title: string; due_date?: string; class_division_id?: string; subject?: string };
type CW = { id: string; summary: string; date?: string; class_division_id?: string; subject?: string };

function fmtDate(d?: string) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(); } catch { return d; }
}

export function WorkItemsCard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<HW[]>([]);
  const [classwork, setClasswork] = useState<CW[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) { setLoading(false); return; }
      try {
        setLoading(true);
        const today = new Date();
        const next7 = new Date(today.getTime() + 7 * 86400000);
        const hwResp = await homeworkServices.getHomework(token, {
          date_to: next7.toISOString().slice(0,10)
        });
        const cwResp = await classworkServices.getClasswork(token, 1, 5, {
          date_from: new Date(today.getTime() - 7 * 86400000).toISOString().slice(0,10)
        });

        const hwList = (hwResp as any)?.data?.homework || [];
        const cwList = (cwResp as any)?.data?.classwork || [];
        if (mounted) {
          setHomework(hwList.slice(0,5));
          setClasswork(cwList.slice(0,5));
        }
      } catch (e) {
        if (mounted) { setHomework([]); setClasswork([]); }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Homework & Classwork</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading work items...</div>
        ) : (
          <Tabs defaultValue="homework">
            <TabsList>
              <TabsTrigger value="homework">Due Soon</TabsTrigger>
              <TabsTrigger value="classwork">Recent Classwork</TabsTrigger>
            </TabsList>
            <TabsContent value="homework" className="mt-3 space-y-2">
              {homework.length === 0 ? (
                <div className="text-sm text-muted-foreground">No homework due soon.</div>
              ) : homework.map((hw: any) => (
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
            </TabsContent>
            <TabsContent value="classwork" className="mt-3 space-y-2">
              {classwork.length === 0 ? (
                <div className="text-sm text-muted-foreground">No recent classwork.</div>
              ) : classwork.map((cw: any) => (
                <Link key={cw.id} href={`/classwork`} className="block border rounded-lg p-3 hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2"><ClipboardList className="h-4 w-4" /> {cw.summary || 'Classwork'}</div>
                      <div className="text-xs text-muted-foreground truncate">{cw.subject} • {fmtDate(cw.date)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

