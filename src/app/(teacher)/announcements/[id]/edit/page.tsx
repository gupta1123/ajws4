'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, BookOpen, AlertCircle, Calendar, Users, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { Attachment, Announcement } from '@/lib/api/announcements';



const announcementTypes = [
  { value: 'notification', label: 'Notification', icon: AlertCircle, description: 'General notifications and updates' },
  { value: 'circular', label: 'Circular', icon: BookOpen, description: 'Official circulars and announcements' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
];

const targetRoles = [
  { value: 'teacher', label: 'Teachers' },
  { value: 'parent', label: 'Parents' },
];


export default function EditAnnouncementPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'notification',
    priority: 'medium',
    target_roles: [] as string[],
    target_classes: [] as string[],
    publish_date: '',
    publish_time: '09:00',
    expires_date: '',
    expires_time: '17:00',
  });

  // Check if user can edit this announcement
  const canEdit = announcement && user && announcement.created_by === user.id;

  // Load announcement data
  useEffect(() => {
    const fetchAnnouncement = async (id: string) => {
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
            const fetchedAnnouncement = data.data.announcement;
            setAnnouncement(fetchedAnnouncement);

            // Populate form with existing data
            const publishDate = new Date(fetchedAnnouncement.publish_at);
            const expiresDate = new Date(fetchedAnnouncement.expires_at);

            setFormData({
              title: fetchedAnnouncement.title || '',
              content: fetchedAnnouncement.content || '',
              announcement_type: fetchedAnnouncement.announcement_type || 'notification',
              priority: fetchedAnnouncement.priority || 'medium',
              target_roles: fetchedAnnouncement.target_roles || [],
              target_classes: fetchedAnnouncement.target_classes || [],
              publish_date: publishDate.toISOString().split('T')[0],
              publish_time: publishDate.toTimeString().slice(0, 5),
              expires_date: expiresDate.toISOString().split('T')[0],
              expires_time: expiresDate.toTimeString().slice(0, 5),
            });
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
        router.push('/announcements');
      } finally {
        setLoading(false);
      }
    };

    if (params.id && token) {
      fetchAnnouncement(params.id as string);
    }
  }, [params.id, token, toast, router]);

  const handleUpdateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim() || !formData.publish_date || !formData.publish_time || !formData.expires_date || !formData.expires_time) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'error',
      });
      return;
    }

    if (formData.target_roles.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one target role',
        variant: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title,
        content: formData.content,
        announcement_type: formData.announcement_type,
        priority: formData.priority,
        target_roles: formData.target_roles,
        target_classes: formData.target_classes,
        publish_at: new Date(`${formData.publish_date}T${formData.publish_time}`).toISOString(),
        expires_at: new Date(`${formData.expires_date}T${formData.expires_time}`).toISOString(),
      };

      const response = await fetch(`https://ajws-school-ba8ae5e3f955.herokuapp.com/api/announcements/${params.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Announcement updated successfully',
        });
        router.push(`/announcements/${params.id}`);
      } else {
        throw new Error('Failed to update announcement');
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to update announcement',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }));
  };

  // Removed type preview helper as preview card is no longer shown

  // Check permissions after data is loaded
  useEffect(() => {
    if (!loading && announcement && user && !canEdit) {
      toast({
        title: 'Access Denied',
        description: 'You can only edit announcements that you created.',
        variant: 'error',
      });
      router.push('/announcements');
    }
  }, [loading, announcement, user, canEdit, toast, router]);

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

  // Show access denied if user can't edit
  if (!canEdit && announcement) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p>You can only edit announcements that you created.</p>
            </div>
          </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Edit Announcement</h1>
          <p className="text-muted-foreground">
            Update the announcement details
          </p>
          {announcement && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">
                {announcement.announcement_type.charAt(0).toUpperCase() + announcement.announcement_type.slice(1)}
              </Badge>
              <Badge className={priorities.find(p => p.value === announcement.priority)?.color}>
                {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created by {announcement.creator.full_name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Update the essential details for your announcement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter announcement title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter announcement content"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.announcement_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, announcement_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {announcementTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Scheduling
              </CardTitle>
              <CardDescription>
                Update when the announcement should be published and expire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="publish_date">Publish Date *</Label>
                  <Input
                    id="publish_date"
                    type="date"
                    value={formData.publish_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, publish_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="publish_time">Publish Time *</Label>
                  <Input
                    id="publish_time"
                    type="time"
                    value={formData.publish_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, publish_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expires_date">Expiry Date *</Label>
                  <Input
                    id="expires_date"
                    type="date"
                    value={formData.expires_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expires_time">Expiry Time *</Label>
                  <Input
                    id="expires_time"
                    type="time"
                    value={formData.expires_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, expires_time: e.target.value }))}
                  />
                </div>
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
              <CardDescription>
                Select who should receive this announcement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Target Roles *</Label>
                <div className="flex flex-wrap gap-2">
                  {targetRoles.map((role) => (
                    <Button
                      key={role.value}
                      variant={formData.target_roles.includes(role.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleRoleToggle(role.value)}
                      className="h-8"
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected: {formData.target_roles.length} role(s)
                </p>
              </div>

              <div className="space-y-3">
                <Label>Target Classes</Label>
                <div className="flex flex-wrap gap-2">
                  {announcement?.target_class_names && announcement.target_class_names.length > 0 ? (
                    announcement.target_class_names.map((className, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {className}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {formData.target_classes.length > 0
                        ? `${formData.target_classes.length} class(es) selected`
                        : 'All classes will receive this announcement'
                      }
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Classes are automatically determined based on your teaching assignments
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button
                  onClick={handleUpdateAnnouncement}
                  disabled={saving}
                  className="w-full"
                  size="lg"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Update Announcement
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="w-full"
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
