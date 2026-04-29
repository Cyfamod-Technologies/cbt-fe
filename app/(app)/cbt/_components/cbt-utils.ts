import type { Assessment, AssessmentAttempt } from "@/lib/cbt";

type AssessmentDisplay = Pick<Assessment, "department" | "level" | "course">;

export function statusBadgeClass(status?: string) {
  if (status === "published" || status === "submitted" || status === "pass") {
    return "badge badge-success";
  }
  if (status === "closed" || status === "fail") {
    return "badge badge-danger";
  }
  return "badge badge-warning";
}

export function assessmentSubject(assessment: AssessmentDisplay) {
  return assessment.course?.title || assessment.course?.name || assessment.department?.name || "General";
}

export function assessmentClass(assessment: AssessmentDisplay) {
  return [assessment.department?.name, assessment.level?.name].filter(Boolean).join(" / ") || "All students";
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function formatResultScore(attempt: AssessmentAttempt) {
  if (attempt.status !== "submitted") {
    return "In progress";
  }

  const percentage = attempt.percentage === null || attempt.percentage === undefined ? null : Number(attempt.percentage);
  if (percentage !== null && Number.isFinite(percentage)) {
    return `${Number(attempt.score ?? 0)} / ${Number(attempt.total_marks ?? 0)} (${percentage.toFixed(1)}%)`;
  }

  return `${Number(attempt.score ?? 0)} / ${Number(attempt.total_marks ?? 0)}`;
}
