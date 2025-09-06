'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, BookOpen, AlertCircle, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { createAnnouncementsAPI } from '@/lib/api/announcements';
import { classDivisionsServices } from '@/lib/api/class-divisions';

const announcementTypes = [
  { value: 'notification', label: 'Notification', icon: AlertCircle, description: 'General notifications and updates' },
  { value: 'circular', label: 'Circular', icon: BookOpen, description: 'Official circulars and announcements' },
  { value: 'general', label: 'General', icon: AlertCircle, description: 'General announcements' },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
];

const targetRoles = [
  { value: 'teacher', label: 'Teachers' },
  { value: 'parent', label: 'Parents' },
];

export default function AdminCreateAnnouncementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  // Class selection state
  const [availableClasses, setAvailableClasses] = useState<Array<{
    id: string;
    division: string;
    class_name: string;
    class_level: string;
    academic_year: string;
  }>>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [scope, setScope] = useState<'school' | 'classes'>('school');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'general',
    priority: 'low',
    target_roles: [] as string[],
    target_classes: [] as string[],
    publish_date: '',
    publish_time: '09:00',
    expires_date: '',
    expires_time: '17:00',
  });

  const handleCreateAnnouncement = async () => {
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
      setLoading(true);
      const api = createAnnouncementsAPI(token!);

      const payload = {
        title: formData.title,
        content: formData.content,
        announcement_type: formData.announcement_type as 'notification' | 'circular' | 'general',
        priority: formData.priority as 'low' | 'high',
        target_roles: formData.target_roles,
        target_classes: scope === 'classes' ? formData.target_classes : [],
        publish_at: new Date(`${formData.publish_date}T${formData.publish_time}`).toISOString(),
        expires_at: new Date(`${formData.expires_date}T${formData.expires_time}`).toISOString(),
      };

      const response = await api.createAnnouncement(payload);

      if (response.status === 'success') {
        toast({
          title: 'Success',
          description: 'Announcement created and auto-approved successfully',
        });
        router.push('/admin/announcements');
      } else {
        throw new Error('Failed to create announcement');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to create announcement',
        variant: 'error',
      });
    } finally {
      setLoading(false);
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

  // Fetch available classes
  const fetchAvailableClasses = useCallback(async () => {
    if (!token) return;

    try {
      setClassesLoading(true);

      // Fetch class divisions using the existing API service
      const result = await classDivisionsServices.getClassDivisions(token);

      if (result.status === 'success') {
        // Get detailed information for each class division
        const classDetails = await Promise.all(
          result.data.class_divisions.map(async (classDivision) => {
            try {
              const detailResponse = await fetch(
                `https://ajws-school-ba8ae5e3f955.herokuapp.com/api/students/class/${classDivision.id}/details`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              const detailResult = await detailResponse.json();

              if (detailResult.status === 'success') {
                return {
                  id: classDivision.id,
                  division: detailResult.data.class_division.division,
                  class_name: detailResult.data.class_division.class_level.name,
                  class_level: detailResult.data.class_division.class_level.name,
                  academic_year: detailResult.data.class_division.academic_year.year_name,
                };
              }
            } catch (error) {
              console.error(`Error fetching details for class ${classDivision.id}:`, error);
            }
            return null;
          })
        );

        // Filter out null results and set available classes
        const validClasses = classDetails.filter((classItem): classItem is NonNullable<typeof classItem> => classItem !== null);
        setAvailableClasses(validClasses);
      } else {
        console.error('Failed to fetch class divisions:', result);
      }
    } catch (error) {
      console.error('Error fetching available classes:', error);
    } finally {
      setClassesLoading(false);
    }
  }, [token]);

  // Handle class selection
  const handleClassToggle = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      target_classes: prev.target_classes.includes(classId)
        ? prev.target_classes.filter(c => c !== classId)
        : [...prev.target_classes, classId]
    }));
  };

  // Fetch classes when scope is 'classes'
  useEffect(() => {
    if (scope === 'classes' && availableClasses.length === 0) {
      fetchAvailableClasses();
    }
  }, [scope, availableClasses.length]); // Removed fetchAvailableClasses from dependencies to prevent infinite loop

  // Clear classes when switching to school-wide
  useEffect(() => {
    if (scope === 'school' && formData.target_classes.length > 0) {
      setFormData(prev => ({ ...prev, target_classes: [] }));
    }
  }, [scope]);

  // Removed type preview helper as preview card is no longer shown

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Announcement</h1>
          <p className="text-muted-foreground">
            Create an announcement that will be automatically approved for publication
          </p>
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
                Provide the essential details for your announcement
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
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'low' | 'high' }))}
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
                Set when the announcement should be published and expire
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
              {/* Scope selection */}
              <div className="space-y-2">
                <Label>Scope</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={scope === 'school' ? 'default' : 'outline'} size="sm" onClick={() => setScope('school')}>
                    School-wide
                  </Button>
                  <Button type="button" variant={scope === 'classes' ? 'default' : 'outline'} size="sm" onClick={() => setScope('classes')}>
                    Specific classes
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Leave classes empty for school-wide; select classes to target specific divisions.</p>
              </div>
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

              {/* Class Selection - show when scope is 'classes' */}
              {scope === 'classes' && (
                <div className="space-y-3 border-t pt-4">
                  <Label>Target Classes (Optional)</Label>
                  {classesLoading ? (
                    <div className="flex items-center justify-center gap-3 py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-muted-foreground">Loading classes...</span>
                    </div>
                  ) : availableClasses.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {availableClasses.map((classItem) => (
                        <div key={classItem.id} className="flex items-center space-x-2 p-2 border rounded-lg">
                          <Checkbox
                            id={`class-${classItem.id}`}
                            checked={formData.target_classes.includes(classItem.id)}
                            onCheckedChange={() => handleClassToggle(classItem.id)}
                          />
                          <Label
                            htmlFor={`class-${classItem.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {classItem.class_name} - {classItem.division}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {classItem.academic_year}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">No classes available</p>
                  )}

                  {formData.target_classes.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {formData.target_classes.length} class(es)
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Leave empty to send to all students, or select specific classes for targeted announcements.
                  </p>
                </div>
              )}
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
                  onClick={handleCreateAnnouncement}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Announcement
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="w-full"
                  disabled={loading}
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
