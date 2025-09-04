'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Calendar, Users, BookOpen, AlertCircle, CheckCircle, XCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { Attachment, Announcement } from '@/lib/api/announcements';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';


const announcementTypes = [
  { value: 'notification', label: 'Notification', icon: AlertCircle, description: 'General notifications and updates' },
  { value: 'circular', label: 'Circular', icon: BookOpen, description: 'Official circulars and announcements' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
];

export default function AnnouncementViewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { token, user } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchAnnouncement = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`https://ajws-school-ba8ae5e3f955.herokuapp.com/api/announcements/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setAnnouncement(data.data.announcement);
        }
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
    const fetchData = async () => {
      if (params.id) {
        fetchAnnouncement(params.id as string);
      }
    };
    fetchData();
  }, [params.id, fetchAnnouncement]);

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const response = await fetch(`https://ajws-school-ba8ae5e3f955.herokuapp.com/api/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Announcement deleted successfully',
        });
        router.push('/announcements');
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
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading announcement...</p>
          </div>
        </div>
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{announcement.title}</h1>
              {announcement.is_featured && (
                <Star className="w-6 h-6 text-yellow-500 fill-current" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(announcement.status)}
              <Badge className={getStatusColor(announcement.status)}>
                {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            View announcement details and information
          </p>
        </div>

      </div>

      {/* Action Buttons - Only show if user created this announcement */}
      {user && announcement.created_by === user.id && (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/announcements/${announcement.id}/edit`)}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      )}

      {/* Main Content Grid - Everything at one glance */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
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

          {/* Target Audience */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">Target Roles:</span>
                  <div className="flex flex-wrap gap-2">
                    {announcement.target_roles.map((role) => (
                      <Badge key={role} variant="outline" className="px-3 py-1 capitalize">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                {announcement.target_classes.length > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground">Target Classes:</span>
                    <div className="flex flex-wrap gap-2">
                      {announcement.target_class_names && announcement.target_class_names.length > 0 ? (
                        announcement.target_class_names.map((className: string, index: number) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1">
                            {className}
                          </Badge>
                        ))
                      ) : (
                        announcement.target_classes.map((classId) => (
                          <Badge key={classId} variant="secondary" className="px-3 py-1">
                            {classId}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Takes 2 columns */}
        <div className="xl:col-span-2 space-y-6">
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
                      <span className="font-medium capitalize">{announcement.announcement_type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Priority:</span>
                    <Badge className={priorities.find(p => p.value === announcement.priority)?.color}>
                      {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                    </Badge>
                  </div>

                </div>

                <div className="space-y-3">

                  
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Created:</span>
                    <span className="font-medium">{formatDate(announcement.created_at)}</span>
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
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created By</Label>
                  <div className="mt-1">
                    <div className="font-medium">{announcement.creator.full_name}</div>
                    <div className="text-sm text-muted-foreground capitalize">{announcement.creator.role}</div>
                  </div>
                </div>

                {announcement.status === 'approved' && announcement.approver && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Approved By</Label>
                    <div className="mt-1">
                      <div className="font-medium">{announcement.approver.full_name}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {announcement.approver.role}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {announcement.status === 'rejected' && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                  <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 capitalize">
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
              Are you sure you want to delete &ldquo;{announcement?.title}&rdquo;? This action cannot be undone.
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
