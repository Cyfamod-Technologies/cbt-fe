"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pagination } from "@/app/_components/Pagination";

const PAGE_SIZE = 15;
import { useRouter } from "next/navigation";
import { listCourses, listDepartments, listLevels, listSemesters, listSessions, type Course, type Department, type Level, type AcademicSession, type Semester } from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";
import {
  closeAssessment,
  createAssessment,
  listAssessmentAttempts,
  listAssessments,
  listAvailableAssessments,
  publishAssessment,
  startAssessmentAttempt,
  type Assessment,
  type AssessmentAttempt,
  type CreateAssessmentPayload,
} from "@/lib/cbt";

type CbtView = "assessments" | "admin" | "results" | "history";

interface CbtWorkspaceProps {
  view: CbtView;
}

const viewLabels: Record<CbtView, string> = {
  assessments: "Assessments",
  admin: "Assessment Admin",
  results: "Results",
  history: "History",
};

const tabs = [
  { label: "Assessments", href: "/cbt", view: "assessments" },
  { label: "Admin", href: "/cbt/admin", view: "admin" },
  { label: "Results", href: "/cbt/results", view: "results" },
  { label: "History", href: "/cbt/history", view: "history" },
] as const;

const initialForm = {
  code: "",
  title: "",
  description: "",
  session_id: "",
  semester_id: "",
  department_id: "",
  level_id: "",
  course_id: "",
  duration_minutes: "60",
  pass_mark: "0",
  status: "draft",
};

function statusBadge(status?: string) {
  if (status === "published" || status === "submitted") {
    return "badge-success";
  }
  if (status === "closed") {
    return "badge-danger";
  }
  return "badge-warning";
}

function courseLabel(assessment: Assessment) {
  if (assessment.course?.code || assessment.course?.title || assessment.course?.name) {
    return [assessment.course.code, assessment.course.title || assessment.course.name].filter(Boolean).join(" - ");
  }

  return assessment.department?.name || "General";
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatScore(attempt: AssessmentAttempt) {
  if (attempt.status !== "submitted") {
    return "In progress";
  }

  const score = attempt.score ?? 0;
  const total = attempt.total_marks ?? 0;
  const percentage = attempt.percentage === null || attempt.percentage === undefined ? null : Number(attempt.percentage).toFixed(1);
  return percentage ? `${score}/${total} (${percentage}%)` : `${score}/${total}`;
}

export function CbtWorkspace({ view }: CbtWorkspaceProps) {
  const router = useRouter();
  const { user, hasCapability } = useAuth();
  const canManage = hasCapability("manage_assessments");
  const isStudent = hasCapability("take_exams");
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleTabs = useMemo(
    () => tabs.filter((tab) => canManage || tab.view === "assessments" || tab.view === "history"),
    [canManage],
  );

  const loadData = async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (view === "admin") {
        if (!canManage) {
          setAssessments([]);
          setError("You do not have permission to manage assessments.");
          return;
        }

        const [assessmentData, sessionData, semesterData, departmentData, levelData, courseData] = await Promise.all([
          listAssessments(),
          listSessions(),
          listSemesters(),
          listDepartments(),
          listLevels(),
          listCourses(),
        ]);

        setAssessments(assessmentData);
        setSessions(sessionData);
        setSemesters(semesterData);
        setDepartments(departmentData);
        setLevels(levelData);
        setCourses(courseData);
        return;
      }

      if (view === "results" || view === "history") {
        setAttempts(await listAssessmentAttempts());
        return;
      }

      setAssessments(canManage ? await listAssessments() : await listAvailableAssessments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CBT data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user, view, canManage]);

  const [assessmentsPage, setAssessmentsPage] = useState(1);
  const [attemptsPage, setAttemptsPage] = useState(1);

  useEffect(() => { setAssessmentsPage(1); }, [assessments.length]);
  useEffect(() => { setAttemptsPage(1); }, [attempts.length]);

  const paginatedAssessments = assessments.slice((assessmentsPage - 1) * PAGE_SIZE, assessmentsPage * PAGE_SIZE);
  const paginatedAttempts = attempts.slice((attemptsPage - 1) * PAGE_SIZE, attemptsPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const published = assessments.filter((assessment) => assessment.status === "published").length;
    const draft = assessments.filter((assessment) => assessment.status === "draft").length;
    const submitted = attempts.filter((attempt) => attempt.status === "submitted").length;
    return { published, draft, submitted };
  }, [assessments, attempts]);

  const createPayload = (): CreateAssessmentPayload => ({
    code: form.code.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    session_id: Number(form.session_id),
    semester_id: Number(form.semester_id),
    department_id: Number(form.department_id),
    level_id: form.level_id ? Number(form.level_id) : null,
    course_id: form.course_id ? Number(form.course_id) : null,
    duration_minutes: Number(form.duration_minutes || 0),
    pass_mark: Number(form.pass_mark || 0),
    status: form.status as "draft" | "published",
  });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await createAssessment(createPayload());
      setForm(initialForm);
      setMessage("Assessment created.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assessment.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (assessment: Assessment, action: "publish" | "close") => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (action === "publish") {
        await publishAssessment(assessment.id);
        setMessage("Assessment published.");
      } else {
        await closeAssessment(assessment.id);
        setMessage("Assessment closed.");
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update assessment.");
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (assessment: Assessment) => {
    setSaving(true);
    setError(null);

    try {
      await startAssessmentAttempt(assessment.id);
      router.push(`/cbt/${assessment.id}/take`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start assessment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{viewLabels[view]}</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>CBT</li>
          <li>{viewLabels[view]}</li>
        </ul>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="cbt-tabs">
            {visibleTabs.map((tab) => (
              <Link key={tab.href} href={tab.href} className={`cbt-tab ${tab.view === view ? "active" : ""}`}>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {message && <div className="alert alert-secondary">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {view === "admin" && canManage && (
        <div className="row">
          <div className="col-lg-4 col-md-6">
            <div className="dashboard-summery-one bg-skyblue">
              <div className="item-title">Published</div>
              <div className="item-number">{stats.published}</div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="dashboard-summery-one bg-yellow">
              <div className="item-title">Drafts</div>
              <div className="item-number">{stats.draft}</div>
            </div>
          </div>
          <div className="col-lg-4 col-md-6">
            <div className="dashboard-summery-one bg-light-green">
              <div className="item-title">Total</div>
              <div className="item-number">{assessments.length}</div>
            </div>
          </div>
        </div>
      )}

      {view === "admin" && canManage && (
        <div className="card">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h3>Create Assessment</h3>
              </div>
            </div>
            <form onSubmit={handleCreate}>
              <div className="row">
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Code</label>
                    <input className="form-control" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Title</label>
                    <input className="form-control" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Session</label>
                    <select className="form-control" value={form.session_id} onChange={(event) => setForm({ ...form, session_id: event.target.value })} required>
                      <option value="">Select session</option>
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Semester</label>
                    <select className="form-control" value={form.semester_id} onChange={(event) => setForm({ ...form, semester_id: event.target.value })} required>
                      <option value="">Select semester</option>
                      {semesters.map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {semester.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Department</label>
                    <select className="form-control" value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value })} required>
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Level</label>
                    <select className="form-control" value={form.level_id} onChange={(event) => setForm({ ...form, level_id: event.target.value })}>
                      <option value="">All levels</option>
                      {levels.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Course</label>
                    <select className="form-control" value={form.course_id} onChange={(event) => setForm({ ...form, course_id: event.target.value })}>
                      <option value="">No course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.code} - {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="form-group">
                    <label>Status</label>
                    <select className="form-control" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Create"}
              </button>
            </form>
          </div>
        </div>
      )}

      {(view === "assessments" || view === "admin") && (
        <div className="card">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h3>{view === "admin" ? "All Assessments" : canManage ? "Assessments" : "Available Assessments"}</h3>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Assessment</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Questions</th>
                    <th>Attempts</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>Loading...</td>
                    </tr>
                  ) : paginatedAssessments.length === 0 ? (
                    <tr>
                      <td colSpan={7}>No assessments found.</td>
                    </tr>
                  ) : (
                    paginatedAssessments.map((assessment) => (
                      <tr key={assessment.id}>
                        <td>
                          <span className="badge badge-info">{assessment.code}</span>
                        </td>
                        <td>
                          <strong>{assessment.title}</strong>
                          <div className="text-muted small">{courseLabel(assessment)}</div>
                        </td>
                        <td>
                          {assessment.department?.name || "-"}
                          <div className="text-muted small">{assessment.level?.name || "All levels"}</div>
                        </td>
                        <td>
                          <span className={`badge ${statusBadge(assessment.status)}`}>{assessment.status}</span>
                        </td>
                        <td>{assessment.questions_count ?? assessment.total_questions ?? 0}</td>
                        <td>{assessment.attempts_count ?? 0}</td>
                        <td>
                          {view === "admin" && canManage ? (
                            <div className="cbt-actions">
                              {assessment.status !== "published" && (
                                <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={() => handleStatusChange(assessment, "publish")}>
                                  Publish
                                </button>
                              )}
                              {assessment.status !== "closed" && (
                                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={() => handleStatusChange(assessment, "close")}>
                                  Close
                                </button>
                              )}
                            </div>
                          ) : isStudent ? (
                            <button type="button" className="btn btn-sm btn-primary" disabled={saving || assessment.status !== "published"} onClick={() => handleStart(assessment)}>
                              Start
                            </button>
                          ) : (
                            <Link className="btn btn-sm btn-outline-secondary" href="/cbt/admin">
                              Manage
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={assessmentsPage}
              totalPages={Math.ceil(assessments.length / PAGE_SIZE)}
              totalItems={assessments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setAssessmentsPage}
            />
          </div>
        </div>
      )}

      {(view === "results" || view === "history") && (
        <div className="card">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h3>{view === "results" ? "Assessment Results" : "Attempt History"}</h3>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    {canManage && <th>Student</th>}
                    <th>Status</th>
                    <th>Score</th>
                    <th>Started</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5}>Loading...</td>
                    </tr>
                  ) : paginatedAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5}>No attempts found.</td>
                    </tr>
                  ) : (
                    paginatedAttempts.map((attempt) => (
                      <tr key={attempt.id}>
                        <td>
                          <strong>{attempt.assessment?.title || `Assessment #${attempt.assessment_id}`}</strong>
                          <div className="text-muted small">{attempt.assessment?.code}</div>
                        </td>
                        {canManage && <td>{attempt.student?.name || `Student #${attempt.student_id}`}</td>}
                        <td>
                          <span className={`badge ${statusBadge(attempt.status)}`}>{attempt.status}</span>
                        </td>
                        <td>{formatScore(attempt)}</td>
                        <td>{formatDate(attempt.start_time)}</td>
                        <td>{formatDate(attempt.end_time)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={attemptsPage}
              totalPages={Math.ceil(attempts.length / PAGE_SIZE)}
              totalItems={attempts.length}
              pageSize={PAGE_SIZE}
              onPageChange={setAttemptsPage}
            />
          </div>
        </div>
      )}
    </>
  );
}
