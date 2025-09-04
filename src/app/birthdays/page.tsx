// src/app/birthdays/page.tsx

'use client';

import { useTheme } from '@/lib/theme/context';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cake, Send, Calendar, Users, Gift, AlertTriangle, User, GraduationCap, Briefcase, X, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useBirthdays, BirthdayData } from '@/hooks/use-birthdays';

// Modern, compact Birthday card component
const BirthdayCard = ({ 
  birthday,
  onSendWish
}: { 
  birthday: BirthdayData;
  onSendWish: (birthday: BirthdayData) => void;
}) => {
  const isToday = birthday.daysUntil === 0;
  const { colorScheme } = useTheme();
  
  // Get theme color classes
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'blue':
        return 'bg-blue-500 text-white';
      case 'green':
        return 'bg-green-500 text-white';
      case 'purple':
        return 'bg-purple-500 text-white';
      case 'orange':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-pink-500 text-white';
    }
  };
  
  const getTypeIcon = () => {
    switch (birthday.type) {
      case 'student':
        return <GraduationCap className="h-3.5 w-3.5" />;
      case 'teacher':
        return <User className="h-3.5 w-3.5" />;
      case 'staff':
        return <Briefcase className="h-3.5 w-3.5" />;
      default:
        return <User className="h-3.5 w-3.5" />;
    }
  };

  const getTypeLabel = () => {
    switch (birthday.type) {
      case 'student':
        return 'Student';
      case 'teacher':
        return 'Teacher';
      case 'staff':
        return 'Staff';
      default:
        return 'Person';
    }
  };

  // Extract grade and division from academic records or class string
  const getGradeAndDivision = () => {
    // First try to get from academicRecords
    if (birthday.academicRecords && birthday.academicRecords.length > 0) {
      const record = birthday.academicRecords[0];
      if (record.class_division) {
        const level = record.class_division.level;
        const division = record.class_division.division;
        return {
          grade: level?.name || null,
          division: division || null
        };
      }
    }
    
    // Fallback to parsing from class string
    if (birthday.class) {
      // Expected format: "Grade X - Section Y" or "Grade X Section Y"
      const gradeMatch = birthday.class.match(/Grade\s+(\w+)/i);
      const divisionMatch = birthday.class.match(/Section\s+([A-Z])/i) || birthday.class.match(/([A-Z])$/);
      
      return {
        grade: gradeMatch ? gradeMatch[1] : null,
        division: divisionMatch ? divisionMatch[1] : null
      };
    }
    
    return { grade: null, division: null };
  };

  // Format date as "25 Aug" without year
  const formatBirthdayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      return `${day} ${month}`;
    } catch {
      // If date parsing fails, return the original string
      return dateString;
    }
  };

  const { grade, division } = getGradeAndDivision();
  const formattedDate = formatBirthdayDate(birthday.date);

  return (
    <Card className="rounded-lg border hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 relative">
            <div className={`w-12 h-12 rounded-lg ${getColorClasses()} flex items-center justify-center font-bold text-base`}>
              {birthday.avatar}
            </div>
            {isToday && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center border-2 border-white dark:border-gray-800">
                <Gift className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-grow min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{birthday.name}</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formattedDate}</span>
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {/* Type badge */}
              <div className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {getTypeIcon()}
                <span>{getTypeLabel()}</span>
              </div>
              
              {/* Grade and Division in one line */}
              {(grade || division) && (
                <div className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                  {grade && division ? `${grade} - Sec ${division}` : grade ? grade : `Sec ${division}`}
                </div>
              )}
              
              {/* Department */}
              {birthday.department && (
                <div className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                  {birthday.department}
                </div>
              )}
            </div>
            
            {/* Days until and action */}
            <div className="flex items-center justify-between mt-3">
              <div className={`text-sm font-medium ${isToday ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {isToday ? (
                  <span className="flex items-center gap-1">
                    <Cake className="h-3.5 w-3.5" />
                    <span className="font-bold">🎉 Today! 🎉</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {birthday.daysUntil} {birthday.daysUntil === 1 ? 'day' : 'days'} away
                  </span>
                )}
              </div>
              {isToday && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onSendWish(birthday)}
                  className="h-7 px-2 text-xs border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Wish
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Stats card component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description 
}: { 
  title: string; 
  value: number; 
  icon: React.ComponentType<{ className?: string }>; 
  description: string;
}) => {
  const { colorScheme } = useTheme();
  
  // Get theme color classes
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'blue':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
      case 'green':
        return 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400';
      case 'purple':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
      case 'orange':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400';
      default:
        return 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${getColorClasses()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Filter Tag Component
const FilterTag = ({ 
  label, 
  value, 
  onRemove 
}: { 
  label: string; 
  value: string; 
  onRemove: () => void;
}) => {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm">
      <span className="mr-1.5 text-gray-700 dark:text-gray-300">
        <span className="font-medium">{label}:</span> {value}
      </span>
      <button 
        onClick={onRemove}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default function BirthdaysPage() {
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'this-week' | 'this-month' | null>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | 'student' | 'staff' | null>(null);
  
  // Use the birthday hook
  const {
    loading,
    error,
    birthdayStats,
    useFallback,
    getAllBirthdays,
    getBirthdaysByDateRange,
    getBirthdaysByType,
    getBirthdaysForTomorrow,
    clearError
  } = useBirthdays();
  
  // Filter birthdays based on selected filters
  const filteredBirthdays = useMemo(() => {
    let filtered: BirthdayData[] = getAllBirthdays();
    
    // Apply type filter
    if (typeFilter && typeFilter !== 'all') {
      filtered = getBirthdaysByType(typeFilter);
    }
    
    // Apply date filter
    if (dateFilter) {
      if (dateFilter === 'today') {
        filtered = getBirthdaysByDateRange('today');
      } else if (dateFilter === 'tomorrow') {
        filtered = getBirthdaysForTomorrow();
      } else if (dateFilter === 'this-week') {
        filtered = getBirthdaysByDateRange('this-week');
      } else if (dateFilter === 'this-month') {
        filtered = getBirthdaysByDateRange('this-month');
      }
    }
    
    return filtered;
  }, [getAllBirthdays, getBirthdaysByDateRange, getBirthdaysByType, getBirthdaysForTomorrow, dateFilter, typeFilter]);

  const handleSendWish = (birthday: BirthdayData) => {
    // Here you would typically send the wish to your API or open a message composer
    console.log(`Sending birthday wish to ${birthday.name}`);
    // For now, we'll just show an alert
    alert(`Birthday wish sent to ${birthday.name}!`);
  };

  const clearFilters = () => {
    setDateFilter(null);
    setTypeFilter(null);
  };

  const activeFilters = [
    ...(dateFilter ? [{ label: 'Date', value: dateFilter }] : []),
    ...(typeFilter && typeFilter !== 'all' ? [{ label: 'Type', value: typeFilter }] : [])
  ];

  // Remove fallback data warning since we don't want dummy data
  if (useFallback) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-yellow-800 font-medium">Data Unavailable</p>
                <p className="text-yellow-700 text-sm">
                  Birthday data is currently unavailable. Please try again later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <p className="text-red-800">{error}</p>
              <Button variant="ghost" size="sm" onClick={clearError}>
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Today" 
            value={birthdayStats.today} 
            icon={Cake} 
            description="birthdays today" 
          />
          <StatsCard 
            title="This Week" 
            value={birthdayStats.thisWeek} 
            icon={Calendar} 
            description="upcoming birthdays" 
          />
          <StatsCard 
            title="This Month" 
            value={birthdayStats.thisMonth} 
            icon={Users} 
            description="total birthdays" 
          />
          <StatsCard 
            title="Next Month" 
            value={birthdayStats.nextMonth} 
            icon={Gift} 
            description="planned celebrations" 
          />
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Upcoming Birthdays</CardTitle>
              <CardDescription>
                Birthdays for students and staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filter Tags */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {activeFilters.map((filter, index) => (
                    <FilterTag
                      key={index}
                      label={filter.label}
                      value={filter.value}
                      onRemove={() => {
                        if (filter.label === 'Date') setDateFilter(null);
                        if (filter.label === 'Type') setTypeFilter(null);
                      }}
                    />
                  ))}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-7 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear all
                  </Button>
                </div>
              )}
              
              {/* Enhanced filters with more space between sections */}
              <div className="space-y-4 mb-6">
                {/* Type Filter Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={typeFilter === 'student' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTypeFilter(typeFilter === 'student' ? null : 'student')}
                      className="flex items-center gap-1"
                    >
                      <GraduationCap className="h-4 w-4" />
                      Students
                    </Button>
                    <Button
                      variant={typeFilter === 'staff' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTypeFilter(typeFilter === 'staff' ? null : 'staff')}
                      className="flex items-center gap-1"
                    >
                      <Briefcase className="h-4 w-4" />
                      Staff
                    </Button>
                  </div>
                </div>
                
                {/* Date Filter Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={dateFilter === 'today' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter(dateFilter === 'today' ? null : 'today')}
                    >
                      Today
                    </Button>
                    <Button
                      variant={dateFilter === 'tomorrow' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter(dateFilter === 'tomorrow' ? null : 'tomorrow')}
                    >
                      Tomorrow
                    </Button>
                    <Button
                      variant={dateFilter === 'this-week' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter(dateFilter === 'this-week' ? null : 'this-week')}
                    >
                      This Week
                    </Button>
                    <Button
                      variant={dateFilter === 'this-month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter(dateFilter === 'this-month' ? null : 'this-month')}
                    >
                      This Month
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading birthdays...</p>
                </div>
              )}
              
              {/* Birthday Cards Grid - More compact for 30-40 cards */}
              {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBirthdays.length > 0 ? (
                      filteredBirthdays
                        .sort((a, b) => a.daysUntil - b.daysUntil)
                        .map((birthday) => (
                          <BirthdayCard
                            key={birthday.id}
                            birthday={birthday}
                            onSendWish={handleSendWish}
                          />
                        ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <Cake className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No birthdays found</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          There are no birthdays matching your selected filters.
                        </p>
                        {activeFilters.length > 0 && (
                          <Button 
                            variant="outline" 
                            className="mt-4" 
                            onClick={clearFilters}
                          >
                            Clear all filters
                          </Button>
                        )}
                      </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}