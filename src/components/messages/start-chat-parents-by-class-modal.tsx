'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Layers, LayoutGrid, Users, ArrowLeft, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/context';
import { classDivisionsServices, type ClassDivision } from '@/lib/api/class-divisions';
import { getDivisionParents, startConversation, checkExistingThread, type DivisionParentsResponse, type CheckExistingThreadResponse, type StartConversationResponse } from '@/lib/api/messages';

type Step = 'classes' | 'divisions' | 'parents' | 'creating';

interface StartChatParentsByClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadReady: (threadId: string) => void;
}

interface ParentRow {
  student_id: string;
  student_name: string;
  roll_number: string;
  parent: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string;
    relationship: string;
    is_primary_guardian: boolean;
  };
}

export function StartChatParentsByClassModal({ open, onOpenChange, onThreadReady }: StartChatParentsByClassModalProps) {
  const { token, user } = useAuth();

  const [step, setStep] = useState<Step>('classes');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [divisions, setDivisions] = useState<ClassDivision[]>([]);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);

  const [parents, setParents] = useState<ParentRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());

  const groupedByClassName = useMemo(() => {
    const map = new Map<string, ClassDivision[]>();
    divisions.forEach((d) => {
      const key = d.class_level.name;
      const arr = map.get(key) || [];
      arr.push(d);
      map.set(key, arr);
    });
    return map; // key: class name, value: divisions
  }, [divisions]);

  const filteredParents = useMemo(() => {
    if (!search) return parents;
    const s = search.toLowerCase();
    return parents.filter(p =>
      p.student_name.toLowerCase().includes(s) ||
      p.parent.full_name.toLowerCase().includes(s) ||
      p.roll_number.toLowerCase().includes(s) ||
      p.parent.relationship.toLowerCase().includes(s)
    );
  }, [parents, search]);

  const fetchDivisions = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await classDivisionsServices.getClassDivisions(token);
      setDivisions(res.data.class_divisions);
    } catch {
      setError('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchParents = useCallback(async (divisionId: string) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getDivisionParents(divisionId, token);
      if (res && typeof res === 'object' && 'status' in res && res.status === 'success' && res.data) {
        const rows: ParentRow[] = [];
        const data = res.data as unknown as DivisionParentsResponse['data'];
        const students = data.students || [];
        students.forEach((stu) => {
          const student = stu.student;
          (stu.parents || []).forEach((p) => {
            rows.push({
              student_id: student.id,
              student_name: student.name,
              roll_number: student.roll_number,
              parent: {
                id: p.id,
                full_name: p.name,
                email: p.email,
                phone_number: p.phone_number,
                relationship: p.relationship,
                is_primary_guardian: p.is_primary_guardian,
              },
            });
          });
        });
        setParents(rows);
      } else {
        setError('Failed to load parents');
      }
    } catch {
      setError('Failed to load parents');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      setStep('classes');
      setSelectedClassName(null);
      setSelectedDivisionId(null);
      setParents([]);
      setSelectedParentIds(new Set());
      setSearch('');
      fetchDivisions();
    }
  }, [open, fetchDivisions]);

  const onPickClass = (className: string) => {
    setSelectedClassName(className);
    setStep('divisions');
  };

  const onPickDivision = (divisionId: string) => {
    setSelectedDivisionId(divisionId);
    setStep('parents');
    fetchParents(divisionId);
  };

  const toggleParent = (parentId: string) => {
    setSelectedParentIds(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId); else next.add(parentId);
      return next;
    });
  };

  const startChat = async () => {
    if (!user?.id || selectedParentIds.size === 0) return;
    try {
      setCreating(true);
      const ids = Array.from(selectedParentIds);
      // Try to find an existing thread only when single selection
      if (ids.length === 1) {
        const check = await checkExistingThread({ participants: [ids[0]], thread_type: 'direct' }, token || undefined);
        if (check && typeof check === 'object' && 'status' in check && check.status === 'success' && 'data' in check) {
          const checkData = check.data as unknown as CheckExistingThreadResponse['data'];
          if (checkData.exists && checkData.thread?.id) {
            onThreadReady(checkData.thread.id);
            onOpenChange(false);
            return;
          }
        }
      } else if (ids.length > 1) {
        // For group chats, also check if a group with same participants exists
        const checkGroup = await checkExistingThread({ participants: ids, thread_type: 'group' }, token || undefined);
        if (checkGroup && typeof checkGroup === 'object' && 'status' in checkGroup && checkGroup.status === 'success' && 'data' in checkGroup) {
          const checkGroupData = checkGroup.data as unknown as CheckExistingThreadResponse['data'];
          if (checkGroupData.exists && checkGroupData.thread?.id) {
            onThreadReady(checkGroupData.thread.id);
            onOpenChange(false);
            return;
          }
        }
      }

      const title = ids.length === 1
        ? `Chat with ${parents.find(p => p.parent.id === ids[0])?.parent.full_name || 'Parent'}`
        : `Parents of ${selectedClassName || ''}${selectedDivisionId ? ` ${divisions.find(d => d.id === selectedDivisionId)?.division || ''}` : ''}`.trim();

      const resp = await startConversation({
        participants: ids,
        message_content: ids.length === 1 ? 'Hello' : 'Hello everyone',
        thread_type: ids.length === 1 ? 'direct' : 'group',
        title,
      }, token || undefined);

      if (resp && typeof resp === 'object' && 'status' in resp && resp.status === 'success' && 'data' in resp) {
        const respData = resp.data as unknown as StartConversationResponse['data'];
        onThreadReady(respData.thread.id);
        onOpenChange(false);
      } else {
        setError('Failed to start chat');
      }
    } finally {
      setCreating(false);
    }
  };

  const parentCount = selectedParentIds.size;
  const selectedDivisionName = useMemo(() => {
    if (!selectedDivisionId) return '';
    const d = divisions.find(x => x.id === selectedDivisionId);
    return d ? `${d.class_level.name} ${d.division}` : '';
  }, [selectedDivisionId, divisions]);

  const back = () => {
    if (step === 'parents') setStep('divisions');
    else if (step === 'divisions') setStep('classes');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'classes' && (
              <Button variant="ghost" size="sm" onClick={back} className="mr-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <MessageSquare className="h-5 w-5" />
            {step === 'classes' && 'Select a Class'}
            {step === 'divisions' && `Divisions of ${selectedClassName}`}
            {step === 'parents' && `Parents in ${selectedDivisionName}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {step === 'classes' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from(groupedByClassName.entries()).map(([className, items]) => (
                    <Card key={className} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onPickClass(className)}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Layers className="h-4 w-4" /> {className}
                        </CardTitle>
                        <CardDescription>{items.length} division(s)</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'divisions' && (
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(groupedByClassName.get(selectedClassName || '') || []).map((d) => (
                    <Card key={d.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onPickDivision(d.id)}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <LayoutGrid className="h-4 w-4" /> {d.class_level.name} {d.division}
                        </CardTitle>
                        <CardDescription>{d.academic_year.year_name}</CardDescription>
                      </CardHeader>
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
                  <Input placeholder="Search by student, parent, roll #, relationship" className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredParents.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <div className="text-muted-foreground">No parents found</div>
                    </div>
                  ) : (
                    filteredParents.map((row) => (
                      <Card key={`${row.student_id}-${row.parent.id}`} className="transition-colors">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedParentIds.has(row.parent.id)}
                              onCheckedChange={() => toggleParent(row.parent.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{row.parent.full_name}</div>
                                {row.parent.is_primary_guardian && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                                <Badge variant="outline" className="text-xs capitalize">{row.parent.relationship}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Student: {row.student_name} (Roll: {row.roll_number})
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">Selected: {parentCount}</div>
                <Button onClick={startChat} disabled={creating || parentCount === 0}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  {parentCount > 1 ? 'Start Group Chat' : 'Start Chat'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
