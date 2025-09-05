// src/components/dashboard/teacher/attendance-quick-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { useTeacher } from '@/lib/auth/teacher-context';
import { attendanceApi } from '@/lib/api/attendance';
import { CheckSquare, CalendarDays } from 'lucide-react';

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function AttendanceQuickCard() {
  const { token } = useAuth();
  const { teacherData } = useTeacher();
  const [pending, setPending] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token || !teacherData) { setLoading(false); return; }
      try {
        setLoading(true);
        const today = fmt(new Date());
        const classes = teacherData.assigned_classes || [];
        // Check status for up to first 6 classes to limit calls
        const selected = classes.slice(0, 6);
        const results = await Promise.all(selected.map(async (c) => {
          const resp = await attendanceApi.getAttendanceStatus(c.class_division_id, today, token);
          if (resp && 'status' in resp && resp.status === 'success') {
            const recs = (resp as any).data?.student_records || [];
            const isMarked = Array.isArray(recs) && recs.length > 0;
            return isMarked ? null : { id: c.class_division_id, name: `${c.class_name} ${c.division}` };
          }
          return { id: c.class_division_id, name: `${c.class_name} ${c.division}` };
        }));
        const list = results.filter(Boolean) as Array<{ id: string; name: string }>;
        if (mounted) setPending(list);
      } catch (e) {
        if (mounted) setPending([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, teacherData]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Attendance Quick Actions</CardTitle>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Today</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">Checking classes...</div>
        ) : pending.length === 0 ? (
          <div className="text-sm text-muted-foreground">All set. No pending attendance.</div>
        ) : (
          <div className="space-y-2">
            {pending.map((c) => (
              <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/attendance/${c.id}`} className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> Mark Now
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

