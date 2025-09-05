// src/components/dashboard/teacher/today-schedule-card.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Clock, BookOpen, Users, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useTeacher } from '@/lib/auth/teacher-context';
import { timetableApi, TimetableEntry } from '@/lib/api/timetable';

function getTodayIndex(): number {
  // API uses 1 = Monday ... 7 = Sunday (based on dayNames order)
  const js = new Date().getDay(); // 0 = Sunday ... 6 = Saturday
  return js === 0 ? 7 : js; // convert to 1..7
}

export function TodayScheduleCard() {
  const { token } = useAuth();
  const { teacherData } = useTeacher();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const teacherId = teacherData?.assignment_ids?.teacher_id;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token || !teacherId) { setLoading(false); return; }
      try {
        setLoading(true);
        const resp = await timetableApi.getTeacherTimetable(teacherId, token);
        const today = getTodayIndex();
        // Flatten timetable object if needed, else aggregate all entries with day_of_week === today
        const dayEntries: TimetableEntry[] = [];
        const table = resp.data?.timetable || resp.data?.timetable;
        if (table) {
          Object.values(table).forEach((arr) => {
            (arr as TimetableEntry[]).forEach((e) => { if (e.day_of_week === today) dayEntries.push(e); });
          });
        }
        dayEntries.sort((a, b) => a.period_number - b.period_number);
        if (mounted) setEntries(dayEntries);
      } catch {
        if (mounted) setEntries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token, teacherId]);

  const nextPeriodIdx = useMemo(() => {
    // Basic heuristic: highlight first entry as "Next" (without exact time windows)
    return entries.length > 0 ? 0 : -1;
  }, [entries]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today’s Schedule</CardTitle>
          <Link href="/timetable" className="text-xs text-muted-foreground hover:underline">View Timetable</Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading schedule...</div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">No periods scheduled today.</div>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 5).map((e, idx) => {
              const className = e.class_division?.class_level?.name || 'Class';
              const division = e.class_division?.division ? ` ${e.class_division.division}` : '';
              const subject = e.subject || 'Subject';
              const isNext = idx === nextPeriodIdx;
              return (
                <div key={e.id} className={`border rounded-lg p-3 ${isNext ? 'bg-primary/5 border-primary/20' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Period {e.period_number}
                        {isNext && (<span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Next</span>)}
                      </div>
                      <div className="mt-1 text-sm text-foreground truncate flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" /> {subject}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{className}{division}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/attendance/${e.class_division_id}`}>Take Attendance</Link>
                      </Button>
                      <div className="flex gap-2">
                        <Button asChild variant="ghost" size="icon" title="Assign Homework">
                          <Link href={`/homework/create?classId=${e.class_division_id}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`}><BookOpen className="h-4 w-4" /></Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" title="Add Classwork">
                          <Link href={`/classwork/create?classId=${e.class_division_id}${subject ? `&subject=${encodeURIComponent(subject)}` : ''}`}><Users className="h-4 w-4" /></Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" title="Message Parents">
                          <Link href={`/messages`}><MessageSquare className="h-4 w-4" /></Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

