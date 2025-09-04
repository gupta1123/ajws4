// src/app/(teacher)/classes/page.tsx

'use client';

import { useAuth } from '@/lib/auth/context';
import { useTeacher } from '@/lib/auth/teacher-context';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { ClassCard } from '@/components/classes/class-card';
import { academicServices } from '@/lib/api/academic';

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

// Skeleton loader for class cards
const ClassCardSkeleton = () => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="space-y-4">
        {/* Header with class name and division */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Student count */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-12" />
        </div>

        {/* Teacher role */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>

        {/* Action button */}
        <Skeleton className="h-9 w-full" />
      </div>
    </CardContent>
  </Card>
);

export default function ClassesPage() {
  const { user } = useAuth();
  const { teacherData, loading: teacherLoading, error: teacherError } = useTeacher();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    if (teacherData && teacherData.assigned_classes) {
      // Transform the teacher data to match our interface
      const transformedClasses: TeacherClass[] = teacherData.assigned_classes.map((assignment) => {
        // Extract division from class_name (e.g., "Grade 1 B" -> "B")
        const division = assignment.division;

        // Extract grade name from class_name (e.g., "Grade 1 B" -> "Grade 1")
        const name = assignment.class_level;

        return {
          id: `${assignment.assignment_id}-${assignment.class_division_id}`, // Unique ID combining assignment and class
          name: name,
          division: division,
          studentCount: assignment.student_count || 0, // Use actual student count from API
          teacherRole: assignment.assignment_type === 'class_teacher' ? 'class_teacher' : 'subject_teacher',
          subject: assignment.subject || undefined,
          classDivisionId: assignment.class_division_id,
          assignmentId: assignment.assignment_id
        };
      });

      // Show all assignments - each represents a different role or subject for the teacher
      setClasses(transformedClasses);
      setLoading(false);
    } else if (!teacherLoading) {
      // If no teacher data and not loading, set loading to false
      setLoading(false);
    }
  }, [teacherData, teacherLoading]);

  // Only allow teachers to access this page
  if (user?.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Only teachers can access this page.</p>
        </div>
      </div>
    );
  }

  // Filter and sort classes
  const filteredAndSortedClasses = classes
    .filter(cls => 
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.division.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'students') {
        return b.studentCount - a.studentCount;
      }
      return 0;
    });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container max-w-6xl mx-auto py-8">
          <div className="space-y-6">
            {/* Filters and Search Skeleton */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-10 w-[140px]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Cards Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, index) => (
                <ClassCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container max-w-6xl mx-auto py-8">
        <div className="space-y-6">
            {/* Filters and Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search classes..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Sort by Name</SelectItem>
                        <SelectItem value="students">Sort by Students</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Cards Grid */}
            {filteredAndSortedClasses.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'No classes match your search.' : 'You don\'t have any classes assigned to you yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedClasses.map((classItem) => (
                  <ClassCard
                    key={classItem.assignmentId}
                    name={classItem.name}
                    division={classItem.division}
                    studentCount={classItem.studentCount}
                    teacherRole={classItem.teacherRole}
                    subject={classItem.subject}
                  />
                ))}
              </div>
            )}
        </div>
      </div>
    </ProtectedRoute>
  );
}