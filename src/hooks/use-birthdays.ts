// src/hooks/use-birthdays.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/context';
import { birthdayServices, BirthdayStudent } from '@/lib/api/birthdays';

export interface BirthdayData {
  id: string;
  name: string;
  class?: string;
  department?: string;
  date: string;
  daysUntil: number;
  avatar: string;
  type: 'student' | 'teacher' | 'staff';
  admissionNumber?: string;
  rollNumber?: string;
  classDivision?: {
    id: string;
    name: string;
    division: string;
    level: string;
    sequence_number: number;
  };
  academicRecords?: Array<{
    roll_number: string;
    class_division: {
      division: string;
      level: {
        name: string;
        sequence_number: number;
      };
    };
  }>;
}

export interface BirthdayStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  nextMonth: number;
}

// Fallback mock data for when API is not available
const fallbackStats: BirthdayStats = {
  today: 0,
  thisWeek: 0,
  thisMonth: 0,
  nextMonth: 0
};

export const useBirthdays = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayBirthdays, setTodayBirthdays] = useState<BirthdayData[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayData[]>([]);
  const [birthdayStats, setBirthdayStats] = useState<BirthdayStats>(fallbackStats);
  const [useFallback, setUseFallback] = useState(false);

  // Convert API student data to UI format
  const convertStudentToBirthdayData = useCallback((student: BirthdayStudent): BirthdayData => {
    console.log('Converting student:', student);
    console.log('Academic records:', student.student_academic_records);
    console.log('Class division:', student.class_division);

    const today = new Date();
    const birthDate = new Date(student.date_of_birth);
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    let nextBirthday: Date;
    let daysUntil: number;

    // Check if birthday is today
    if (thisYearBirthday.toDateString() === today.toDateString()) {
      nextBirthday = thisYearBirthday;
      daysUntil = 0; // Today is the birthday
    } else if (thisYearBirthday < today) {
      // Birthday has passed this year, calculate for next year
      nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
      daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    } else {
      // Birthday is still upcoming this year
      nextBirthday = thisYearBirthday;
      daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    console.log('Birthday calculation:', {
      today: today.toDateString(),
      birthDate: birthDate.toDateString(),
      thisYearBirthday: thisYearBirthday.toDateString(),
      nextBirthday: nextBirthday.toDateString(),
      daysUntil
    });

    // Get initials for avatar
    const initials = student.full_name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Build class string - prefer direct class_division, fallback to academic records
    let classString: string | undefined;
    let classDivision: BirthdayData['classDivision'];

    if (student.class_division) {
      // Use direct class_division from new API structure
      classDivision = student.class_division;
      classString = `${student.class_division.level} - Sec ${student.class_division.division}`;
    } else if (student.student_academic_records && student.student_academic_records.length > 0 && student.student_academic_records[0]?.class_division) {
      // Fallback to academic records structure
      const record = student.student_academic_records[0];
      classString = `${record.class_division.level.name} - Section ${record.class_division.division}`;
    }

    // Get roll number - prefer direct field, fallback to academic records
    const rollNumber = student.roll_number ||
      (student.student_academic_records && student.student_academic_records.length > 0
        ? student.student_academic_records[0]?.roll_number
        : undefined);

    const result = {
      id: student.id,
      name: student.full_name,
      class: classString,
      date: student.date_of_birth,
      daysUntil,
      avatar: initials,
      type: 'student' as const,
      admissionNumber: student.admission_number,
      rollNumber,
      classDivision,
      academicRecords: student.student_academic_records
    };

    console.log('Converted result:', result);
    return result;
  }, []);

  // Calculate stats from actual birthday data
  const calculateStatsFromData = useCallback((allBirthdays: BirthdayData[]): BirthdayStats => {
    console.log('🎯 Calculating stats from birthdays:', allBirthdays.length);

    const today = allBirthdays.filter(b => b.daysUntil === 0).length;
    console.log('📅 Today birthdays:', today);

    // This week: next 7 days (including today)
    const thisWeek = allBirthdays.filter(b => b.daysUntil <= 7 && b.daysUntil >= 0).length;
    console.log('📆 This week birthdays:', thisWeek);

    // This month: birthdays that fall within the current calendar month (upcoming ones)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonth = allBirthdays.filter(birthday => {
      if (birthday.daysUntil === 0) return false; // Don't double-count today's birthdays

      const birthDate = new Date(birthday.date);
      const birthMonth = birthDate.getMonth();
      const birthYear = birthDate.getFullYear();

      // Birthday falls in current month and year, and is upcoming
      const isCurrentMonth = birthMonth === currentMonth && birthYear === currentYear;
      const isUpcoming = birthday.daysUntil > 0;

      return isCurrentMonth && isUpcoming;
    }).length;

    console.log('📊 This month birthdays (upcoming):', thisMonth);

    // Next month: birthdays in the next calendar month
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextMonthYear = nextMonthDate.getFullYear();

    const nextMonthCount = allBirthdays.filter(birthday => {
      const birthDate = new Date(birthday.date);
      const birthMonth = birthDate.getMonth();
      const birthYear = birthDate.getFullYear();

      return birthMonth === nextMonth && birthYear === nextMonthYear && birthday.daysUntil > 7;
    }).length;

    console.log('📈 Next month birthdays:', nextMonthCount);
    console.log('📋 Total birthdays in dataset:', allBirthdays.length);

    const result = { today, thisWeek, thisMonth, nextMonth: nextMonthCount };
    console.log('📊 Final stats result:', result);

    return result;
  }, []);

  // Fetch today's birthdays
  const fetchTodayBirthdays = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      let response;

      console.log('🎂 Fetching today\'s birthdays for role:', user?.role);

      if (user?.role === 'teacher') {
        // For teachers, use the my-classes API to get birthdays for their assigned classes
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        console.log('👨‍🏫 Teacher fetching birthdays for date:', todayStr);
        response = await birthdayServices.getTeacherClassesBirthdays(token, {
          date: todayStr
        });
      } else {
        // For admin/principal, use the original today's birthdays API
        console.log('👑 Admin/Principal fetching all birthdays');
        response = await birthdayServices.getTodayBirthdays(token);
      }

      // Handle Blob response (shouldn't happen for this endpoint)
      if (response instanceof Blob) {
        console.error('Unexpected Blob response');
        return;
      }

      if (response.status === 'success') {
        let birthdayData: BirthdayStudent[] = [];

        if (user?.role === 'teacher' && response.data.birthdays) {
          birthdayData = response.data.birthdays;
          console.log('👨‍🏫 Teacher got birthdays:', birthdayData.length);
        } else if (response.data.birthdays) {
          birthdayData = response.data.birthdays;
          console.log('👑 Admin got birthdays:', birthdayData.length);
        }

        if (birthdayData.length > 0) {
          const converted = birthdayData.map(convertStudentToBirthdayData);
          console.log('🔄 Converted birthdays:', converted.length);
          console.log('📊 Today birthdays sample:', converted.slice(0, 2));

          setTodayBirthdays(converted);
          setUseFallback(false);
        } else {
          console.log('📭 No birthdays found for today');
          setTodayBirthdays([]);
          setUseFallback(false);
        }
      } else {
        console.error('❌ API returned error:', response);
        setUseFallback(true);
      }
    } catch (err: unknown) {
      console.error('💥 Error fetching today\'s birthdays:', err);

      // Set error state but don't use fallback data
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch today\'s birthdays';
      setError(errorMessage);
      setUseFallback(true);
    } finally {
      setLoading(false);
    }
  }, [token, convertStudentToBirthdayData, user?.role]);

  // Fetch upcoming birthdays
  const fetchUpcomingBirthdays = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      // Set date range for next 30 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30); // Get next 30 days
      
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      if (user?.role === 'teacher') {
        // For teachers, get birthdays for their classes with date range
        response = await birthdayServices.getMyClassBirthdays(startDateStr, endDateStr, token);
      } else {
        // For admin/principal, get all upcoming birthdays with date range
        response = await birthdayServices.getUpcomingBirthdays(token, {
          start_date: startDateStr,
          end_date: endDateStr
        });
      }

      // Handle Blob response (shouldn't happen for this endpoint)
      if (response instanceof Blob) {
        console.error('Unexpected Blob response');
        return;
      }

      if (response.status === 'success') {
        console.log('🎂 Upcoming API Response:', response.data);
        const allUpcoming: BirthdayData[] = [];

        if (user?.role === 'teacher' && 'birthdays' in response.data) {
          // For teachers, process the birthdays array directly
          console.log('👨‍🏫 Processing teacher birthdays:', response.data.birthdays.length);
          response.data.birthdays.forEach((student: BirthdayStudent) => {
            console.log('Processing teacher student:', student.full_name);
            allUpcoming.push(convertStudentToBirthdayData(student));
          });
        } else if ('upcoming_birthdays' in response.data) {
          // For admin/principal, process the upcoming_birthdays array
          console.log('👑 Processing admin upcoming birthdays');
          response.data.upcoming_birthdays.forEach((monthData: { students: BirthdayStudent[] }) => {
            console.log('Month data students count:', monthData.students.length);
            monthData.students.forEach((student: BirthdayStudent) => {
              console.log('Processing admin student:', student.full_name);
              allUpcoming.push(convertStudentToBirthdayData(student));
            });
          });
        }

        console.log('📈 Final upcoming birthdays count:', allUpcoming.length);
        console.log('📊 Sample upcoming birthdays:', allUpcoming.slice(0, 3));

        setUpcomingBirthdays(allUpcoming);
        setUseFallback(false);
      }
    } catch (err: unknown) {
      console.error('Error fetching upcoming birthdays:', err);

      // Set error state but don't use fallback data
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch upcoming birthdays';
      setError(errorMessage);
      setUseFallback(true);
    } finally {
      setLoading(false);
    }
  }, [token, convertStudentToBirthdayData, user?.role]);

  // Get combined birthdays for display
  const getAllBirthdays = useCallback((): BirthdayData[] => {
    const combined = [...todayBirthdays, ...upcomingBirthdays];
    
    // Remove duplicates based on ID
    const unique = combined.filter((birthday, index, self) => 
      index === self.findIndex(b => b.id === birthday.id)
    );
    
    // Sort by days until birthday
    return unique.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [todayBirthdays, upcomingBirthdays]);

  // Update stats whenever birthday data changes
  useEffect(() => {
    const allBirthdays = getAllBirthdays();
    const newStats = calculateStatsFromData(allBirthdays);
    setBirthdayStats(newStats);
  }, [todayBirthdays, upcomingBirthdays, getAllBirthdays, calculateStatsFromData]);

  // Filter birthdays by type
  const getBirthdaysByType = useCallback((type: 'student' | 'teacher' | 'staff' | 'all'): BirthdayData[] => {
    const all = getAllBirthdays();
    if (type === 'all') return all;
    return all.filter(birthday => birthday.type === type);
  }, [getAllBirthdays]);

  // Filter birthdays by date range
  const getBirthdaysByDateRange = useCallback((range: 'today' | 'this-week' | 'this-month' | 'all'): BirthdayData[] => {
    const all = getAllBirthdays();
    
    switch (range) {
      case 'today':
        return all.filter(birthday => birthday.daysUntil === 0);
      case 'this-week':
        return all.filter(birthday => birthday.daysUntil <= 7);
      case 'this-month':
        return all.filter(birthday => birthday.daysUntil <= 30);
      default:
        return all;
    }
  }, [getAllBirthdays]);

  // Filter birthdays for tomorrow
  const getBirthdaysForTomorrow = useCallback((): BirthdayData[] => {
    const all = getAllBirthdays();
    return all.filter(birthday => birthday.daysUntil === 1);
  }, [getAllBirthdays]);

  // Initialize data on mount
  useEffect(() => {
    if (token) {
      Promise.all([
        fetchTodayBirthdays(),
        fetchUpcomingBirthdays()
      ]);
    }
  }, [token, fetchTodayBirthdays, fetchUpcomingBirthdays]);

  return {
    loading,
    error,
    todayBirthdays,
    upcomingBirthdays,
    birthdayStats,
    useFallback,
    getAllBirthdays,
    getBirthdaysByType,
    getBirthdaysByDateRange,
    getBirthdaysForTomorrow,
    refresh: () => Promise.all([fetchTodayBirthdays(), fetchUpcomingBirthdays()]),
    clearError: () => setError(null)
  };
};
