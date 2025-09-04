// src/app/(admin)/staff/assign-subjects/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useStaff } from '@/hooks/use-staff';

import { teachersServices } from '@/lib/api/teachers';
import type { Staff } from '@/types/staff';
import type { Subject } from '@/types/academic';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle,
  AlertTriangle,
  Loader2,
  User,
  GraduationCap
} from 'lucide-react';

export default function AssignSubjectsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { assignSubjectsToTeacher } = useStaff();

  // State for teachers and selected teacher
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<Staff | null>(null);

  // Subject assignment state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'replace' | 'append'>('replace');
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Available subjects state
  const [availableSubjects, setAvailableSubjects] = useState<Array<{id: string, name: string, code: string, is_active: boolean}>>([]);
  const [availableSubjectsLoading, setAvailableSubjectsLoading] = useState(false);

  // Fetch available subjects
  const fetchAvailableSubjects = useCallback(async () => {
    if (!token) return;

    try {
      setAvailableSubjectsLoading(true);

      const response = await fetch('https://ajws-school-ba8ae5e3f955.herokuapp.com/api/academic/subjects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Filter only active subjects
        const activeSubjects = result.data.subjects.filter((subject: Subject) => subject.is_active);
        setAvailableSubjects(activeSubjects);
      } else {
        console.error('Failed to fetch subjects:', result);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setAvailableSubjectsLoading(false);
    }
  }, [token]);

  // Load teachers
  useEffect(() => {
    const loadTeachers = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await teachersServices.getAllTeachers(token);

        if (response.status === 'success') {
          // Convert API teachers to Staff format for compatibility
          const teacherStaff: Staff[] = response.data.teachers.map((teacher, index) => ({
            id: teacher.staff_id || `teacher-${teacher.teacher_id}-${index}`, // Fallback to unique ID if staff_id is null
            user_id: teacher.user_id,
            full_name: teacher.full_name,
            phone_number: teacher.phone_number,
            role: 'teacher',
            department: teacher.department,
            designation: teacher.designation,
            is_active: teacher.is_active,
            created_at: new Date().toISOString(), // Set current date as fallback
            teacher_id: teacher.teacher_id,
            teaching_details: {
              class_teacher_of: [],
              subject_teacher_of: [],
              subjects_taught: [],
              total_classes: 0
            }
          }));
          setTeachers(teacherStaff);
        } else {
          setError('Failed to load teachers');
        }
      } catch (err) {
        console.error('Error loading teachers:', err);
        setError('Failed to load teachers');
      } finally {
        setLoading(false);
      }
    };

    loadTeachers();
    fetchAvailableSubjects();
  }, [token, fetchAvailableSubjects]);

  // Update selected teacher when selection changes
  useEffect(() => {
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    setSelectedTeacher(teacher || null);
    // Reset subjects when teacher changes
    setSelectedSubjects([]);
  }, [selectedTeacherId, teachers]);

  // Handle subject selection
  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  // Handle subject assignment
  const handleSubjectAssignment = async () => {
    if (!selectedTeacher?.teacher_id || selectedSubjects.length === 0) {
      return;
    }

    setAssignmentLoading(true);
    try {
      const response = await assignSubjectsToTeacher(selectedTeacher.teacher_id, {
        subjects: selectedSubjects,
        mode: assignmentMode
      });

      if (response?.status === 'success') {
        // Show success message
        console.log('Subjects assigned successfully:', response.data);

        // Reset form
        setSelectedSubjects([]);
        setSelectedTeacherId('');
        setSelectedTeacher(null);
        setAssignmentMode('replace');

        // Optionally refresh teachers list
        // await loadTeachers();
      } else {
        console.error('Failed to assign subjects');
      }
    } catch (error) {
      console.error('Error assigning subjects:', error);
    } finally {
      setAssignmentLoading(false);
    }
  };



  // Only allow admins and principals to access this page
  if (user?.role !== 'admin' && user?.role !== 'principal') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Only admins and principals can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container max-w-4xl mx-auto py-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading teachers...</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container max-w-6xl mx-auto py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Staff
          </Button>

          <div className="flex items-center gap-4 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookMarked className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Assign Subjects to Teachers</h1>
              <p className="text-muted-foreground">
                Select a teacher and assign subjects they will teach
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                ×
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Teacher Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Select Teacher
              </CardTitle>
              <CardDescription>
                Choose the teacher to assign subjects to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teacher-select">Teacher *</Label>
                <Select
                  value={selectedTeacherId}
                  onValueChange={setSelectedTeacherId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {teacher.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{teacher.full_name}</span>
                            <span className="text-muted-foreground text-xs ml-2">
                              {teacher.phone_number}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Teacher Info */}
              {selectedTeacher && (
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedTeacher.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{selectedTeacher.full_name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedTeacher.phone_number}</p>
                    </div>
                  </div>

                  {/* Current subjects */}
                  {selectedTeacher.teaching_details?.subjects_taught && selectedTeacher.teaching_details.subjects_taught.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Currently assigned subjects:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedTeacher.teaching_details.subjects_taught.map((subject, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Assign Subjects
              </CardTitle>
              <CardDescription>
                Choose subjects to assign to the selected teacher
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assignment Mode */}
              <div className="space-y-2">
                <Label>Assignment Mode</Label>
                <Select
                  value={assignmentMode}
                  onValueChange={(value: 'replace' | 'append') => setAssignmentMode(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replace">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Replace existing subjects
                      </div>
                    </SelectItem>
                    <SelectItem value="append">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        Add to existing subjects
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {assignmentMode === 'replace'
                    ? 'This will replace all existing subjects with the selected ones.'
                    : 'This will add the selected subjects to the existing ones.'
                  }
                </p>
              </div>

              {/* Subject Selection */}
              <div className="space-y-3">
                <Label>Select Subjects *</Label>
                {availableSubjectsLoading ? (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Loading subjects...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-3 border rounded-lg bg-muted/30">
                    {availableSubjects.map((subject) => (
                      <div key={subject.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`subject-${subject.id}`}
                          checked={selectedSubjects.includes(subject.name)}
                          onCheckedChange={() => handleSubjectToggle(subject.name)}
                          disabled={!selectedTeacher}
                        />
                        <Label
                          htmlFor={`subject-${subject.id}`}
                          className="text-sm cursor-pointer flex-1 truncate"
                        >
                          {subject.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected subjects preview */}
                {selectedSubjects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected subjects:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSubjects.map((subject) => (
                        <Badge key={subject} variant="default" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={assignmentLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubjectAssignment}
            disabled={assignmentLoading || !selectedTeacher || selectedSubjects.length === 0}
            className="flex items-center gap-2"
          >
            {assignmentLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <BookMarked className="h-4 w-4" />
                Assign {selectedSubjects.length} Subject{selectedSubjects.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
