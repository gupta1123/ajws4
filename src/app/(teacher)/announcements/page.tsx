'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, AlertCircle, Star, BookOpen, Info, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/context';
import { createAnnouncementsAPI, TeacherAnnouncementsResponse, Announcement, AnnouncementFilters } from '@/lib/api/announcements';

// Skeleton Loader Components
const AnnouncementTableSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Title</TableHead>
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
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-12"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-16"></div>
                </div>
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
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-blue-100 text-blue-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-800' },
];



export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<string>('this-month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const { toast } = useToast();
  const { token } = useAuth();
  const router = useRouter();

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
      if (!token) return;

      try {
        setLoading(true);
        const announcementsAPI = createAnnouncementsAPI(token);

        // Build filters object
        const filters: AnnouncementFilters = {
          page: currentPage,
          limit: 20, // Default page size
        };

        // Add filters only if they are not 'all'
        if (typeFilter !== 'all') {
          filters.announcement_type = typeFilter;
        }

        // Add date filters if set
        if (startDate && endDate) {
          filters.start_date = startDate + 'T00:00:00Z';
          filters.end_date = endDate + 'T23:59:59Z';
        }

        console.log('Fetching announcements with filters:', filters);

        const response: TeacherAnnouncementsResponse = await announcementsAPI.getTeacherAnnouncements(filters);

        if (response.status === 'success') {
          setAnnouncements(response.data.announcements);
          setTotalPages(response.data.pagination.total_pages);
          setTotalAnnouncements(response.data.pagination.total);
          console.log('Announcements fetched successfully:', response.data.announcements.length);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch announcements',
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    }, [token, toast, currentPage, typeFilter, startDate, endDate]);

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
  }, [token, startDate, endDate, fetchAnnouncements]);

  // Update dates when preset changes
  useEffect(() => {
    if (datePreset !== 'custom') {
      setDateRange(datePreset);
    }
  }, [datePreset]);





  // Only filter by search term client-side (other filters are handled server-side)
  const filteredAnnouncements = announcements.filter(announcement => {
    if (!searchTerm) return true;
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);




  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day} ${month} '${year}`;
  };



  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Create button moved to topbar area */}
      <div className="mb-6 flex justify-end">
        <Button
          className="flex items-center gap-2"
          onClick={() => router.push('/announcements/create')}
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </Button>
      </div>

      {/* Help Notice */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Info className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">
                Need to make changes?
              </h3>
              <p className="text-sm text-muted-foreground">
                You can edit or delete your announcements while they&apos;re pending approval. Once approved or rejected, you&apos;ll need to contact an administrator for any changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Announcements List */}
      {loading ? (
        <AnnouncementTableSkeleton />
      ) : filteredAnnouncements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No announcements found</h3>
              <p>Create your first announcement to get started.</p>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Publish Date</TableHead>
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
                      <div className="flex flex-wrap gap-1">
                        {announcement.target_class_names && announcement.target_class_names.length > 0 ? (
                          announcement.target_class_names.map((className, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {className}
                            </Badge>
                          ))
                        ) : announcement.target_classes && announcement.target_classes.length > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            {announcement.target_classes.length} class(es)
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">All Classes</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(announcement.publish_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/announcements/${announcement.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {announcements.length} of {totalAnnouncements} announcements
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNumber}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNumber)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
