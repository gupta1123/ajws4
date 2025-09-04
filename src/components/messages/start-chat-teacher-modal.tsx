'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Users, ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { academicServices } from '@/lib/api/academic';
import { checkExistingThread, startConversation, getDivisionParents } from '@/lib/api/messages';

interface TeacherClass {
  class_division_id: string;
  assignment_type: 'class_teacher' | 'subject_teacher' | 'assistant_teacher' | 'substitute_teacher';
  subject: string | null;
  is_primary: boolean;
  class_info: {
    id: string;
    division: string;
    class_level: {
      name: string;
    };
    academic_year: {
      year_name: string;
    };
  };
}

interface ParentStudent {
  student_id: string;
  student_name: string;
  roll_number: string;
  parent: {
    parent_id: string;
    full_name: string;
    email: string | null;
    phone_number: string;
    relationship: string;
    is_primary_guardian: boolean;
  };
}

interface StartChatTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatStarted: (threadId: string, isExisting: boolean) => void;
}

type ModalStep = 'classes' | 'parents' | 'creating';

export function StartChatTeacherModal({ open, onOpenChange, onChatStarted }: StartChatTeacherModalProps) {
  const { token, user } = useAuth();
  const [step, setStep] = useState<ModalStep>('classes');
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [parents, setParents] = useState<ParentStudent[]>([]);
  const [selectedParent, setSelectedParent] = useState<ParentStudent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (open) {
      setStep('classes');
      setSelectedClass(null);
      setSelectedParent(null);
      setSearchTerm('');
      setError(null);
      fetchTeacherClasses();
    }
  }, [open]);

  const fetchTeacherClasses = useCallback(async () => {
    if (!token || !user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await academicServices.getMyTeacherInfo(token);

      if (response.status === 'success' && response.data.assigned_classes) {
        // Transform the API response to match our interface
        const transformedClasses: TeacherClass[] = response.data.assigned_classes.map((assignment) => ({
          class_division_id: assignment.class_division_id,
          assignment_type: assignment.assignment_type,
          subject: assignment.subject || null,
          is_primary: assignment.is_primary,
          class_info: {
            id: assignment.class_division_id,
            division: assignment.division,
            class_level: {
              name: assignment.class_name
            },
            academic_year: {
              year_name: assignment.academic_year
            }
          }
        }));
        setClasses(transformedClasses);
      } else {
        setError('Failed to fetch your assigned classes');
      }
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      setError('Failed to load your classes');
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  const fetchDivisionParents = useCallback(async (classDivisionId: string) => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      const response = await getDivisionParents(classDivisionId, token);

      if (response && typeof response === 'object' && 'status' in response && response.status === 'success' && 'data' in response && response.data) {
        // Flatten the nested structure: students with parents arrays -> individual parent-student pairs
        const apiData = response.data as unknown as {
          class_division_id: string;
          students: {
            student: {
              id: string;
              name: string;
              roll_number: string;
            };
            parents: {
              id: string;
              name: string;
              email: string | null;
              phone_number: string;
              relationship: string;
              is_primary_guardian: boolean;
            }[];
          }[];
          total_students: number;
          total_parents: number;
        };
        const flattenedParents: ParentStudent[] = [];

        if (apiData.students) {
          apiData.students.forEach((studentData: {
            student: {
              id: string;
              name: string;
              roll_number: string;
            };
            parents: {
              id: string;
              name: string;
              email: string | null;
              phone_number: string;
              relationship: string;
              is_primary_guardian: boolean;
            }[];
          }) => {
            if (studentData.parents && Array.isArray(studentData.parents)) {
              studentData.parents.forEach((parent: {
                id: string;
                name: string;
                email: string | null;
                phone_number: string;
                relationship: string;
                is_primary_guardian: boolean;
              }) => {
                flattenedParents.push({
                  student_id: studentData.student.id,
                  student_name: studentData.student.name,
                  roll_number: studentData.student.roll_number,
                  parent: {
                    parent_id: parent.id,
                    full_name: parent.name,
                    email: parent.email,
                    phone_number: parent.phone_number,
                    relationship: parent.relationship,
                    is_primary_guardian: parent.is_primary_guardian
                  }
                });
              });
            }
          });
        }

        setParents(flattenedParents);
      } else {
        setError('Failed to fetch parents for this class');
      }
    } catch (error) {
      console.error('Error fetching division parents:', error);
      setError('Failed to load parents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleClassSelect = (classItem: TeacherClass) => {
    setSelectedClass(classItem);
    setStep('parents');
    fetchDivisionParents(classItem.class_division_id);
  };

  const handleParentSelect = async (parent: ParentStudent) => {
    if (!user) return;

    try {
      setCreating(true);
      setSelectedParent(parent);

      // Check if chat thread already exists
      const parentId = parent.parent.parent_id;
      if (!parentId) {
        setError('Invalid parent ID');
        return;
      }

      const checkResponse = await checkExistingThread({
        participants: [user.id, parentId],
        thread_type: 'direct'
      }, token || undefined);

      if (checkResponse && typeof checkResponse === 'object' && 'status' in checkResponse && checkResponse.status === 'success' && 'data' in checkResponse) {
        const data = checkResponse.data as unknown as {
          exists: boolean;
          thread?: {
            id: string;
            title: string;
            thread_type: string;
            created_at: string;
            updated_at: string;
            created_by: string;
            status: string;
          };
        };
        if (data.exists && data.thread) {
          // Thread exists, open it
          onChatStarted(data.thread.id, true); // true = existing chat
          onOpenChange(false);
          return;
        }
      }

      // Thread doesn't exist, create new one
      const startResponse = await startConversation({
        participants: [user.id, parentId],
        message_content: `Hi ${parent.parent.full_name}, I'm reaching out regarding your child ${parent.student_name}.`,
        thread_type: 'direct',
        title: `Chat with ${parent.parent.full_name} (${parent.student_name})`
      }, token || undefined);

      if (startResponse && typeof startResponse === 'object' && 'status' in startResponse && startResponse.status === 'success' && 'data' in startResponse) {
        const data = startResponse.data as unknown as {
          thread: {
            id: string;
            thread_type: string;
            title: string;
            created_by: string;
            created_at: string;
          };
          message: {
            id: string;
            content: string;
            sender_id: string;
          };
        };
        onChatStarted(data.thread.id, false); // false = new chat
        onOpenChange(false);
      } else {
        setError('Failed to start chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to start chat');
    } finally {
      setCreating(false);
      setSelectedParent(null);
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.parent.relationship.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (parent.parent.is_primary_guardian && 'primary'.includes(searchTerm.toLowerCase()))
  );

  const getModalTitle = () => {
    switch (step) {
      case 'classes':
        return 'Select a Class';
      case 'parents':
        return `Parents in ${selectedClass?.class_info.class_level.name} ${selectedClass?.class_info.division}`;
      case 'creating':
        return 'Starting Chat...';
      default:
        return 'Start Chat';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[500px]">
          {/* Step indicator */}
          {step !== 'classes' && (
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('classes');
                  setSelectedClass(null);
                  setParents([]);
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Classes
              </Button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {step === 'classes' && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a class to see the parents of students enrolled in that class.
                </p>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading your classes...</span>
                  </div>
                ) : classes.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Classes Assigned</h3>
                    <p className="text-muted-foreground">
                      You don&apos;t have any classes assigned to you yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.map((classItem) => (
                      <Card
                        key={classItem.class_division_id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleClassSelect(classItem)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center justify-between">
                            {classItem.class_info.class_level.name} {classItem.class_info.division}
                            {classItem.is_primary && (
                              <Badge variant="secondary" className="text-xs">
                                Primary
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {classItem.assignment_type === 'class_teacher'
                              ? 'Class Teacher'
                              : `Subject Teacher - ${classItem.subject}`}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            Academic Year: {classItem.class_info.academic_year.year_name}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 'parents' && (
              <div>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student name, parent name, roll number, relationship, or 'primary'..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading parents...</span>
                  </div>
                ) : filteredParents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Parents Found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No parents match your search.' : 'No parents found for this class.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredParents.map((parent) => (
                      <Card
                        key={`${parent.student_id}-${parent.parent.parent_id}`}
                        className={`cursor-pointer hover:shadow-md transition-all ${
                          selectedParent?.student_id === parent.student_id && selectedParent?.parent.parent_id === parent.parent.parent_id ? 'ring-2 ring-primary' : ''
                        } ${creating && selectedParent?.student_id === parent.student_id && selectedParent?.parent.parent_id === parent.parent.parent_id ? 'opacity-50' : ''}`}
                        onClick={() => !creating && handleParentSelect(parent)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{parent.parent.full_name}</h4>
                                    {parent.parent.is_primary_guardian && (
                                      <Badge variant="secondary" className="text-xs">
                                        Primary
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Student: {parent.student_name} (Roll: {parent.roll_number})
                                  </p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {parent.parent.relationship}
                                  </p>
                                </div>
                              </div>
                            </div>
                            {creating && selectedParent?.student_id === parent.student_id && selectedParent?.parent.parent_id === parent.parent.parent_id && (
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
