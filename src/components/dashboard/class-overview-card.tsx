// src/components/dashboard/class-overview-card.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { academicServices } from '@/lib/api';

interface TeacherClass {
  id: string;
  name: string;
  division: string;
  studentCount: number;
  teacherRole: 'class_teacher' | 'subject_teacher';
  subject?: string;
  classDivisionId: string;
  assignmentId: string;
}

export function ClassOverviewCard() {
  const { token } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherClasses = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await academicServices.getMyTeacherInfo(token);

        if (response.status === 'success' && response.data.assigned_classes) {
          // Transform the API data to match our interface
          // No need for sequential API calls - student counts are already included!
          const transformedClasses = response.data.assigned_classes.map((assignment) => {
            // Extract class name from class_level
            const className = assignment.class_level || 'Unknown Class';
            const division = assignment.division || 'Unknown Division';

            return {
              id: `${assignment.assignment_id}-${assignment.class_division_id}`,
              name: className,
              division: division,
              studentCount: assignment.student_count, // Use the student count from the API response
              teacherRole: assignment.assignment_type === 'class_teacher' ? 'class_teacher' : 'subject_teacher' as 'class_teacher' | 'subject_teacher',
              subject: assignment.subject || undefined,
              classDivisionId: assignment.class_division_id,
              assignmentId: assignment.assignment_id
            };
          });

          setClasses(transformedClasses);
        }
      } catch (error) {
        console.error('Error fetching teacher classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherClasses();
  }, [token]);

  // Separate classes by role
  const classTeacherClasses = classes.filter(cls => cls.teacherRole === 'class_teacher');
  const subjectTeacherClasses = classes.filter(cls => cls.teacherRole === 'subject_teacher');

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Class Overview</h2>
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <Link href="/classes">
              View All
            </Link>
          </Button>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          Loading classes...
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Class Overview</h2>
        <Button variant="ghost" size="sm" className="text-xs" asChild>
          <Link href="/classes">
            View All
          </Link>
        </Button>
      </div>
      
      {/* Class Teacher Section */}
      {classTeacherClasses.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium text-muted-foreground mb-3">As Class Teacher</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classTeacherClasses.map((classItem) => (
              <Card key={classItem.assignmentId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    {classItem.name} - {classItem.division}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{classItem.studentCount} students</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Class Teacher
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Subject Teacher Section */}
      {subjectTeacherClasses.length > 0 && (
        <div>
          <h3 className="text-md font-medium text-muted-foreground mb-3">As Subject Teacher</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectTeacherClasses.map((classItem) => (
              <Card key={classItem.assignmentId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    {classItem.name} - {classItem.division}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{classItem.studentCount} students</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Subject: {classItem.subject}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Classes Message */}
      {classes.length === 0 && !loading && (
        <div className="text-center py-8 text-muted-foreground">
          No classes assigned yet.
        </div>
      )}
    </div>
  );
}