// src/components/calendar/event-detail-modal.tsx

'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  BookOpen,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

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


// Event type configuration
const eventTypeConfig = {
  school: { 
    label: 'Event', 
    color: 'event-school', 
    textColor: 'text-blue-800',
    darkColor: 'dark:bg-blue-900/50',
    borderColor: 'border-school',
    icon: CalendarIcon
  },
  class: { 
    label: 'Class Event', 
    color: 'event-class', 
    textColor: 'text-green-800',
    darkColor: 'dark:bg-green-900/50',
    borderColor: 'border-class',
    icon: BookOpen
  },
  pending_approval: { 
    label: 'Pending Approval', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-800',
    darkColor: 'dark:bg-orange-900/50',
    borderColor: 'border-orange-500',
    icon: CalendarIcon
  }
};

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  type: keyof typeof eventTypeConfig;
  class?: string;
  teacher?: string;
  requiresApproval?: boolean;
  approved?: boolean;
  category: string;
  status?: 'pending' | 'approved' | 'rejected';
  creator?: {
    id: string;
    role: string;
    full_name: string;
  };
  class_division_name?: string;
  event_type?: 'school_wide' | 'class_specific' | 'teacher_specific';
}

interface EventDetailModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
  onApprove?: (eventId: string) => void;
  onReject?: (eventId: string) => void;
  userRole: 'admin' | 'principal' | 'teacher' | 'student';
}

export function EventDetailModal({
  event,
  onClose,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  userRole
}: EventDetailModalProps) {
  // Determine if user can edit/delete (admins/principals can always, teachers can for their own events)
  const canEdit = userRole === 'admin' || userRole === 'principal' ||
    (userRole === 'teacher' && event.creator?.id === event.teacher); // Check if teacher created this event

  // Determine if user can approve (only admins/principals)
  const canApprove = (userRole === 'admin' || userRole === 'principal') &&
    event.status === 'pending';

  // Determine event type for display
  const isSchoolWide = event.event_type === 'school_wide';
  const isClassSpecific = event.event_type === 'class_specific';
  const isPending = event.status === 'pending';

  const config = isPending
    ? eventTypeConfig.pending_approval
    : isClassSpecific
      ? eventTypeConfig.class
      : eventTypeConfig.school;

  const Icon = config.icon;

  // Format date and time for display
  const formattedDate = formatEventDate(event.date);
  const formattedStartTime = formatEventTime(event.startTime);
  const formattedEndTime = formatEventTime(event.endTime);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-5 w-5 ${config.color.replace('bg-', 'text-')}`} />
                <CardTitle>{event.title}</CardTitle>
              </div>
              <CardDescription>
                {config.label}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Type Badge */}
          <div className="flex items-center justify-between">
            <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
              {isSchoolWide ? 'School Wide' : isClassSpecific ? 'Class Specific' : 'Teacher Specific'}
            </span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              event.status === 'approved'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : event.status === 'rejected'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
            }`}>
              {event.status === 'approved' ? 'Approved' : event.status === 'rejected' ? 'Rejected' : 'Pending'}
            </span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formattedDate}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{formattedStartTime} - {formattedEndTime}</span>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{event.category || 'General'}</span>
          </div>

          {/* Class Information (for class-specific events) */}
          {(isClassSpecific || event.class_division_name) && (
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span>{event.class_division_name || event.class || 'Specific Class'}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="text-sm">
              <p className="font-medium mb-1">Description:</p>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Creator Information */}
          {event.creator && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Created by:</span>
              <span className="font-medium">{event.creator.full_name}</span>
              <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                {event.creator.role}
              </span>
            </div>
          )}

          {/* Status Indicator */}
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              {event.status === 'approved' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">Event is approved and active</span>
                </>
              ) : event.status === 'rejected' ? (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600 font-medium">Event was rejected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600 font-medium">Waiting for approval</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          {canApprove && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onApprove && onApprove(event.id)}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onReject && onReject(event.id)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {canEdit && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEdit(event.id)}
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onDelete(event.id)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}