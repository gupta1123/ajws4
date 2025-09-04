// src/lib/auth/teacher-context.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { academicServices } from '../api/academic';

export interface TeacherClassAssignment {
  assignment_id: string;
  class_division_id: string;
  division: string;
  class_name: string;
  class_level: string;
  sequence_number: number;
  academic_year: string;
  assignment_type: 'class_teacher' | 'subject_teacher' | 'assistant_teacher' | 'substitute_teacher';
  is_primary: boolean;
  assigned_date: string;
  subject: string | null;
  student_count?: number;
}

export interface TeacherData {
  user_id: string;
  staff_id: string;
  full_name: string;
  staff_info: {
    id: string;
    department: string;
    designation: string;
  };
  assignment_ids: {
    teacher_id: string;
    staff_id: string;
  };
  assigned_classes: TeacherClassAssignment[];
  primary_classes: TeacherClassAssignment[];
  secondary_classes: TeacherClassAssignment[];
  total_assigned_classes: number;
  total_primary_classes: number;
  total_secondary_classes: number;
  total_students: number;
  has_assignments: boolean;
  using_legacy_data: boolean;
  assignment_summary: {
    primary_teacher_for: number;
    subject_teacher_for: number;
    assistant_teacher_for: number;
    substitute_teacher_for: number;
  };
  subjects_taught: string[];
}

interface TeacherContextType {
  teacherData: TeacherData | null;
  loading: boolean;
  error: string | null;
  refreshTeacherData: () => Promise<void>;
  clearTeacherData: () => void;
  hasClassAssignment: (classDivisionId: string) => boolean;
  getPrimaryClasses: () => TeacherClassAssignment[];
  getSecondaryClasses: () => TeacherClassAssignment[];
  getSubjectAssignments: () => TeacherClassAssignment[];
  getSubjectsTaught: () => string[];
  getTotalStudents: () => number;
  getAssignmentSummary: () => TeacherData['assignment_summary'] | null;
  isUsingLegacyData: () => boolean;
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

const TEACHER_DATA_KEY = 'teacherData';

// Standalone function to fetch teacher data (used by auth context)
export const fetchTeacherData = async (token: string, setTeacherData?: (data: TeacherData | null) => void): Promise<void> => {
  if (!token) return;

  try {
    const response = await academicServices.getMyTeacherInfo(token);

    if (response && typeof response === 'object' && 'status' in response && response.status === 'success' && response.data) {
      const data = response.data;

      // Store in localStorage
      localStorage.setItem(TEACHER_DATA_KEY, JSON.stringify(data));

      // Update state if setter provided
      if (setTeacherData) {
        setTeacherData(data);
      }
    } else {
      throw new Error('Failed to fetch teacher data');
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teacher data';
    console.error('Error fetching teacher data:', err);
    throw err; // Re-throw to let caller handle
  }
};

export function TeacherProvider({ children }: { children: ReactNode }) {
  const [teacherData, setTeacherData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teacher data from localStorage on mount
  useEffect(() => {
    const storedTeacherData = localStorage.getItem(TEACHER_DATA_KEY);
    if (storedTeacherData) {
      try {
        setTeacherData(JSON.parse(storedTeacherData));
      } catch (err) {
        console.error('Error parsing stored teacher data:', err);
        localStorage.removeItem(TEACHER_DATA_KEY);
      }
    }
  }, []);

  const fetchTeacherDataInternal = async (token: string): Promise<void> => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Use the standalone function
      await fetchTeacherData(token, setTeacherData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teacher data';
      setError(errorMessage);
      console.error('Error fetching teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshTeacherData = async (): Promise<void> => {
    const token = localStorage.getItem('token');
    if (token) {
      await fetchTeacherDataInternal(token);
    }
  };

  const clearTeacherData = (): void => {
    setTeacherData(null);
    setError(null);
    localStorage.removeItem(TEACHER_DATA_KEY);
  };

  const value = {
    teacherData,
    loading,
    error,
    refreshTeacherData,
    clearTeacherData,
    // Utility function to check if teacher has specific class assignment
    hasClassAssignment: (classDivisionId: string) => {
      return teacherData?.assigned_classes.some(
        assignment => assignment.class_division_id === classDivisionId
      ) || false;
    },
    // Utility function to get primary classes (use API data if available, fallback to filtering)
    getPrimaryClasses: () => {
      return teacherData?.primary_classes || teacherData?.assigned_classes.filter(
        assignment => assignment.assignment_type === 'class_teacher' || assignment.is_primary
      ) || [];
    },
    // Utility function to get secondary classes (use API data if available, fallback to filtering)
    getSecondaryClasses: () => {
      return teacherData?.secondary_classes || teacherData?.assigned_classes.filter(
        assignment => assignment.assignment_type !== 'class_teacher' && !assignment.is_primary
      ) || [];
    },
    // Utility function to get subject assignments
    getSubjectAssignments: () => {
      return teacherData?.assigned_classes.filter(
        assignment => assignment.assignment_type === 'subject_teacher'
      ) || [];
    },
    // Utility function to get subjects taught
    getSubjectsTaught: () => {
      return teacherData?.subjects_taught || [];
    },
    // Utility function to get total students
    getTotalStudents: () => {
      return teacherData?.total_students || 0;
    },
    // Utility function to get assignment summary
    getAssignmentSummary: () => {
      return teacherData?.assignment_summary || null;
    },
    // Utility function to check if using legacy data
    isUsingLegacyData: () => {
      return teacherData?.using_legacy_data || false;
    }
  };

  return (
    <TeacherContext.Provider value={value}>
      {children}
    </TeacherContext.Provider>
  );
}

export function useTeacher() {
  const context = useContext(TeacherContext);
  if (context === undefined) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
}

// fetchTeacherData is exported as a named export above
