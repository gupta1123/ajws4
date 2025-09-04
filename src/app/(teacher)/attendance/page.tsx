// src/app/(teacher)/attendance/page.tsx

'use client';

import { useAuth } from '@/lib/auth/context';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { academicServices } from '@/lib/api/academic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Calendar,
  Filter,
  Users,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { attendanceApi } from '@/lib/api/attendance';




// Interface for class data
interface ClassData {
  id: string;
  name: string;
  division: string;
  studentCount: number;
}

export default function AttendancePage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTeacherData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);

      // Get teacher complete information including primary classes with student counts
      const teacherInfoResponse = await academicServices.getMyTeacherInfo(token);

      // Handle Blob response (shouldn't happen for this endpoint)
      if (teacherInfoResponse instanceof Blob) {
        console.error('Unexpected Blob response');
        return;
      }

      if (teacherInfoResponse && teacherInfoResponse.status === 'success') {
        const teacherData = teacherInfoResponse.data;

        // Use primary classes directly from the new API (already filtered and includes student counts)
        const classList: ClassData[] = teacherData.primary_classes.map(cls => ({
          id: cls.class_division_id,
          name: cls.class_level, // e.g., "Grade 1"
          division: cls.division, // e.g., "B"
          studentCount: cls.student_count
        }));

        setClasses(classList);
      }
    } catch (error) {
      console.error('Failed to load teacher data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load teacher's classes and summary data
  useEffect(() => {
    if (token && user?.role === 'teacher') {
      loadTeacherData();
    }
  }, [token, user, loadTeacherData]);

  // Only allow teachers to access this page
  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Only teachers can access this page.</p>
        </div>
      </div>
    );
  }

  const handleTakeAttendance = () => {
    if (selectedClass && date) {
      router.push(`/attendance/${selectedClass}?date=${date}`);
    }
  };

  const handleRefresh = () => {
    loadTeacherData();
  };

  // Filter classes based on search term
  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.division.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unmarked attendance classes - since we don't have attendance history, show all classes
  const unmarkedClasses = classes; // All classes are considered unmarked since we don't have history

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Take Attendance</CardTitle>
                    <CardDescription>
                      Select a class and date to take attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="date" className="text-sm font-medium">
                          Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="pl-10"
                            max={new Date().toISOString().split('T')[0]} // Can't mark future dates
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="class" className="text-sm font-medium">
                          Class
                        </label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name} - Section {cls.division}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleTakeAttendance}
                      disabled={!selectedClass || !date || loading}
                      className="w-full"
                    >
                      {loading ? 'Loading...' : 'Take Attendance'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Class Overview</CardTitle>
                    <CardDescription>
                      View your assigned classes and their details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search classes..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Button variant="outline">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                      </Button>
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p>Loading classes...</p>
                      </div>
                    ) : filteredClasses.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-8 w-8 mx-auto mb-2" />
                        <p>No classes found</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-4 font-medium">Class</th>
                              <th className="text-left p-4 font-medium">Students</th>
                              <th className="text-right p-4 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredClasses.map((cls) => (
                              <tr key={cls.id} className="border-b hover:bg-muted/50">
                                <td className="p-4">
                                  <div className="font-medium">{cls.name} - Section {cls.division}</div>
                                </td>
                                <td className="p-4">
                                  <div className="font-medium">{cls.studentCount}</div>
                                </td>
                                <td className="p-4 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedClass(cls.id);
                                      setDate(new Date().toISOString().split('T')[0]);
                                      router.push(`/attendance/${cls.id}?date=${new Date().toISOString().split('T')[0]}`);
                                    }}
                                  >
                                    Take Attendance
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
      </div>
    </ProtectedRoute>
      );
    }
