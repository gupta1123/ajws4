// src/app/(admin)/attendance/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { usePrincipalAttendance } from '@/hooks/use-principal-attendance';
import { classDivisionsServices, ClassDivision } from '@/lib/api/class-divisions';
import { AttendanceOverviewCards } from '@/components/attendance/attendance-overview-cards';
import { ClassAttendanceTable } from '@/components/attendance/class-attendance-table';
import { Card, CardContent, CardHeader, CardTitle, } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  Users,
  CheckSquare
} from 'lucide-react';

export default function AdminAttendancePage() {
  const { user, token } = useAuth();

  const [classDivisions, setClassDivisions] = useState<ClassDivision[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDivision, setSelectedDivision] = useState<string>('');

  
  const {
    allClassesSummary,
    loading,
    error,
    selectedDate,
    selectedClassId,
    setSelectedDate,
    setSelectedClassId,
    totalClasses,
    classesWithAttendance,
    classesWithoutAttendance,
    overallAttendancePercentage,
    classAttendanceList,
  } = usePrincipalAttendance();

  const loadClassDivisions = useCallback(async () => {
    if (!token) return;

    try {
      const response = await classDivisionsServices.getClassDivisions(token);

      if (response.status === 'success') {
        setClassDivisions(response.data.class_divisions);
      }
    } catch (err) {
      console.error('Failed to load class divisions:', err);
    }
  }, [token]);

  // Load class divisions
  useEffect(() => {
    if (token && user?.role && (user.role === 'admin' || user.role === 'principal')) {
      loadClassDivisions();
    }
  }, [token, user, loadClassDivisions]);



  // Get unique classes and divisions for filters
  const uniqueClasses = Array.from(new Set(classDivisions.map(cd => cd.class_level.name))).sort();
  const uniqueDivisions = Array.from(new Set(classDivisions.map(cd => cd.division))).sort();



  // Filter attendance list based on selected class divisions
  const filteredAttendanceList = selectedClass || selectedDivision
    ? classAttendanceList.filter(attendance => {
        const classDivision = classDivisions.find(cd => cd.id === attendance.class_division_id);
        if (!classDivision) return false;

        const classMatch = !selectedClass || classDivision.class_level.name === selectedClass;
        const divisionMatch = !selectedDivision || classDivision.division === selectedDivision;
        return classMatch && divisionMatch;
      })
    : classAttendanceList;

  // Update selected class name when class is selected
  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId);
  };

  // Refresh data
  const handleRefresh = () => {
    if (selectedDate) {
      // The hook will automatically reload when selectedDate changes
      setSelectedDate(selectedDate);
    }
  };

  // Export data (placeholder for future implementation)
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  };

  // Only allow admins and principals to access this page
  if (user && user.role !== 'admin' && user.role !== 'principal') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Only admins and principals can access this section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Date Selection */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Date Selection */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <label htmlFor="date" className="text-sm font-medium">
                  Attendance Date:
                </label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>

              {allClassesSummary && (
                <div className="text-sm text-muted-foreground">
                  Academic Year: {allClassesSummary.academic_year}
                </div>
              )}
            </div>

            {/* Class and Division Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="class-filter" className="text-sm font-medium">
                  Filter by Class:
                </label>
                <select
                  id="class-filter"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="division-filter" className="text-sm font-medium">
                  Filter by Division:
                </label>
                <select
                  id="division-filter"
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">All Divisions</option>
                  {uniqueDivisions.map((division) => (
                    <option key={division} value={division}>
                      Division {division}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedClass('');
                    setSelectedDivision('');
                  }}
                  className="flex-1"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Filter Summary */}
            {(selectedClass || selectedDivision) && (
              <div className="text-sm text-muted-foreground">
                Showing {filteredAttendanceList.length} of {classAttendanceList.length} classes
                {selectedClass && ` for ${selectedClass}`}
                {selectedDivision && ` - Division ${selectedDivision}`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <AttendanceOverviewCards
        totalClasses={totalClasses}
        classesWithAttendance={classesWithAttendance}
        classesWithoutAttendance={classesWithoutAttendance}
        overallAttendancePercentage={overallAttendancePercentage}
        date={selectedDate}
      />

      {/* Main Content */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <ClassAttendanceTable
            classAttendanceList={filteredAttendanceList}
            onClassSelect={handleClassSelect}
            selectedClassId={selectedClassId}
            loading={loading}
            selectedDate={selectedDate}
          />
        </CardContent>
      </Card>



    </div>
  );
}
