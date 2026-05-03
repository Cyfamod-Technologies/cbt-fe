"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSchoolSettings,
  listCourses,
  listDepartments,
  listLevels,
  type Course,
  type Department,
  type Level,
  type SchoolSettings,
} from "@/lib/academic";
import { createAssessment, getAssessment, updateAssessment, type Assessment, type CreateAssessmentPayload } from "@/lib/cbt";
import { useAuth } from "@/contexts/AuthContext";

interface QuizFormProps {
  assessmentId?: number;
}

const ASSESSMENT_TYPES = ["MOCK", "TEST", "EXAM"] as const;
type AssessmentType = typeof ASSESSMENT_TYPES[number];

const defaultForm = {
  assessment_type: "TEST" as AssessmentType,
  description: "",
  department_id: "",
  level_id: "",
  course_id: "",
  duration_minutes: "60",
  pass_mark: "0",
  start_time: "",
  end_time: "",
  show_answers: true,
  show_score: true,
  shuffle_questions: false,
  shuffle_options: false,
  allow_review: true,
  allow_multiple_attempts: false,
  max_attempts: "1",
  status: "draft" as "draft" | "published",
};

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractTypeFromCode(code: string): AssessmentType {
  const parts = code.split("-");
  const last = parts[parts.length - 1]?.toUpperCase();
  return (ASSESSMENT_TYPES as readonly string[]).includes(last ?? "") ? (last as AssessmentType) : "TEST";
}

export function QuizForm({ assessmentId }: QuizFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const editing = Boolean(assessmentId);
  const isStaff = user?.role === "staff";

  const [form, setForm] = useState(defaultForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [departmentData, levelData, courseData, settingsData, assessment] = await Promise.all([
          listDepartments(),
          listLevels(),
          listCourses(),
          getSchoolSettings(),
          assessmentId ? getAssessment(assessmentId) : Promise.resolve(null as Assessment | null),
        ]);

        setDepartments(departmentData);
        setLevels(levelData);
        setCourses(courseData);
        setSettings(settingsData);

        // For staff creating a new assessment, pre-select their department
        if (!assessment && user?.role === "staff" && user.department_id) {
          setForm((f) => ({ ...f, department_id: String(user.department_id) }));
        }

        if (assessment) {
          setForm({
            assessment_type: extractTypeFromCode(assessment.code || assessment.title || ""),
            description: assessment.description || "",
            department_id: String(assessment.department_id || ""),
            level_id: assessment.level_id ? String(assessment.level_id) : "",
            course_id: assessment.course_id ? String(assessment.course_id) : "",
            duration_minutes: String(assessment.duration_minutes || 60),
            pass_mark: String(assessment.pass_mark ?? 0),
            start_time: toLocalInput(assessment.start_time),
            end_time: toLocalInput(assessment.end_time),
            show_answers: assessment.show_answers ?? true,
            show_score: assessment.show_score ?? true,
            shuffle_questions: assessment.shuffle_questions ?? false,
            shuffle_options: assessment.shuffle_options ?? false,
            allow_review: assessment.allow_review ?? true,
            allow_multiple_attempts: assessment.allow_multiple_attempts ?? false,
            max_attempts: String(assessment.max_attempts || 1),
            status: (assessment.status === "published" ? "published" : "draft") as "draft" | "published",
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load form.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assessmentId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => String(c.id) === form.course_id) ?? null,
    [courses, form.course_id],
  );

  const autoCode = selectedCourse
    ? `${selectedCourse.code}-${form.assessment_type}`
    : `ASMT-${form.assessment_type}`;
  const autoTitle = autoCode;

  const visibleDepartments = useMemo(() => {
    if (isStaff && user?.department_id) {
      return departments.filter((d) => d.id === user.department_id);
    }
    return departments;
  }, [departments, isStaff, user?.department_id]);

  const availableLevels = useMemo(() => {
    if (!form.department_id) return levels;
    const dept = departments.find((d) => String(d.id) === form.department_id);
    return dept?.levels ?? levels;
  }, [departments, levels, form.department_id]);

  const availableCourses = useMemo(() => {
    return courses.filter((c) => {
      if (form.department_id && c.department_id !== Number(form.department_id)) return false;
      if (form.level_id && c.level_id != null && c.level_id !== Number(form.level_id)) return false;
      return true;
    });
  }, [courses, form.department_id, form.level_id]);

  const isTestOrExam = form.assessment_type === "TEST" || form.assessment_type === "EXAM";

  const update = <K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === "assessment_type" && (value === "TEST" || value === "EXAM")) {
        next.show_answers = false;
        next.show_score = false;
        next.allow_review = false;
      }
      return next;
    });
  };

  const handleDeptChange = (value: string) => {
    setForm((f) => ({ ...f, department_id: value, level_id: "", course_id: "", description: "" }));
  };

  const handleCourseChange = (value: string) => {
    const c = courses.find((x) => String(x.id) === value);
    setForm((f) => ({ ...f, course_id: value, description: c?.title ?? f.description }));
  };

  const buildPayload = (): CreateAssessmentPayload => ({
    code: autoCode,
    title: autoTitle,
    description: form.description.trim(),
    session_id: settings?.current_session_id ?? 0,
    semester_id: settings?.current_semester_id ?? 0,
    department_id: Number(form.department_id),
    level_id: form.level_id ? Number(form.level_id) : null,
    course_id: form.course_id ? Number(form.course_id) : null,
    duration_minutes: Number(form.duration_minutes),
    pass_mark: Number(form.pass_mark),
    start_time: fromLocalInput(form.start_time),
    end_time: fromLocalInput(form.end_time),
    show_answers: form.show_answers,
    show_score: form.show_score,
    shuffle_questions: form.shuffle_questions,
    shuffle_options: form.shuffle_options,
    allow_review: form.allow_review,
    allow_multiple_attempts: form.allow_multiple_attempts,
    max_attempts: form.allow_multiple_attempts ? Number(form.max_attempts || 1) : 1,
    status: form.status,
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings?.current_session_id || !settings?.current_semester_id) {
      setError("Current session and semester must be set in school settings before creating an assessment.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = assessmentId
        ? await updateAssessment(assessmentId, buildPayload())
        : await createAssessment(buildPayload());
      router.push(`/cbt/admin/${saved.id}/questions/bank`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save assessment.");
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{editing ? "Edit Assessment" : "Create Assessment"}</h3>
        <ul>
          <li><Link href="/cbt/admin">Assessment Management</Link></li>
          <li>{editing ? "Edit" : "Create"}</li>
        </ul>
      </div>

      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {!settings?.current_session_id && !loading && (
            <div className="alert alert-warning">No current session set. Configure school settings first.</div>
          )}
          {!settings?.current_semester_id && !loading && (
            <div className="alert alert-warning">No current semester set. Configure school settings first.</div>
          )}
          {loading ? (
            <div>Loading form...</div>
          ) : (
            <form onSubmit={submit}>
              <div className="row gutters-8">
                {/* Row 1: Department → Level → Course → Assessment Type */}
                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Department *</label>
                  <select
                    className="form-control"
                    value={form.department_id}
                    onChange={(e) => handleDeptChange(e.target.value)}
                    required
                    disabled={isStaff && visibleDepartments.length === 1}
                  >
                    <option value="">Select department</option>
                    {visibleDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Level</label>
                  <select
                    className="form-control"
                    value={form.level_id}
                    onChange={(e) => setForm((f) => ({ ...f, level_id: e.target.value, course_id: "" }))}
                    disabled={availableLevels.length === 0}
                  >
                    <option value="">All levels</option>
                    {availableLevels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Course</label>
                  <select
                    className="form-control"
                    value={form.course_id}
                    onChange={(e) => handleCourseChange(e.target.value)}
                  >
                    <option value="">No course</option>
                    {availableCourses.map((c) => (
                      <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                    ))}
                  </select>
                </div>

                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Assessment Type *</label>
                  <select
                    className="form-control"
                    value={form.assessment_type}
                    onChange={(e) => update("assessment_type", e.target.value as AssessmentType)}
                    required
                  >
                    {ASSESSMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Auto-generated title preview */}
                <div className="col-12 form-group">
                  <label>
                    Assessment Title <span className="text-muted small">(auto-generated)</span>
                  </label>
                  <input
                    className="form-control bg-light"
                    value={autoTitle}
                    readOnly
                    style={{ fontWeight: 600, color: "#374151" }}
                  />
                </div>

                {/* Description — auto-fills with course title */}
                <div className="col-12 form-group">
                  <label>Description</label>
                  <input
                    className="form-control"
                    value={form.description}
                    placeholder="Auto-filled from course title"
                    onChange={(e) => update("description", e.target.value)}
                  />
                </div>

                {/* Duration + Pass Mark + Status */}
                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Duration (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    className="form-control"
                    value={form.duration_minutes}
                    onChange={(e) => update("duration_minutes", e.target.value)}
                  />
                </div>

                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Pass Mark</label>
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={form.pass_mark}
                    onChange={(e) => update("pass_mark", e.target.value)}
                  />
                </div>

                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
                    value={form.status}
                    onChange={(e) => update("status", e.target.value as "draft" | "published")}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div className="col-lg-3 col-md-6 col-12 form-group d-flex align-items-end">
                  <div className="text-muted small">
                    <strong>Session:</strong> {settings?.current_session?.name ?? "—"}<br />
                    <strong>Semester:</strong> {settings?.current_semester?.name ?? "—"}
                  </div>
                </div>

                {/* Optional: start/end time */}
                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>Start Time <span className="text-muted small">(optional)</span></label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={form.start_time}
                    onChange={(e) => update("start_time", e.target.value)}
                  />
                </div>

                <div className="col-lg-3 col-md-6 col-12 form-group">
                  <label>End Time <span className="text-muted small">(optional)</span></label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={form.end_time}
                    onChange={(e) => update("end_time", e.target.value)}
                  />
                </div>

                {form.allow_multiple_attempts && (
                  <div className="col-lg-3 col-md-6 col-12 form-group">
                    <label>Max Attempts</label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      value={form.max_attempts}
                      onChange={(e) => update("max_attempts", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="cbt-switch-grid">
                {([
                  ["show_answers", "Show answers after submission"],
                  ["show_score", "Show score after submission"],
                  ["shuffle_questions", "Shuffle questions"],
                  ["shuffle_options", "Shuffle options"],
                  ["allow_review", "Allow review after submission"],
                  ["allow_multiple_attempts", "Allow multiple attempts"],
                ] as [keyof typeof defaultForm, string][])
                  .filter(([key]) => {
                    if (isTestOrExam && (key === "show_answers" || key === "show_score" || key === "allow_review")) return false;
                    return true;
                  })
                  .map(([key, label]) => (
                    <label className="cbt-switch" key={key}>
                      <input
                        type="checkbox"
                        checked={Boolean(form[key])}
                        onChange={(e) => update(key, e.target.checked as never)}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
              </div>

              <div className="cbt-actions mg-t-20">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={saving || !settings?.current_session_id || !settings?.current_semester_id}
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create & Add Questions"}
                </button>
                <Link href="/cbt/admin" className="btn-fill-lg bg-blue-dark btn-hover-yellow">Cancel</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
