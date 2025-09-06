'use client';

import { useAuth } from '@/lib/auth/context';
import { useTeacher } from '@/lib/auth/teacher-context';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Image as ImageIcon, FileText, File as FileIcon, Edit, Trash2, X, RefreshCw, Download } from 'lucide-react';
import { homeworkServices, AttachmentsResponse } from '@/lib/api/homework';
import { academicServices } from '@/lib/api/academic';
import { ApiResponseWithCache, ApiErrorResponse } from '@/lib/api/client';
import { Homework, Attachment } from '@/types/homework';
import { toast } from '@/hooks/use-toast';
import { FileUploader } from '@/components/ui/file-uploader';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

// Interface for the API response structure
interface AssignedClass {
  assignment_id: string;
  class_division_id: string;
  division: string;
  class_name: string;
  class_level: string;
  sequence_number: number;
  academic_year: string;
  assignment_type: 'class_teacher' | 'subject_teacher' | 'assistant_teacher' | 'substitute_teacher';
  is_primary: boolean;
  assigned_date: string;
  subject?: string;
}

// API Response types
interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
}

interface HomeworkApiResponse extends ApiResponse {
  data?: {
    homework?: Homework;
  };
}



interface UploadApiResponse extends ApiResponse {
  data?: {
    attachments?: Attachment[];
  };
}

interface TeacherClassesApiResponse extends ApiResponse {
  data?: {
    assigned_classes?: AssignedClass[];
  };
}

// Interface for the transformed class data we're using
interface TransformedClass {
  id: string;
  division: string;
  class_level: {
    name: string;
  };
  academic_year: {
    year_name: string;
  };
}

type PageProps = { params: Promise<{ id: string }> };

export default function EditHomeworkPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const { user, token } = useAuth();
  const { teacherData, loading: teacherLoading } = useTeacher();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [homework, setHomework] = useState<Homework | null>(null);
  const [classDivisions, setClassDivisions] = useState<TransformedClass[]>([]);

  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [editingAttachment, setEditingAttachment] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editFileInput, setEditFileInput] = useState<HTMLInputElement | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; type: 'image' | 'pdf' | 'text' } | null>(null);
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});
  const [newFilesToUpload, setNewFilesToUpload] = useState<File[]>([]);
  const imageBlobUrlsRef = useRef<Record<string, string>>({});
  useEffect(() => {
    imageBlobUrlsRef.current = imageBlobUrls;
  }, [imageBlobUrls]);

  // keep track of mounted status to avoid state updates on unmounted
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Format class division name for display
  const formatClassName = (division: TransformedClass) => {
    return `${division.class_level?.name || 'Unknown'} - Section ${division.division}`;
  };

  // Get direct URL with token param for previewing inline
  const getPreviewUrl = useCallback((attachment: Attachment): string | null => {
    // Prefer direct download_url from the homework payload when available
    if (attachment.download_url) {
      setImageBlobUrls(prev => ({ ...prev, [attachment.id]: attachment.download_url! }));
      return attachment.download_url!;
    }

    // Fallback to API endpoint-based URL when download_url is not provided
    if (!homework?.id || !token) return null;
    const directUrl = homeworkServices.getAttachmentUrl(homework.id, attachment.id, token);
    setImageBlobUrls(prev => ({ ...prev, [attachment.id]: directUrl }));
    return directUrl;
  }, [homework?.id, token]);

  // Load all attachments and create blob URLs
  const loadAllAttachments = useCallback(async (attachments: Attachment[]) => {
    console.log('Loading attachments:', attachments.length);
    // We can still load when token is missing if download_url is present
    if (!homework?.id && attachments.every(a => !a.download_url)) return;
    const map: Record<string, string> = {};
    for (const attachment of attachments) {
      // Prefer direct download_url if present; else fall back to API endpoint URL
      if (attachment.download_url) {
        map[attachment.id] = attachment.download_url;
      } else if (homework?.id && token) {
        map[attachment.id] = homeworkServices.getAttachmentUrl(homework.id, attachment.id, token);
      }
    }
    if (mountedRef.current) {
      setImageBlobUrls(prev => ({ ...prev, ...map }));
    }
  }, [homework?.id, token]);



  const fetchExistingAttachmentsById = useCallback(
    async (homeworkId: string) => {
      if (!homeworkId || !token) {
        console.log('Cannot fetch attachments: missing homework ID or token', { homeworkId, hasToken: !!token });
        return;
      }
      try {
        console.log('Fetching attachments for homework:', homeworkId);
        const response = await homeworkServices.getHomeworkAttachments(homeworkId, token);
        console.log('Attachments API response status:', (response as ApiResponseWithCache<AttachmentsResponse> | ApiErrorResponse)?.status);

        if ((response as ApiErrorResponse)?.status === 'error') {
          console.log('API error while fetching attachments:', response);
          return;
        }

        const attachments = (response as ApiResponseWithCache<AttachmentsResponse>)?.data?.attachments ?? [];
        setExistingAttachments(attachments);
        console.log('Successfully loaded attachments:', attachments.length);
        if (attachments.length > 0) {
          console.log('Sample attachment:', {
            name: attachments[0].file_name,
            hasDownloadUrl: !!attachments[0].download_url,
            hasDownloadEndpoint: !!attachments[0].download_endpoint
          });
        }

        // Load all attachments
        await loadAllAttachments(attachments);
      } catch (err) {
        console.error('Error fetching attachments:', err);
      }
    },
    [token, loadAllAttachments]
  );

  // Actual delete logic (invoked after user confirmation)
  const performDeleteAttachment = async (attachment: Attachment) => {
    if (!homework?.id || !token) return;

    try {
      setDeleting(true);
      const response = await homeworkServices.deleteAttachment(homework.id, attachment.id, token);
      if ((response as ApiResponse)?.status === 'success') {
        toast({
          title: "Success",
          description: "Attachment deleted successfully!",
          variant: "success",
        });
        // Remove from local state
        setExistingAttachments(prev => prev.filter(att => att.id !== attachment.id));
        setImageBlobUrls(prev => {
          const { [attachment.id]: _removed, ...rest } = prev;
          return rest;
        });
      } else {
        throw new Error((response as ApiResponse)?.message || 'Failed to delete attachment');
      }
    } catch (err) {
      console.error('Error deleting attachment:', err);
      toast({
        title: "Error",
        description: "Failed to delete attachment. Please try again.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditAttachment = async (attachment: Attachment, newFile: File) => {
    if (!homework?.id || !token) return;

    try {
      const formData = new FormData();
      formData.append('files', newFile);

      const response = await homeworkServices.updateAttachment(homework.id, attachment.id, formData, token);
      if ((response as ApiResponse)?.status === 'success') {
        toast({
          title: "Success",
          description: "Attachment updated successfully!",
          variant: "success",
        });
        // Refresh attachments to get updated data
        await fetchExistingAttachmentsById(homework.id);
      } else {
        throw new Error((response as ApiResponse)?.message || 'Failed to update attachment');
      }
    } catch (err) {
      console.error('Error updating attachment:', err);
      toast({
        title: "Error",
        description: "Failed to update attachment. Please try again.",
        variant: "error",
      });
    }
  };

  const handleThumbnailClick = (attachment: Attachment) => {
    const previewUrl = imageBlobUrls[attachment.id];

    if (previewUrl) {
      if (attachment.file_type?.startsWith('image/')) {
        setPreviewImage({ url: previewUrl, name: attachment.file_name, type: 'image' });
      } else if (attachment.file_type === 'application/pdf') {
        setPreviewImage({ url: previewUrl, name: attachment.file_name, type: 'pdf' });
      } else if (attachment.file_type === 'text/plain') {
        setPreviewImage({ url: previewUrl, name: attachment.file_name, type: 'text' });
      } else {
        // For other file types, just download
        handleDownload(attachment);
      }
    } else {
      console.log('Preview URL not available for:', attachment.file_name);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    // Use direct download_url when available; else fallback to Heroku attachment endpoint
    const directUrl = attachment.download_url
      ? attachment.download_url
      : (homework?.id && token
        ? homeworkServices.getAttachmentUrl(homework.id, attachment.id, token)
        : '');
    if (!directUrl) return;
    const link = document.createElement('a');
    link.href = directUrl;
    link.target = '_blank';
    // Let browser handle content-type; omit download attribute for cross-origin
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-green-500" />;
    } else if (fileType?.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (fileType?.includes('word') || fileType?.includes('document') || fileType?.includes('msword')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (fileType?.includes('text') || fileType === 'text/plain') {
      return <FileText className="h-5 w-5 text-gray-500" />;
    } else {
      return <FileIcon className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const [formData, setFormData] = useState({
    class_division_id: '',
    subject: '',
    title: '',
    description: '',
    due_date: ''
  });

  // Fetch base data
  useEffect(() => {
    const homeworkIdFromParams = unwrappedParams.id;

    const fetchData = async () => {
      if (!user || !token || !homeworkIdFromParams) return;

      try {
        setLoading(true);
        setError(null);

        // Use teacher data from context
        if (teacherData && teacherData.secondary_classes) {
          // Filter for subject teacher assignments from secondary_classes
          const subjectTeacherClasses = teacherData.secondary_classes;

          const transformedClasses: TransformedClass[] = subjectTeacherClasses.map((assignment) => ({
            id: assignment.class_division_id,
            division: assignment.division,
            class_level: { name: assignment.class_level },
            academic_year: { year_name: assignment.academic_year }
          }));

          // dedupe (shouldn't be needed with new API, but keeping for safety)
          const uniqueClasses = transformedClasses.filter(
            (classItem, index, self) => index === self.findIndex(c => c.id === classItem.id)
          );
          setClassDivisions(uniqueClasses);
        }

        // Fetch specific homework data
        console.log('Fetching homework with ID:', homeworkIdFromParams);
        const homeworkResponse = await homeworkServices.getHomeworkById(token, homeworkIdFromParams);
        console.log('API Response:', homeworkResponse);

        if ((homeworkResponse as HomeworkApiResponse)?.status === 'success') {
          const homeworkData = (homeworkResponse as HomeworkApiResponse).data?.homework;
          if (homeworkData) {
            console.log('Found homework data:', homeworkData);
            setHomework(homeworkData);
            const formattedDueDate = homeworkData.due_date
              ? new Date(homeworkData.due_date).toISOString().split('T')[0]
              : '';

            setFormData({
              class_division_id: homeworkData.class_division_id ?? '',
              subject: homeworkData.subject ?? '',
              title: homeworkData.title ?? '',
              description: homeworkData.description ?? '',
              due_date: formattedDueDate
            });
            
            // Prefer attachments included in the homework response if present
            const inlineAttachments = Array.isArray(homeworkData.attachments)
              ? homeworkData.attachments
              : [];

            if (inlineAttachments.length > 0) {
              setExistingAttachments(inlineAttachments);
              // Build direct preview URLs using Heroku base via service helper
              await loadAllAttachments(inlineAttachments);
            } else {
              // Fallback: fetch attachments via API
              await fetchExistingAttachmentsById(homeworkIdFromParams);
            }
          } else {
            setError('Homework data not found in response');
            console.error('No homework data in response:', (homeworkResponse as HomeworkApiResponse).data);
          }
        } else {
          setError('Failed to fetch homework');
          console.error('API Error:', homeworkResponse);
        }
      } catch (err) {
        setError('Failed to load homework data');
        console.error('Error fetching data:', err);
        toast({
          title: "Error",
          description: "Failed to load homework data",
          variant: "error",
        });
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unwrappedParams.id, token, user]);

  // Also refetch attachments if homework id changes (e.g., after an update)
  useEffect(() => {
    if (homework?.id && token && !loading) {
      fetchExistingAttachmentsById(homework.id);
    }
  }, [homework?.id, token, loading, fetchExistingAttachmentsById]);

  // Refresh attachments when page regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (token && homework?.id) {
        fetchExistingAttachmentsById(homework.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token, homework?.id, fetchExistingAttachmentsById]);

  // Cleanup function for blob URLs
  const cleanupBlobUrls = useCallback(() => {
    const urls = Object.values(imageBlobUrlsRef.current);
    urls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    // Do not set state here to avoid update loops during unmount/cleanup
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupBlobUrls();
    };
  }, [cleanupBlobUrls]);



  // Only allow teachers to access this page
  if (user?.role !== 'teacher') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-600">Only teachers can access this page.</p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container max-w-2xl mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-gray-600">Loading homework...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Show error state
  if (error || !homework) {
    return (
      <ProtectedRoute>
        <div className="container max-w-2xl mx-auto py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Error Loading Homework</h2>
            <p className="text-gray-600 mb-4">{error || 'Homework not found'}</p>
            <Button onClick={() => router.back()}>
              ← Go Back
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUploadFiles = async (files: File[]) => {
    // Queue for upload on Save
    setNewFilesToUpload(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const response = await homeworkServices.updateHomework(homework!.id, formData, token!);
      if ((response as ApiResponse)?.status === 'success') {
        // If there are new files selected, upload them now
        if (newFilesToUpload.length > 0) {
          try {
            const upRes = await homeworkServices.uploadAttachments(homework!.id, newFilesToUpload, token!);
            if ((upRes as ApiResponse)?.status !== 'success') {
              throw new Error((upRes as ApiResponse)?.message || 'Failed to upload attachments');
            }
          } catch (uploadErr) {
            console.error('Attachment upload error during update:', uploadErr);
            toast({ title: 'Attachment upload failed', description: 'Homework was updated, but attachments failed to upload.', variant: 'error' });
          }
        }
        router.push('/homework');
      } else {
        setError('Failed to update homework');
      }
    } catch (err) {
      setError('An error occurred while updating homework');
      console.error('Error updating homework:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ProtectedRoute>
      <div className="container max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="mb-4"
          >
            ← Back to Homework
          </Button>
          <h1 className="text-3xl font-bold mb-2">Edit Homework</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Update the homework assignment details
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Edit Homework Assignment</CardTitle>
              <CardDescription>
                Update the details for the homework assignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class_division_id">Class</Label>
                  <Select
                    value={formData.class_division_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, class_division_id: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classDivisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {formatClassName(division)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Enter subject"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter homework title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter detailed description of the homework"
                  rows={4}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  name="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* File Upload Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Attachments</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => homework?.id && fetchExistingAttachmentsById(homework.id)}
                    className="h-8 px-3"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                {/* Hidden file input for editing */}
                <input
                  type="file"
                  ref={setEditFileInput}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && editingAttachment) {
                      const attachment = existingAttachments.find(att => att.id === editingAttachment);
                      if (attachment) {
                        handleEditAttachment(attachment, file);
                      }
                      setEditingAttachment(null);
                      if (editFileInput) editFileInput.value = '';
                    }
                  }}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
                
                {/* Existing Attachments */}
                {existingAttachments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-muted-foreground">Existing Files:</p>
                      <span className="text-xs text-muted-foreground">
                        {existingAttachments.length} file{existingAttachments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                      {existingAttachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="bg-muted/20 rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                        >
                          {/* Image/File Display */}
                          <div className="relative mb-3">
                            {attachment.file_type?.startsWith('image/') ? (
                              <div className="relative">
                                {imageBlobUrls[attachment.id] ? (
                                  <img
                                    src={imageBlobUrls[attachment.id]}
                                    alt={attachment.file_name}
                                    className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => handleThumbnailClick(attachment)}
                                    title="Click to preview"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                      console.error('Blob URL failed for:', attachment.file_name);
                                      // Hide broken img and show fallback
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-24 flex items-center justify-center bg-muted rounded border">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                      <span className="text-xs text-muted-foreground">Loading...</span>
                                    </div>
                                  </div>
                                )}
                                {/* Fallback icon if image fails to load */}
                                <div className="hidden w-full h-24 flex items-center justify-center bg-muted rounded border">
                                  <div className="flex flex-col items-center gap-1">
                                    {getFileIcon(attachment.file_type)}
                                    <span className="text-xs text-muted-foreground">Failed to load</span>
                                  </div>
                                </div>
                              </div>
                            ) : attachment.file_type === 'application/pdf' && imageBlobUrls[attachment.id] ? (
                              <div className="relative">
                                <iframe
                                  src={imageBlobUrls[attachment.id]}
                                  className="w-full h-24 rounded border cursor-pointer"
                                  title={`Preview of ${attachment.file_name}`}
                                  onClick={() => handleThumbnailClick(attachment)}
                                />
                              </div>
                            ) : attachment.file_type === 'text/plain' && imageBlobUrls[attachment.id] ? (
                              <div className="relative">
                                <iframe
                                  src={imageBlobUrls[attachment.id]}
                                  className="w-full h-24 rounded border cursor-pointer"
                                  title={`Preview of ${attachment.file_name}`}
                                  onClick={() => handleThumbnailClick(attachment)}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-24 flex items-center justify-center bg-muted rounded border">
                                {getFileIcon(attachment.file_type)}
                              </div>
                            )}
                          </div>

                          {/* File Information */}
                          <div className="text-center space-y-2">
                            <p className="text-xs font-medium text-foreground truncate" title={attachment.file_name}>
                              {attachment.file_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(attachment.file_size)}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-center gap-1 mt-3">
                            {attachment.file_type?.startsWith('image/') && homework?.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleThumbnailClick(attachment)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Preview image"
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(attachment)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Download file"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingAttachment(attachment.id);
                                if (editFileInput) editFileInput.click();
                              }}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Edit file"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => { setAttachmentToDelete(attachment); setConfirmDeleteOpen(true); }}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Delete file"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Uploader */}
                <FileUploader
                  onFilesSelected={(files) => setNewFilesToUpload(files)}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                  maxFiles={5}
                  maxSize={10}
                  className="border-0 shadow-none"
                  hideUploadButton
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: PDF, Word documents, text files, and images. Max 5 files, 10MB each.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Update Homework'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* File Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-4xl max-h-[90vh] overflow-hidden w-full">
            <div className="flex items-center justify-between p-4 border-b dark:border-neutral-800">
              <h3 className="font-medium">{previewImage.name}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewImage(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {previewImage.type === 'image' ? (
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="max-w-full max-h-full object-contain mx-auto"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                  onError={() => {
                    console.error('Preview image failed to load:', previewImage.name);
                    setPreviewImage(null);
                  }}
                />
              ) : previewImage.type === 'pdf' ? (
                <iframe
                  src={previewImage.url}
                  className="w-full h-[70vh] border-0"
                  title={`Preview of ${previewImage.name}`}
                  onError={() => {
                    console.error('Preview PDF failed to load:', previewImage.name);
                    setPreviewImage(null);
                  }}
                />
              ) : previewImage.type === 'text' ? (
                <iframe
                  src={previewImage.url}
                  className="w-full h-[70vh] border-0 bg-white dark:bg-neutral-900"
                  title={`Preview of ${previewImage.name}`}
                  onError={() => {
                    console.error('Preview text failed to load:', previewImage.name);
                    setPreviewImage(null);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open);
          if (!open) setAttachmentToDelete(null);
        }}
        title="Delete Attachment"
        description={attachmentToDelete ? `Are you sure you want to delete "${attachmentToDelete.file_name}"? This action cannot be undone.` : 'Are you sure you want to delete this attachment?'}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
        isLoading={deleting}
        onConfirm={async () => {
          if (attachmentToDelete) {
            await performDeleteAttachment(attachmentToDelete);
            setConfirmDeleteOpen(false);
            setAttachmentToDelete(null);
          }
        }}
      />
    </ProtectedRoute>
  );
}
