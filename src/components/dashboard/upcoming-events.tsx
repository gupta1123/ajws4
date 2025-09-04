// src/components/dashboard/upcoming-events.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, BookOpen, Clipboard, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { calendarServices } from '@/lib/api';
import { CalendarEvent } from '@/lib/api/calendar';

export function UpcomingEvents() {
  const { user, token } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);
        
        // Get current date and next 30 days for date range
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 30);
        
        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        let response;
        
        try {
          if (user?.role === 'teacher') {
            // For teachers, get events for their classes with date range filter
            console.log('Fetching teacher events...');
            response = await calendarServices.getTeacherEvents(token, {
              start_date: startDateStr,
              end_date: endDateStr,
              event_category: 'academic'
            });
            console.log('Teacher events response:', response);
          } else if (user?.role === 'parent') {
            // For parents, get events for their children's classes with date range
            console.log('Fetching parent events...');
            response = await calendarServices.getParentEvents(
              token,
              {
                start_date: startDateStr,
                end_date: endDateStr,
                event_category: 'meeting'
              }
            );
            console.log('Parent events response:', response);
          } else if (user?.role === 'admin' || user?.role === 'principal') {
            // For admin/principal, get all events with date range and IST
            console.log('Fetching admin events...');
            response = await calendarServices.getEvents(
              token,
              {
                start_date: startDateStr,
                end_date: endDateStr,
                event_category: 'meeting',
                use_ist: true
              }
            );
            console.log('Admin events response:', response);
          } else {
            // Default fallback for other roles
            console.log('Fetching default events...');
            response = await calendarServices.getEvents(
              token,
              {
                start_date: startDateStr,
                end_date: endDateStr,
                event_category: 'academic',
                use_ist: true
              }
            );
            console.log('Default events response:', response);
          }
        } catch (error) {
          console.error('Error with events API:', error);
          throw error;
        }

        // Handle Blob response (shouldn't happen for this endpoint)
        if (response instanceof Blob) {
          console.error('Unexpected Blob response');
          setEvents([]);
          return;
        }

        if (response.status === 'success' && response.data.events) {
          // Sort events by event date (recent to future)
          const sortedEvents = response.data.events
            .sort((a: CalendarEvent, b: CalendarEvent) => 
              new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
            )
            .slice(0, 5); // Show only next 5 events
          
          setEvents(sortedEvents);
        } else {
          console.warn('Unexpected response format:', response);
          setEvents([]);
        }
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, [token, user?.role]);

  // Format date to "25 Aug 25" format
  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${day} ${month} ${year}`;
    } catch {
      return dateString;
    }
  };

  // Format time to "09:00 AM" format
  const formatEventTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour24 = parseInt(hours, 10);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getEventIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'academic':
        return <BookOpen className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      case 'homework':
        return <Clipboard className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'academic':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'meeting':
        return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'homework':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Loading events...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-red-500 mb-2">Failed to load events</p>
            <p className="text-xs">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <Link href="/calendar">
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => {
              const isSchoolWide = event.event_type === 'school_wide';
              const isClassSpecific = event.event_type === 'class_specific';
              const isApproved = event.status === 'approved';

              return (
                <div key={event.id} className="p-4 rounded-lg border hover:bg-muted/30 transition-colors">
                  {/* Header with title and badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getEventColor(event.event_category)}`}>
                        {getEventIcon(event.event_category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-foreground mb-1">{event.title}</h4>

                        {/* Event type and status badges */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                            {isSchoolWide ? 'School Wide' : isClassSpecific ? 'Class Specific' : 'General'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            isApproved
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          }`}>
                            {isApproved ? 'Approved' : 'Pending'}
                          </span>
                        </div>

                        {/* Class info for class-specific events */}
                        {isClassSpecific && event.class_info && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {event.class_info.class_level} - {event.class_info.division}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Category badge */}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getEventColor(event.event_category)}`}>
                      {event.event_category}
                    </div>
                  </div>

                  {/* Event details */}
                  <div className="space-y-2">
                    {/* Date and time */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">{formatEventDate(event.event_date)}</span>
                      <span>at</span>
                      <span>
                        {event.start_time && event.end_time
                          ? `${formatEventTime(event.start_time)} - ${formatEventTime(event.end_time)}`
                          : formatEventTime(event.start_time || '00:00')
                        }
                      </span>
                    </div>

                    {/* Creator information */}
                    {(event.creator?.full_name || event.creator_name) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>
                          Created by {event.creator?.full_name || event.creator_name}
                          {event.creator?.role && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize font-medium ml-1">
                              {event.creator.role}
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Status indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      {isApproved ? (
                        <>
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-green-600 font-medium">Event is active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 text-orange-500" />
                          <span className="text-orange-600 font-medium">Waiting for approval</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No upcoming events</p>
            <p className="text-xs">Events will appear here when scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}