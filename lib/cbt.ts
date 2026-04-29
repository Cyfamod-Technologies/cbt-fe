import { apiFetch } from "@/lib/apiClient";

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T };

export interface Assessment {
  id: number;
  code: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  total_questions: number | null;
  total_marks: string | number | null;
  pass_mark: string | number | null;
  status: "draft" | "published" | "closed";
  start_time?: string | null;
  end_time?: string | null;
  show_answers?: boolean;
  show_score?: boolean;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  allow_review?: boolean;
  allow_multiple_attempts?: boolean;
  max_attempts?: number | null;
  session_id: number;
  semester_id: number;
  department_id: number;
  level_id: number | null;
  course_id: number | null;
  session?: { id: number; name: string } | null;
  semester?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  level?: { id: number; name: string } | null;
  course?: { id: number; code?: string; title?: string; name?: string } | null;
  questions_count?: number;
  attempts_count?: number;
}

export interface AssessmentQuestionOption {
  id: number;
  option_text: string;
  sort_order: number;
  is_correct?: boolean;
}

export interface AssessmentQuestion {
  id: number;
  question_text: string;
  question_type: "multiple_choice" | "multiple_select" | "true_false" | "short_answer";
  marks: string | number;
  sort_order: number;
  options: AssessmentQuestionOption[];
  correct_answer?: string | null;
  explanation?: string | null;
}

export interface AssessmentAttempt {
  id: number;
  assessment_id: number;
  student_id: number;
  start_time: string | null;
  end_time: string | null;
  score: string | number | null;
  total_marks: string | number | null;
  percentage: string | number | null;
  grade: string | null;
  status: "in_progress" | "submitted" | string;
  student?: { id: number; name: string; matric_no?: string | null } | null;
  assessment?: Pick<Assessment, "id" | "code" | "title" | "duration_minutes"> & {
    department?: { id: number; name: string } | null;
    level?: { id: number; name: string } | null;
    course?: { id: number; code?: string; title?: string; name?: string } | null;
    allow_review?: boolean;
    show_answers?: boolean;
    show_score?: boolean;
    questions?: AssessmentQuestion[];
  };
  answers?: Array<{
    id: number;
    question_id: number;
    option_id: number | null;
    answer_text: string | null;
    is_correct: boolean | null;
    marks_awarded: string | number | null;
  }>;
}

export interface CreateAssessmentPayload {
  code: string;
  title: string;
  description?: string;
  session_id: number;
  semester_id: number;
  department_id: number;
  level_id?: number | null;
  course_id?: number | null;
  duration_minutes?: number;
  pass_mark?: number;
  total_questions?: number;
  total_marks?: number;
  start_time?: string | null;
  end_time?: string | null;
  show_answers?: boolean;
  show_score?: boolean;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  allow_review?: boolean;
  allow_multiple_attempts?: boolean;
  max_attempts?: number | null;
  status?: "draft" | "published";
}

export interface SaveQuestionPayload {
  question_text: string;
  question_type: "multiple_choice" | "multiple_select" | "true_false" | "short_answer";
  marks: number;
  sort_order?: number;
  correct_answer?: string | null;
  explanation?: string | null;
  options?: Array<{
    option_text: string;
    is_correct?: boolean;
    sort_order?: number;
  }>;
}

export interface SubmitAttemptPayload {
  answers: Array<{
    question_id: number;
    option_ids?: number[];
    answer_text?: string;
  }>;
}

export function listAssessments() {
  return apiFetch<CollectionResponse<Assessment>>("/api/v1/assessments").then((response) => response.data);
}

export function listAvailableAssessments() {
  return apiFetch<CollectionResponse<Assessment>>("/api/v1/assessments/available").then((response) => response.data);
}

export function getAssessment(id: number) {
  return apiFetch<ItemResponse<Assessment>>(`/api/v1/assessments/${id}`).then((response) => response.data);
}

export function createAssessment(payload: CreateAssessmentPayload) {
  return apiFetch<ItemResponse<Assessment>>("/api/v1/assessments", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((response) => response.data);
}

export function updateAssessment(id: number, payload: Partial<CreateAssessmentPayload>) {
  return apiFetch<ItemResponse<Assessment>>(`/api/v1/assessments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then((response) => response.data);
}

export function deleteAssessment(id: number) {
  return apiFetch(`/api/v1/assessments/${id}`, { method: "DELETE" });
}

export function publishAssessment(id: number) {
  return apiFetch<ItemResponse<Assessment>>(`/api/v1/assessments/${id}/publish`, {
    method: "PATCH",
  }).then((response) => response.data);
}

export function closeAssessment(id: number) {
  return apiFetch<ItemResponse<Assessment>>(`/api/v1/assessments/${id}/close`, {
    method: "PATCH",
  }).then((response) => response.data);
}

export function listAssessmentQuestions(assessmentId: number) {
  return apiFetch<CollectionResponse<AssessmentQuestion>>(`/api/v1/assessments/${assessmentId}/questions`).then(
    (response) => response.data,
  );
}

export function createAssessmentQuestion(assessmentId: number, payload: SaveQuestionPayload) {
  return apiFetch<ItemResponse<AssessmentQuestion>>(`/api/v1/assessments/${assessmentId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((response) => response.data);
}

export function updateAssessmentQuestion(questionId: number, payload: SaveQuestionPayload) {
  return apiFetch<ItemResponse<AssessmentQuestion>>(`/api/v1/assessment-questions/${questionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then((response) => response.data);
}

export function deleteAssessmentQuestion(questionId: number) {
  return apiFetch(`/api/v1/assessment-questions/${questionId}`, { method: "DELETE" });
}

export function startAssessmentAttempt(assessmentId: number) {
  return apiFetch<ItemResponse<AssessmentAttempt>>(`/api/v1/assessments/${assessmentId}/attempts`, {
    method: "POST",
  }).then((response) => response.data);
}

export function getAssessmentAttempt(attemptId: number) {
  return apiFetch<ItemResponse<AssessmentAttempt>>(`/api/v1/assessment-attempts/${attemptId}`).then(
    (response) => response.data,
  );
}

export function listAssessmentAttempts(assessmentId?: number) {
  const query = assessmentId ? `?assessment_id=${encodeURIComponent(String(assessmentId))}` : "";
  return apiFetch<CollectionResponse<AssessmentAttempt>>(`/api/v1/assessment-attempts${query}`).then(
    (response) => response.data,
  );
}

export function submitAssessmentAttempt(attemptId: number, payload: SubmitAttemptPayload) {
  return apiFetch<ItemResponse<AssessmentAttempt>>(`/api/v1/assessment-attempts/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((response) => response.data);
}
