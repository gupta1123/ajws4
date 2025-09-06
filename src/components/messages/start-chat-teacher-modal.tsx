'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, Users, ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { useTeacher } from '@/lib/auth/teacher-context';
import { checkExistingThread, startConversation, getDivisionParents, CheckExistingThreadResponse, StartConversationResponse } from '@/lib/api/messages';

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
  const { teacherData } = useTeacher();
  const [step, setStep] = useState<ModalStep>('classes');
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [parents, setParents] = useState<ParentStudent[]>([]);
  // Removed unused selectedParent state
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeacherClasses = useCallback(() => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const assignments = teacherData?.assigned_classes || [];
      const transformedClasses: TeacherClass[] = assignments.map((assignment) => ({
        class_division_id: assignment.class_division_id,
        assignment_type: assignment.assignment_type as TeacherClass['assignment_type'],
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
    } catch (error) {
      console.error('Error preparing teacher classes:', error);
      setError('Failed to load your classes');
    } finally {
      setLoading(false);
    }
  }, [user, teacherData]);

  // Reset modal state when opened
  useEffect(() => {
    if (open) {
      setStep('classes');
      setSelectedClass(null);
      // no-op
      setSearchTerm('');
      setError(null);
      fetchTeacherClasses();
    }
  }, [open, fetchTeacherClasses]);

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
                      <Card key={`${parent.student_id}-${parent.parent.parent_id}`} className="transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedParentIds.has(parent.parent.parent_id)}
                              onCheckedChange={() => setSelectedParentIds(prev => {
                                const next = new Set(prev);
                                if (next.has(parent.parent.parent_id)) next.delete(parent.parent.parent_id); else next.add(parent.parent.parent_id);
                                return next;
                              })}
                            />
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{parent.parent.full_name}</h4>
                                {parent.parent.is_primary_guardian && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                                <Badge variant="outline" className="text-xs capitalize">{parent.parent.relationship}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Student: {parent.student_name} (Roll: {parent.roll_number})
                              </p>
                            </div>
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
        {step === 'parents' && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">Selected: {selectedParentIds.size}</div>
            <Button
              onClick={async () => {
                // reuse the direct/group logic
                const ids = Array.from(selectedParentIds);
                if (ids.length === 0) return;
                setCreating(true);
                try {
                  if (!user) return;
                  if (ids.length === 1) {
                    const parentId = ids[0];
                    const check = await checkExistingThread({ participants: [parentId], thread_type: 'direct' }, token || undefined);
                    if (check && typeof check === 'object' && 'status' in check && check.status === 'success' && 'data' in check && (check.data as unknown as CheckExistingThreadResponse['data'])?.exists && (check.data as unknown as CheckExistingThreadResponse['data']).thread?.id) {
                      onChatStarted((check.data as unknown as CheckExistingThreadResponse['data']).thread!.id, true);
                      onOpenChange(false);
                    } else {
                      const selected = parents.find(p => p.parent.parent_id === parentId);
                      const resp = await startConversation({
                        participants: [parentId],
                        message_content: selected ? `Hi ${selected.parent.full_name}, I'm reaching out regarding your child ${selected.student_name}.` : 'Hello',
                        thread_type: 'direct',
                        title: selected ? `Chat with ${selected.parent.full_name} (${selected.student_name})` : 'Chat with Parent'
                      }, token || undefined);
                      if (resp && typeof resp === 'object' && 'status' in resp && resp.status === 'success' && 'data' in resp && (resp.data as unknown as StartConversationResponse['data'])?.thread?.id) {
                        onChatStarted((resp.data as unknown as StartConversationResponse['data']).thread.id, false);
                        onOpenChange(false);
                      }
                    }
                  } else {
                    // Group chat: check if a thread with the same participants exists
                    const checkGroup = await checkExistingThread({ participants: ids, thread_type: 'group' }, token || undefined);
                    if (checkGroup && typeof checkGroup === 'object' && 'status' in checkGroup && checkGroup.status === 'success' && 'data' in checkGroup && (checkGroup.data as unknown as CheckExistingThreadResponse['data'])?.exists && (checkGroup.data as unknown as CheckExistingThreadResponse['data']).thread?.id) {
                      onChatStarted((checkGroup.data as unknown as CheckExistingThreadResponse['data']).thread!.id, true);
                      onOpenChange(false);
                    } else {
                      const titleBase = selectedClass ? `${selectedClass.class_info.class_level.name} ${selectedClass.class_info.division}` : 'Parents Group';
                      const resp = await startConversation({
                        participants: ids,
                        message_content: 'Hello everyone',
                        thread_type: 'group',
                        title: `Parents of ${titleBase}`
                      }, token || undefined);
                      if (resp && typeof resp === 'object' && 'status' in resp && resp.status === 'success' && 'data' in resp && (resp.data as unknown as StartConversationResponse['data'])?.thread?.id) {
                        onChatStarted((resp.data as unknown as StartConversationResponse['data']).thread.id, false);
                        onOpenChange(false);
                      }
                    }
                  }
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating || selectedParentIds.size === 0}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
              {selectedParentIds.size > 1 ? 'Start Group Chat' : 'Start Chat'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
