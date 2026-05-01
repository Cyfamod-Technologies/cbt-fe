"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSchoolSettings,
  listCourses,
  listDepartments,
  listSemesters,
  listSessions,
  type AcademicSession,
  type Course,
  type Department,
  type Semester,
} from "@/lib/academic";
import { createAssessment, getAssessment, updateAssessment, type Assessment, type CreateAssessmentPayload } from "@/lib/cbt";

interface QuizFormProps {
  assessmentId?: number;
}

const defaultForm = {
  code: "",
  title: "",
  description: "",
  session_id: "",
  semester_id: "",
  department_id: "",
  level_id: "",
  course_id: "",
  duration_minutes: "30",
  pass_mark: "50",
  start_time: "",
  end_time: "",
  show_answers: true,
  show_score: true,
  shuffle_questions: false,
  shuffle_options: false,
  allow_review: true,
  allow_multiple_attempts: true,
  max_attempts: "1",
};

function toLocalInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function QuizForm({ assessmentId }: QuizFormProps) {
  const router = useRouter();
  const editing = Boolean(assessmentId);
  const [form, setForm] = useState(defaultForm);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentSemesterId, setCurrentSemesterId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [sessionData, semesterData, departmentData, courseData, settings, assessment] = await Promise.all([
          listSessions(),
          listSemesters(),
          listDepartments(),
          listCourses(),
          getSchoolSettings(),
          assessmentId ? getAssessment(assessmentId) : Promise.resolve(null as Assessment | null),
        ]);

        setSessions(sessionData);
        setSemesters(semesterData);
        setDepartments(departmentData);
        setCourses(courseData);
        setCurrentSessionId(settings.current_session_id);
        setCurrentSemesterId(settings.current_semester_id);

        if (assessment) {
          setForm({
            code: assessment.code || "",
            title: assessment.title || "",
            description: assessment.description || "",
            session_id: String(assessment.session_id || ""),
            semester_id: String(assessment.semester_id || ""),
            department_id: String(assessment.department_id || ""),
            level_id: assessment.level_id ? String(assessment.level_id) : "",
            course_id: assessment.course_id ? String(assessment.course_id) : "",
            duration_minutes: String(assessment.duration_minutes || 30),
            pass_mark: String(assessment.pass_mark ?? 50),
            start_time: toLocalInput(assessment.start_time),
            end_time: toLocalInput(assessment.end_time),
            show_answers: assessment.show_answers ?? true,
            show_score: assessment.show_score ?? true,
            shuffle_questions: assessment.shuffle_questions ?? false,
            shuffle_options: assessment.shuffle_options ?? false,
            allow_review: assessment.allow_review ?? true,
            allow_multiple_attempts: assessment.allow_multiple_attempts ?? true,
            max_attempts: String(assessment.max_attempts || 1),
          });
        } else {
          // Auto-select current session and semester for new assessments
          setForm((prev) => ({
            ...prev,
            session_id: settings.current_session_id ? String(settings.current_session_id) : "",
            semester_id: settings.current_semester_id ? String(settings.current_semester_id) : "",
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quiz form.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [assessmentId]);

  const availableLevels = useMemo(() => {
    const dept = departments.find((d) => String(d.id) === form.department_id);
    return dept?.levels ?? [];
  }, [departments, form.department_id]);

  const availableCourses = useMemo(() => {
    return courses.filter((c) => {
      if (form.department_id && c.department_id !== Number(form.department_id)) return false;
      if (form.level_id && c.level_id != null && c.level_id !== Number(form.level_id)) return false;
      return true;
    });
  }, [courses, form.department_id, form.level_id]);

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleDeptChange = (value: string) => {
    setForm((prev) => ({ ...prev, department_id: value, level_id: "", course_id: "" }));
  };

  const handleAllowMultipleAttemptsChange = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      allow_multiple_attempts: checked,
      max_attempts: checked ? prev.max_attempts : "1",
    }));
  };

  const payload = (): CreateAssessmentPayload => ({
    code: form.code.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    session_id: Number(form.session_id),
    semester_id: Number(form.semester_id),
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
  });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const saved = assessmentId ? await updateAssessment(assessmentId, payload()) : await createAssessment({ ...payload(), status: "draft" });
      router.push(`/cbt/admin/${saved.id}/questions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save quiz.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{editing ? "Edit Quiz" : "Create Quiz"}</h3>
        <ul>
          <li>
            <Link href="/cbt/admin">Quiz Management</Link>
          </li>
          <li>{editing ? "Edit" : "Create"}</li>
        </ul>
      </div>

      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? (
            <div>Loading form...</div>
          ) : (
            <form onSubmit={submit}>
              <div className="row">
                <div className="col-lg-6 col-md-6">
                  <div className="form-group">
                    <label>Quiz Title</label>
                    <input className="form-control" value={form.title} onChange={(event) => update("title", event.target.value)} required />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Code</label>
                    <input className="form-control" value={form.code} onChange={(event) => update("code", event.target.value)} required />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Duration</label>
                    <input type="number" min={1} className="form-control" value={form.duration_minutes} onChange={(event) => update("duration_minutes", event.target.value)} />
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-group">
                    <label>Description</label>
                    <textarea className="form-control" rows={3} value={form.description} onChange={(event) => update("description", event.target.value)} />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Session</label>
                    <select className="form-control" value={form.session_id} onChange={(event) => update("session_id", event.target.value)} required>
                      <option value="">Select session</option>
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name}{session.id === currentSessionId ? " (Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Semester</label>
                    <select className="form-control" value={form.semester_id} onChange={(event) => update("semester_id", event.target.value)} required>
                      <option value="">Select semester</option>
                      {semesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {semester.name}{semester.id === currentSemesterId ? " (Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Class / Department</label>
                    <select className="form-control" value={form.department_id} onChange={(event) => handleDeptChange(event.target.value)} required>
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Level</label>
                    <select
                      className="form-control"
                      value={form.level_id}
                      onChange={(event) => setForm((prev) => ({ ...prev, level_id: event.target.value, course_id: "" }))}
                      disabled={!form.department_id || availableLevels.length === 0}
                    >
                      <option value="">
                        {form.department_id && availableLevels.length === 0 ? "No levels in this dept" : "All levels"}
                      </option>
                      {availableLevels.map((level) => (
                        <option key={level.id} value={level.id}>{level.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-6 col-md-6">
                  <div className="form-group">
                    <label>Subject / Course</label>
                    <select className="form-control" value={form.course_id} onChange={(event) => update("course_id", event.target.value)}>
                      <option value="">General</option>
                      {availableCourses.map((course) => (
                        <option key={course.id} value={course.id}>{course.code} - {course.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Pass Mark</label>
                    <input type="number" min={0} className="form-control" value={form.pass_mark} onChange={(event) => update("pass_mark", event.target.value)} />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Max Attempts</label>
                    <input type="number" min={1} className="form-control" value={form.max_attempts} onChange={(event) => update("max_attempts", event.target.value)} disabled={!form.allow_multiple_attempts} />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input type="datetime-local" className="form-control" value={form.start_time} onChange={(event) => update("start_time", event.target.value)} />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>End Time</label>
                    <input type="datetime-local" className="form-control" value={form.end_time} onChange={(event) => update("end_time", event.target.value)} />
                  </div>
                </div>
              </div>

              <div className="cbt-switch-grid">
                {([
                  ["show_answers", "Show answers after submission"],
                  ["show_score", "Show score after submission"],
                  ["shuffle_questions", "Shuffle questions"],
                  ["shuffle_options", "Shuffle options"],
                  ["allow_review", "Allow review"],
                ] as [keyof typeof form, string][]).map(([key, label]) => (
                  <label className="cbt-switch" key={key}>
                    <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => update(key, event.target.checked)} />
                    <span>{label}</span>
                  </label>
                ))}
                <label className="cbt-switch">
                  <input
                    type="checkbox"
                    checked={form.allow_multiple_attempts}
                    onChange={(event) => handleAllowMultipleAttemptsChange(event.target.checked)}
                  />
                  <span>Allow multiple attempts</span>
                </label>
              </div>

              <div className="cbt-actions mg-t-20">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save and Add Questions"}</button>
                <Link href="/cbt/admin" className="btn btn-outline-secondary">Cancel</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
