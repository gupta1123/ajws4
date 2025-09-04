'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, AlertCircle, CheckCircle, XCircle, Clock, Eye, MessageSquare, BookOpen, Star, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { createAnnouncementsAPI, type Announcement } from '@/lib/api/announcements';

// Skeleton Loader Components
const AnnouncementTableSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Title</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12"></div>
                </div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
              </TableCell>
              <TableCell className="text-right">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);


const announcementTypes = [
  { value: 'notification', label: 'Notification', icon: AlertCircle },
  { value: 'circular', label: 'Circular', icon: BookOpen },
  { value: 'general', label: 'General', icon: MessageSquare },
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
];

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle, label: 'Rejected' },
};



export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pendingAnnouncements, setPendingAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');


  const { toast } = useToast();
  const { token, user } = useAuth();
  const router = useRouter();

  const api = token ? createAnnouncementsAPI(token) : null;

  // Set date range based on preset
  const setDateRange = (preset: string) => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (preset) {
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'next-month':
        start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'this-week':
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        // Custom - don't change dates if already set
        return;
    }

    setStartDate(start.toISOString().split('T')[0]); // YYYY-MM-DD format
    setEndDate(end.toISOString().split('T')[0]); // YYYY-MM-DD format
  };

  const fetchAnnouncements = useCallback(async () => {
    if (!api) return;

    try {
      const params: {
        start_date?: string;
        end_date?: string;
        status?: string;
        announcement_type?: string;
        priority?: string;
        is_featured?: boolean;
        page?: number;
        limit?: number;
      } = {};
      if (startDate && endDate) {
        params.start_date = startDate + 'T00:00:00Z';
        params.end_date = endDate + 'T23:59:59Z';
      }
      const response = await api.getAnnouncements(params);
      if (response.status === 'success') {
        setAnnouncements(response.data.announcements);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch announcements',
        variant: 'error',
      });
    }
  }, [api, toast, startDate, endDate]);

  const fetchPendingAnnouncements = useCallback(async () => {
    if (!api) return;

    try {
      setLoading(true);
      const params: {
        start_date?: string;
        end_date?: string;
        status?: string;
        announcement_type?: string;
        priority?: string;
        is_featured?: boolean;
        page?: number;
        limit?: number;
      } = { status: 'pending' };
      if (startDate && endDate) {
        params.start_date = startDate + 'T00:00:00Z';
        params.end_date = endDate + 'T23:59:59Z';
      }
      const response = await api.getAnnouncements(params);
      if (response.status === 'success') {
        setPendingAnnouncements(response.data.announcements);
      }
    } catch (error) {
      console.error('Error fetching pending announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending announcements',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [api, toast, startDate, endDate]);

  useEffect(() => {
    if (token) {
      // Set default date range to this month
      setDateRange('this-month');
    }
  }, [token]);

  useEffect(() => {
    if (token && startDate && endDate) {
      fetchAnnouncements();
    }
  }, [token, startDate, endDate]); // Trigger fetch when dates change

  // Update dates when preset changes
  useEffect(() => {
    if (datePreset !== 'custom') {
      setDateRange(datePreset);
    }
  }, [datePreset]);

  useEffect(() => {
    if (token) {
      fetchPendingAnnouncements();
    }
  }, [token, startDate, endDate]); // Fetch pending announcements when dates change

  const handleApproveAnnouncement = async (announcementId: string) => {
    if (!api) return;

    try {
      const response = await api.approveOrRejectAnnouncement(announcementId, { action: 'approve' });
      if (response.status === 'success') {
        toast({
          title: 'Success',
          description: 'Announcement approved successfully',
        });
        // Refresh data
        fetchAnnouncements();
        fetchPendingAnnouncements();
      }
    } catch (error) {
      console.error('Error approving announcement:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve announcement',
        variant: 'error',
      });
    }
  };





  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.creator.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || announcement.announcement_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };



  if (!user || (user.role !== 'admin' && user.role !== 'principal')) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Only admins and principals can access this section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Create button moved to topbar area */}
      <div className="mb-6 flex justify-end">
        <Button
          className="flex items-center gap-2"
          onClick={() => router.push('/admin/announcements/create')}
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingAnnouncements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">
                  {announcements.filter(a => a.status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">
                  {announcements.filter(a => a.status === 'rejected').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{announcements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending Approvals ({pendingAnnouncements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search announcements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-end">
                  {/* Date Preset Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                    <Select value={datePreset} onValueChange={setDatePreset}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="next-month">Next Month</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range - Only show when custom is selected */}
                  {datePreset === 'custom' && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">From</label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">To</label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </>
                  )}

                  {/* Type Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {announcementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Announcements Table */}
          {loading ? (
            <AnnouncementTableSkeleton />
          ) : filteredAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No announcements found</h3>
                  <p>No announcements match your current filters.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnnouncements.map((announcement) => (
                      <TableRow key={announcement.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{announcement.title}</span>
                            {announcement.is_featured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{announcement.creator.full_name}</div>
                            <div className="text-muted-foreground capitalize">
                              {announcement.creator.role}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {announcementTypes.find(t => t.value === announcement.announcement_type)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorities.find(p => p.value === announcement.priority)?.color}>
                            {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(announcement.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/announcements/${announcement.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {/* Filters for Pending Tab */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search announcements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {announcementTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Announcements Table */}
          {loading ? (
            <AnnouncementTableSkeleton />
          ) : pendingAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No pending announcements</h3>
                  <p>All announcements have been reviewed.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Creator</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAnnouncements
                      .filter(announcement => {
                        const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                             announcement.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                             announcement.creator.full_name.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesType = typeFilter === 'all' || announcement.announcement_type === typeFilter;
                        return matchesSearch && matchesType;
                      })
                      .map((announcement) => (
                        <TableRow key={announcement.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{announcement.title}</span>
                              {announcement.is_featured && (
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{announcement.creator.full_name}</div>
                              <div className="text-muted-foreground capitalize">
                                {announcement.creator.role}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {announcementTypes.find(t => t.value === announcement.announcement_type)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={priorities.find(p => p.value === announcement.priority)?.color}>
                              {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(announcement.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/admin/announcements/${announcement.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveAnnouncement(announcement.id)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>


      </Tabs>


    </div>
  );
}
