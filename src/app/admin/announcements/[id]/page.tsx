'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Calendar, Users, BookOpen, AlertCircle, CheckCircle, XCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createAnnouncementsAPI, type Announcement } from '@/lib/api/announcements';

// Skeleton Loader Component for Announcement Detail
const AnnouncementDetailSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
    {/* Header with improved layout */}
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-4 flex-1">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-1"></div>
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto"></div>
          </div>

          {/* Target Audience - In one line */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons skeleton */}
      <div className="flex items-center gap-2 ml-4">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="h-8 w-18 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>

    {/* Main Content Grid */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content skeleton */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar skeleton */}
        <div className="xl:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-18 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const announcementTypes = [
  { value: 'notification', label: 'Notification', icon: AlertCircle, description: 'General notifications and updates' },
  { value: 'circular', label: 'Circular', icon: BookOpen, description: 'Official circulars and announcements' },
  { value: 'general', label: 'General', icon: AlertCircle, description: 'General announcements' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
];

export default function AdminAnnouncementViewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchAnnouncement = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const api = createAnnouncementsAPI(token!);
      const response = await api.getAnnouncementById(id);

      if (response.status === 'success') {
        setAnnouncement(response.data.announcement);
      } else {
        throw new Error('Failed to fetch announcement');
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch announcement details',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (params.id && token) {
      fetchAnnouncement(params.id as string);
    }
  }, [params.id, token]); // Removed fetchAnnouncement from dependencies to prevent infinite loop

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const api = createAnnouncementsAPI(token!);
      const response = await api.deleteAnnouncement(id);

      if (response.status === 'success') {
        toast({
          title: 'Success',
          description: 'Announcement deleted successfully',
        });
        router.push('/admin/announcements');
      } else {
        throw new Error('Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete announcement',
        variant: 'error',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };

  if (loading) {
    return <AnnouncementDetailSkeleton />;
  }

  if (!announcement) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Announcement Not Found</h2>
          <p className="text-muted-foreground mb-4">The announcement you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header with improved layout */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{announcement.title}</h1>
              {announcement.is_featured && (
                <Star className="w-6 h-6 text-yellow-500 fill-current" />
              )}
              {/* Status Badge - Moved to top right area */}
              <div className="ml-auto">
                <Badge className={`${getStatusColor(announcement.status)} px-3 py-1`}>
                  {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Target Audience - In one line */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">To:</span>
                <div className="flex flex-wrap gap-2">
                  {/* Target Roles */}
                  {announcement.target_roles.map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                  ))}
                  {/* Target Classes - Use names instead of IDs */}
                  {announcement.target_class_names && announcement.target_class_names.length > 0 ? (
                    announcement.target_class_names.map((className) => (
                      <Badge key={className} variant="secondary" className="text-xs">
                        {className}
                      </Badge>
                    ))
                  ) : (
                    announcement.target_classes.map((classId) => (
                      <Badge key={classId} variant="secondary" className="text-xs">
                        {classId}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Moved to top right */}
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/announcements/${announcement.id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Content Grid - Everything at one glance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Content - Takes 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* Content Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-base leading-relaxed">
                  {announcement.content}
                </p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Sidebar - Takes 1 column */}
        <div className="xl:col-span-1 space-y-6">
          {/* Key Information - Compact Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Type:</span>
                    <div className="flex items-center gap-2">
                      {React.createElement(announcementTypes.find(t => t.value === announcement.announcement_type)?.icon || BookOpen, { className: "w-4 h-4" })}
                      <span className="font-medium">{announcementTypes.find(t => t.value === announcement.announcement_type)?.label}</span>
                    </div>
                  </div>

                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Created:</span>
                    <span className="font-medium">{formatDate(announcement.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Priority:</span>
                    <Badge className={`text-xs ${priorities.find(p => p.value === announcement.priority)?.color || 'bg-gray-100 text-gray-800'}`}>
                      {priorities.find(p => p.value === announcement.priority)?.label || announcement.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Publish Date</Label>
                    <div className="text-sm font-medium mt-1">
                      {formatDate(announcement.publish_at)}
                    </div>
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Creator & Approval Info */}
          <Card>
            <CardHeader>
              <CardTitle>People & Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                <div className="mt-1">
                  <div className="font-medium">{announcement.creator.full_name}</div>
                  <div className="text-sm text-muted-foreground">{announcement.creator.role}</div>
                </div>
              </div>

              {announcement.status === 'approved' && announcement.approver && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Approved By</Label>
                  <div className="mt-1">
                    <div className="font-medium">{announcement.approver.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {announcement.approved_at ? formatDate(announcement.approved_at) : 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {announcement.status === 'rejected' && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                  <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                    {announcement.rejection_reason || 'No reason provided'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete Announcement
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{announcement?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (announcement) {
                  handleDeleteAnnouncement(announcement.id);
                  setShowDeleteModal(false);
                }
              }}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
