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

// ── Candidates ────────────────────────────────────────────────────────────────

export interface TargetCompany {
  id: string;
  name: string;
  companyId?: string;
  industry?: string;
  jobType?: string;
  minIncome?: number;
  maxIncome?: number;
  // ── Step1 追加フィールド ──
  media?: string;     // 媒体
  minSales?: number;  // ミニマム売上（CA売上）
  maxSales?: number;  // マックス売上（CA売上）
  status: 'considering' | 'entered' | 'interviewing' | 'offered' | 'declined' | 'rejected';
  recommendation?: string;
  createdAt: string;
}

export interface Candidate {
  id: string;
  caId: string;
  caName?: string;
  name: string;
  age?: number;
  prefecture?: string;
  gender?: string;
  education?: string;
  currentIncome?: number;
  desiredIncome?: number;
  desiredJobs?: string[];
  targetCompanies?: TargetCompany[];
  reading: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  phase: string;
  currentCompany?: string;
  desiredJob?: string;
  minOffer?: number;
  maxOffer?: number;
  nextAction?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export function mapDbCandidateToApp(row: Record<string, unknown>): Candidate {
  return {
    id: row.id as string,
    caId: row.ca_id as string,
    caName: row.ca_name as string | undefined,
    name: row.name as string,
    age: row.age as number | undefined,
    prefecture: row.prefecture as string | undefined,
    gender: row.gender as string | undefined,
    education: row.education as string | undefined,
    currentIncome: row.current_income as number | undefined,
    desiredIncome: row.desired_income as number | undefined,
    desiredJobs: (row.desired_jobs as string[] | null) ?? undefined,
    targetCompanies: (row.target_companies as TargetCompany[] | null) ?? [],
    reading: row.reading as Candidate['reading'],
    phase: row.phase as string,
    currentCompany: row.current_company as string | undefined,
    desiredJob: row.desired_job as string | undefined,
    minOffer: row.min_offer as number | undefined,
    maxOffer: row.max_offer as number | undefined,
    nextAction: row.next_action as string | undefined,
    memo: row.memo as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchCandidates(caId: string): Promise<Candidate[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('ca_id', caId)
    .order('reading', { ascending: true });
  if (error || !data) return [];
  return data.map(mapDbCandidateToApp);
}

export async function fetchCandidateById(id: string): Promise<Candidate | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('fetchCandidateById error:', error.message, '| code:', error.code, '| id:', id);
    return null;
  }
  if (!data) return null;
  return mapDbCandidateToApp(data);
}

export async function addCandidate(
  candidate: Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Candidate | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      ca_id: candidate.caId,
      ca_name: candidate.caName ?? null,
      name: candidate.name,
      age: candidate.age ?? null,
      prefecture: candidate.prefecture ?? null,
      gender: candidate.gender ?? null,
      education: candidate.education ?? null,
      current_income: candidate.currentIncome ?? null,
      desired_income: candidate.desiredIncome ?? null,
      desired_jobs: candidate.desiredJobs ?? null,
      target_companies: candidate.targetCompanies ?? [],
      reading: candidate.reading,
      phase: candidate.phase,
      current_company: candidate.currentCompany ?? null,
      desired_job: candidate.desiredJob ?? null,
      min_offer: candidate.minOffer ?? null,
      max_offer: candidate.maxOffer ?? null,
      next_action: candidate.nextAction ?? null,
      memo: candidate.memo ?? null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return mapDbCandidateToApp(data);
}

export async function updateCandidate(
  id: string,
  updates: Partial<Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.age !== undefined) patch.age = updates.age;
  if (updates.prefecture !== undefined) patch.prefecture = updates.prefecture;
  if (updates.gender !== undefined) patch.gender = updates.gender;
  if (updates.education !== undefined) patch.education = updates.education;
  if (updates.currentIncome !== undefined) patch.current_income = updates.currentIncome;
  if (updates.desiredIncome !== undefined) patch.desired_income = updates.desiredIncome;
  if (updates.desiredJobs !== undefined) patch.desired_jobs = updates.desiredJobs;
  if (updates.targetCompanies !== undefined) patch.target_companies = updates.targetCompanies;
  if (updates.reading !== undefined) patch.reading = updates.reading;
  if (updates.phase !== undefined) patch.phase = updates.phase;
  if (updates.currentCompany !== undefined) patch.current_company = updates.currentCompany;
  if (updates.desiredJob !== undefined) patch.desired_job = updates.desiredJob;
  if (updates.minOffer !== undefined) patch.min_offer = updates.minOffer;
  if (updates.maxOffer !== undefined) patch.max_offer = updates.maxOffer;
  if (updates.nextAction !== undefined) patch.next_action = updates.nextAction;
  if (updates.memo !== undefined) patch.memo = updates.memo;
  const { error } = await supabase.from('candidates').update(patch).eq('id', id);
  return !error;
}

export async function deleteCandidate(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase.from('candidates').delete().eq('id', id);
  return !error;
}

export async function fetchFeedbackSessionsByCandidateName(name: string): Promise<FeedbackSession[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('feedback_sessions')
    .select('*, staffs(name)')
    .eq('candidate_name', name)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDbSessionToApp);
}

export async function fetchFeedbackSessionsByCandidateId(candidateId: string): Promise<FeedbackSession[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('feedback_sessions')
    .select('*, staffs(name)')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDbSessionToApp);
}

// ── Entry Requests ────────────────────────────────────────────────────────────

export interface EntryRequest {
  id: string;
  caId: string;
  caName?: string;
  candidateId?: string;
  candidateName: string;
  companyName: string;
  companyId?: string;
  media?: string[];
  resumeUrl?: string;
  careerUrl?: string;
  recommendation?: string;
  interviewDates?: string[];
  status: 'pending' | 'entered' | 'adjusting' | 'confirmed' | 'done' | 'stopped';
  // ── Step2 追加フィールド ──
  jobType?: string;   // 職種
  minSales?: number;  // ミニマム売上（CA売上）
  maxSales?: number;  // マックス売上（CA売上）
  createdAt: string;
  updatedAt: string;
}

function mapDbEntryToApp(row: Record<string, unknown>): EntryRequest {
  return {
    id: row.id as string,
    caId: row.ca_id as string,
    caName: row.ca_name as string | undefined,
    candidateId: row.candidate_id as string | undefined,
    candidateName: row.candidate_name as string,
    companyName: row.company_name as string,
    companyId: row.company_id as string | undefined,
    media: row.media as string[] | undefined,
    resumeUrl: row.resume_url as string | undefined,
    careerUrl: row.career_url as string | undefined,
    recommendation: row.recommendation as string | undefined,
    interviewDates: row.interview_dates as string[] | undefined,
    status: (row.status as EntryRequest['status']) ?? 'pending',
    // Step2 追加フィールド
    jobType: row.job_type as string | undefined,
    minSales: row.min_sales as number | undefined,
    maxSales: row.max_sales as number | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchEntryRequests(caId?: string): Promise<EntryRequest[]> {
  if (!isSupabaseConfigured()) return [];
  let query = supabase
    .from('entry_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (caId) query = (query as typeof query).eq('ca_id', caId);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapDbEntryToApp);
}

export async function addEntryRequest(
  entry: Omit<EntryRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('entry_requests')
    .insert({
      ca_id: entry.caId,
      ca_name: entry.caName ?? null,
      candidate_id: entry.candidateId ?? null,
      candidate_name: entry.candidateName,
      company_name: entry.companyName,
      company_id: entry.companyId ?? null,
      media: entry.media ?? [],
      resume_url: entry.resumeUrl ?? null,
      career_url: entry.careerUrl ?? null,
      recommendation: entry.recommendation ?? null,
      interview_dates: entry.interviewDates ?? [],
      status: entry.status ?? 'pending',
      // Step2 追加フィールド
      job_type: entry.jobType ?? null,
      min_sales: entry.minSales ?? null,
      max_sales: entry.maxSales ?? null,
    })
    .select('id')
    .single();
  if (error || !data) return null;
  return data.id as string;
}

export async function updateEntryStatus(
  id: string,
  status: EntryRequest['status']
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('entry_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

// ── All Candidates (for CA management summary) ────────────────────────────────

export async function fetchAllCandidates(): Promise<Candidate[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('reading', { ascending: true });
  if (error || !data) return [];
  return data.map(mapDbCandidateToApp);
}

// ── Daily Reports ─────────────────────────────────────────────────────────────

export interface DailyReport {
  id: string;
  caId: string;
  caName?: string;
  reportDate: string;
  newInterviews: number;
  offersMade: number;
  entriesMade: number;
  revenueConfirmed: number;
  memo?: string;
  createdAt: string;
}

function mapDbDailyReportToApp(row: Record<string, unknown>): DailyReport {
  return {
    id: row.id as string,
    caId: row.ca_id as string,
    caName: row.ca_name as string | undefined,
    reportDate: row.report_date as string,
    newInterviews: (row.new_interviews as number) ?? 0,
    offersMade: (row.offers_made as number) ?? 0,
    entriesMade: (row.entries_made as number) ?? 0,
    revenueConfirmed: (row.revenue_confirmed as number) ?? 0,
    memo: row.memo as string | undefined,
    createdAt: row.created_at as string,
  };
}

export async function fetchDailyReports(caId: string): Promise<DailyReport[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('ca_id', caId)
    .order('report_date', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDbDailyReportToApp);
}

export async function addDailyReport(
  report: Omit<DailyReport, 'id' | 'createdAt'>
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('daily_reports')
    .insert({
      ca_id: report.caId,
      ca_name: report.caName ?? null,
      report_date: report.reportDate,
      new_interviews: report.newInterviews,
      offers_made: report.offersMade,
      entries_made: report.entriesMade,
      revenue_confirmed: report.revenueConfirmed,
      memo: report.memo ?? null,
    })
    .select('id')
    .single();
  if (error || !data) return null;
  return data.id as string;
}

// ── Monthly Forecasts ─────────────────────────────────────────────────────────

export interface MonthlyForecast {
  id: string;
  caId: string;
  caName?: string;
  year: number;
  month: number;
  forecastMin: number;
  forecastMax: number;
  actualRevenue: number;
  memo?: string;
  updatedAt: string;
}

function mapDbForecastToApp(row: Record<string, unknown>): MonthlyForecast {
  return {
    id: row.id as string,
    caId: row.ca_id as string,
    caName: row.ca_name as string | undefined,
    year: row.year as number,
    month: row.month as number,
    forecastMin: (row.forecast_min as number) ?? 0,
    forecastMax: (row.forecast_max as number) ?? 0,
    actualRevenue: (row.actual_revenue as number) ?? 0,
    memo: row.memo as string | undefined,
    updatedAt: row.updated_at as string,
  };
}

export async function fetchMonthlyForecast(
  caId: string, year: number, month: number
): Promise<MonthlyForecast | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('monthly_forecasts')
    .select('*')
    .eq('ca_id', caId)
    .eq('year', year)
    .eq('month', month)
    .single();
  if (error || !data) return null;
  return mapDbForecastToApp(data);
}

export async function upsertMonthlyForecast(
  forecast: Omit<MonthlyForecast, 'id' | 'updatedAt'>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const { error } = await supabase
    .from('monthly_forecasts')
    .upsert({
      ca_id: forecast.caId,
      ca_name: forecast.caName ?? null,
      year: forecast.year,
      month: forecast.month,
      forecast_min: forecast.forecastMin,
      forecast_max: forecast.forecastMax,
      actual_revenue: forecast.actualRevenue,
      memo: forecast.memo ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'ca_id,year,month' });
  return !error;
}

export async function fetchEntryRequestsByCandidateId(candidateId: string): Promise<EntryRequest[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('entry_requests')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapDbEntryToApp);
}

export async function fetchAllMonthlyForecasts(
  year: number, month: number
): Promise<MonthlyForecast[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('monthly_forecasts')
    .select('*')
    .eq('year', year)
    .eq('month', month);
  if (error || !data) return [];
  return data.map(mapDbForecastToApp);
}
