import { supabase, isSupabaseConfigured } from './supabase';
import { MOCK_SESSIONS, MOCK_STAFF } from './mockData';
import { FeedbackSession, Staff, MeetingType, FeedbackStatus, ManagerComment, InterviewPhase, CAProfile } from '@/types';

function mapDbSessionToApp(row: Record<string, unknown>): FeedbackSession {
  const staffsData = row.staffs as Record<string, unknown> | null;
  return {
    id: row.id as string,
    tenantId: (row.tenant_id as string) ?? 'tenant_001',
    meetingDate: row.meeting_date as string,
    meetingType: row.meeting_type as MeetingType,
    staffId: (row.staff_id as string) ?? undefined,
    staffName: (staffsData?.name as string) ?? '',
    candidateName: row.candidate_name as string,
    transcript: (row.transcript as string) ?? '',
    totalScore: (row.total_score as number) ?? 0,
    summary: (row.summary as string) ?? '',
    goodPoints: (row.good_points as string[]) ?? [],
    improvements: (row.improvements as string[]) ?? [],
    criticalPoints: (row.critical_points as string[]) ?? [],
    scriptExample: (row.script_example as string) ?? '',
    topPerformerGap: (row.top_performer_gap as string) ?? '',
    nextTheme: (row.next_theme as string) ?? '',
    managerComment: (row.manager_comment as string) ?? '',
    scores: (row.scores as FeedbackSession['scores']) ?? {
      trust: 0, hearing: 0, extraction: 0, proposal: 0,
      closing: 0, nextAction: 0, communication: 0, initiative: 0,
    },
    kpiImpact: (row.kpi_impact as FeedbackSession['kpiImpact']) ?? {
      acceptance: '', application: '', interview: '', offer: '', revenue: '',
    },
    status: ((row.status as FeedbackStatus)) ?? '未確認',
    interviewPhase: (row.interview_phase as InterviewPhase) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function mapDbStaffToApp(row: Record<string, unknown>): Staff {
  return {
    id: row.id as string,
    tenantId: (row.tenant_id as string) ?? 'tenant_001',
    name: row.name as string,
    experience: row.experience as string,
    role: row.role as string,
    email: (row.email as string) ?? '',
    avatarColor: (row.avatar_color as string) ?? 'bg-gray-100 text-gray-700',
    createdAt: row.created_at as string,
  };
}

export async function fetchFeedbackSessions(): Promise<FeedbackSession[]> {
  if (!isSupabaseConfigured()) return MOCK_SESSIONS;

  const { data, error } = await supabase
    .from('feedback_sessions')
    .select('*, staffs(name)')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return MOCK_SESSIONS;

  return data.map(mapDbSessionToApp);
}

export async function fetchFeedbackSession(id: string): Promise<FeedbackSession | null> {
  const mock = MOCK_SESSIONS.find((s) => s.id === id) ?? null;

  if (!isSupabaseConfigured()) return mock;

  const { data, error } = await supabase
    .from('feedback_sessions')
    .select('*, staffs(name)')
    .eq('id', id)
    .single();

  if (error || !data) return mock;

  return mapDbSessionToApp(data);
}

export async function fetchStaff(): Promise<Staff[]> {
  if (!isSupabaseConfigured()) return MOCK_STAFF;

  const { data, error } = await supabase
    .from('staffs')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return MOCK_STAFF;

  return data.map(mapDbStaffToApp);
}

export async function fetchStaffById(id: string): Promise<Staff | null> {
  const mock = MOCK_STAFF.find((s) => s.id === id) ?? null;

  if (!isSupabaseConfigured()) return mock;

  const { data, error } = await supabase
    .from('staffs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return mock;

  return mapDbStaffToApp(data);
}

export async function fetchFeedbackByStaffId(staffId: string, staffName?: string): Promise<FeedbackSession[]> {
  if (!isSupabaseConfigured()) {
    if (staffName) return MOCK_SESSIONS.filter((s) => s.staffName === staffName);
    const staff = MOCK_STAFF.find((s) => s.id === staffId);
    if (!staff) return [];
    return MOCK_SESSIONS.filter((s) => s.staffName === staff.name);
  }

  const { data, error } = await supabase
    .from('feedback_sessions')
    .select('*, staffs(name)')
    .eq('staff_id', staffId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map(mapDbSessionToApp);
}

export async function fetchFeedbackSessionsFiltered(
  staffId?: string,
  interviewPhase?: string
): Promise<FeedbackSession[]> {
  const applyFilter = (sessions: FeedbackSession[]) => {
    let result = sessions;
    if (staffId) {
      result = result.filter(
        (s) => s.staffId === staffId || s.staffName === staffId
      );
    }
    if (interviewPhase) {
      result = result.filter((s) => s.interviewPhase === interviewPhase);
    }
    return result;
  };

  if (!isSupabaseConfigured()) return applyFilter(MOCK_SESSIONS);

  let query = supabase
    .from('feedback_sessions')
    .select('*, staffs(name)')
    .order('created_at', { ascending: false });

  if (staffId) query = (query as typeof query).eq('staff_id', staffId);
  if (interviewPhase) query = (query as typeof query).eq('interview_phase', interviewPhase);

  const { data, error } = await query;
  if (error || !data || data.length === 0) return applyFilter(MOCK_SESSIONS);
  return data.map(mapDbSessionToApp);
}

export async function fetchCAProfiles(): Promise<CAProfile[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_STAFF.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      email: s.email,
    }));
  }

  // Try profiles table first
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, role, email')
    .in('role', ['ca', 'manager', 'admin'])
    .order('name');

  if (profiles && profiles.length > 0) {
    return profiles.map((p) => ({
      id: p.id as string,
      name: p.name as string,
      role: p.role as string,
      email: p.email as string | undefined,
    }));
  }

  // Fall back to staffs table
  const { data: staffs } = await supabase
    .from('staffs')
    .select('id, name, role, email')
    .order('name');

  if (staffs && staffs.length > 0) {
    return staffs.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      role: (s.role as string) ?? 'ca',
      email: s.email as string | undefined,
    }));
  }

  return MOCK_STAFF.map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    email: s.email,
  }));
}

export async function fetchUserRole(
  email: string
): Promise<'admin' | 'manager' | 'ca'> {
  if (!isSupabaseConfigured()) return 'admin';
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', email)
    .single();
  return (data?.role as 'admin' | 'manager' | 'ca') ?? 'admin';
}

// ── Candidate Documents ───────────────────────────────────────────────────────

export interface CandidateDocument {
  id: string;
  candidateName: string;
  caId?: string;
  caName?: string;
  documentType: "resume" | "career";
  documentData: unknown;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

function mapDbDocToApp(row: Record<string, unknown>): CandidateDocument {
  return {
    id: row.id as string,
    candidateName: row.candidate_name as string,
    caId: row.ca_id as string | undefined,
    caName: row.ca_name as string | undefined,
    documentType: row.document_type as "resume" | "career",
    documentData: row.document_data,
    photoUrl: row.photo_url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchDocuments(caId?: string): Promise<CandidateDocument[]> {
  if (!isSupabaseConfigured()) return [];
  let query = supabase
    .from('candidate_documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (caId) query = (query as typeof query).eq('ca_id', caId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapDbDocToApp);
}

export async function saveDocument(
  doc: Omit<CandidateDocument, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('candidate_documents')
    .insert({
      candidate_name: doc.candidateName,
      ca_id: doc.caId ?? null,
      ca_name: doc.caName ?? null,
      document_type: doc.documentType,
      document_data: doc.documentData,
      photo_url: doc.photoUrl ?? null,
    })
    .select('id')
    .single();
  if (error || !data) return null;
  return data.id as string;
}

export async function updateDocument(
  id: string,
  doc: Partial<Omit<CandidateDocument, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('candidate_documents')
    .update({
      ...(doc.candidateName !== undefined && { candidate_name: doc.candidateName }),
      ...(doc.caId !== undefined && { ca_id: doc.caId }),
      ...(doc.caName !== undefined && { ca_name: doc.caName }),
      ...(doc.documentType !== undefined && { document_type: doc.documentType }),
      ...(doc.documentData !== undefined && { document_data: doc.documentData }),
      ...(doc.photoUrl !== undefined && { photo_url: doc.photoUrl }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  return !error;
}

export async function deleteDocument(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('candidate_documents')
    .delete()
    .eq('id', id);
  return !error;
}

export async function uploadDocumentPhoto(
  dataUrl: string,
  filename: string
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const mimeMatch = dataUrl.match(/^data:(image\/\w+);/);
    const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const { data, error } = await supabase
      .storage
      .from('documents')
      .upload(`photos/${filename}`, buffer, { contentType, upsert: true });
    if (error || !data) return null;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function fetchManagerComments(feedbackId: string): Promise<ManagerComment[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('manager_comments')
    .select('*')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    feedbackId: row.feedback_id as string,
    comment: row.comment as string,
    createdAt: row.created_at as string,
  }));
}
