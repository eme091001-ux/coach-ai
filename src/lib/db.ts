import { supabase, isSupabaseConfigured } from './supabase';
import { MOCK_SESSIONS, MOCK_STAFF } from './mockData';
import { FeedbackSession, Staff, MeetingType, FeedbackStatus, ManagerComment } from '@/types';

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
