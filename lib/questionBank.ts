import { apiFetch } from "@/lib/apiClient";

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T };

export interface QuestionBankItemOption {
  id: number;
  option_text: string;
  sort_order: number;
  is_correct?: boolean;
}

export interface QuestionBankItem {
  id: number;
  course_id: number | null;
  question_text: string;
  question_type: "multiple_choice" | "multiple_select" | "true_false" | "short_answer";
  marks: string | number;
  sort_order: number;
  correct_answer?: string | null;
  explanation?: string | null;
  options: QuestionBankItemOption[];
  course?: { id: number; code?: string; title?: string } | null;
}

export interface SaveBankItemPayload {
  course_id?: number | null;
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

export function listQuestionBankItems(courseId?: number | null) {
  const query = courseId ? `?course_id=${encodeURIComponent(String(courseId))}` : "";
  return apiFetch<CollectionResponse<QuestionBankItem>>(`/api/v1/question-bank${query}`).then((r) => r.data);
}

export function createQuestionBankItem(payload: SaveBankItemPayload) {
  return apiFetch<ItemResponse<QuestionBankItem>>("/api/v1/question-bank", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((r) => r.data);
}

export function updateQuestionBankItem(id: number, payload: SaveBankItemPayload) {
  return apiFetch<ItemResponse<QuestionBankItem>>(`/api/v1/question-bank/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }).then((r) => r.data);
}

export function deleteQuestionBankItem(id: number) {
  return apiFetch(`/api/v1/question-bank/${id}`, { method: "DELETE" });
}

export function importFromBank(assessmentId: number, ids: number[]) {
  return apiFetch<{ data: unknown[] }>(`/api/v1/assessments/${assessmentId}/questions/import-from-bank`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  }).then((r) => r.data);
}
