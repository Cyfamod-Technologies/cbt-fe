"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
  addDepartmentLevel,
  createCourse,
  createDepartment,
  createSemester,
  createSession,
  getSchoolSettings,
  listCourses,
  listDepartments,
  listSemesters,
  listSessions,
  setCurrentSemester,
  setCurrentSession,
  updateCourse,
  updateDepartment,
  updateLevel,
  updateSemester,
  updateSession,
  type AcademicSession,
  type Course,
  type Department,
  type Level,
  type SchoolSettings,
  type Semester,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

export function ManagementShell({
  title,
  current,
  children,
}: {
  title: string;
  current: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{title}</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>Management</li>
          <li>{current}</li>
        </ul>
      </div>
      {children}
    </>
  );
}

export function SessionsManagementPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const canManageCatalog = Boolean(user?.capabilities?.manage_catalog);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSessions(await listSessions());
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load sessions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingId) {
          await updateSession(editingId, { name: name.trim(), status });
        } else {
          await createSession({ name: name.trim(), is_current: sessions.length === 0 });
        }
        setName("");
        setStatus("active");
        setEditingId(null);
      },
      editingId ? "Session updated." : "Session created.",
      load,
      setFeedback,
    );
  };

  const chooseCurrent = async (id: number) => {
    await runAction(
      async () => {
        await setCurrentSession(id);
      },
      "Current session updated.",
      load,
      setFeedback,
    );
  };

  const startEdit = (session: AcademicSession) => {
    setEditingId(session.id);
    setName(session.name);
    setStatus(session.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setStatus("active");
  };

  return (
    <ManagementShell title="Sessions" current="Session">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard title={editingId ? "Edit Session" : "Create Session"} onSubmit={submit} disabled={!canManageCatalog}>
            <label>Session Name</label>
            <input
              className="form-control"
              placeholder="2025/2026"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <label className="mt-3">Status</label>
            <select className="form-control" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="submit" className="btn btn-primary mt-3">
              {editingId ? "Update Session" : "Save Session"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title="All Sessions"
            loading={loading}
            headers={["Name", "Status", "Current", "Action"]}
            rows={sessions.map((session) => [
              session.name,
              session.status,
              session.is_current ? <span className="badge badge-success">Current</span> : "No",
              <div key={`session-actions-${session.id}`} className="cbt-actions">
                <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!canManageCatalog} onClick={() => startEdit(session)}>
                  Edit
                </button>
                {!session.is_current ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!canManageCatalog}
                    onClick={() => chooseCurrent(session.id)}
                  >
                    Set Current
                  </button>
                ) : null}
              </div>,
            ])}
          />
        </div>
      </div>
    </ManagementShell>
  );
}

export function SemestersManagementPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("active");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const canManageCatalog = Boolean(user?.capabilities?.manage_catalog);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionData, semesterData, settingsData] = await Promise.all([
        listSessions(),
        listSemesters(),
        getSchoolSettings(),
      ]);
      setSessions(sessionData);
      setSemesters(semesterData);
      setSettings(settingsData);
      setSessionId((current) => current || String(settingsData.current_session_id || sessionData[0]?.id || ""));
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load semesters."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingId) {
          await updateSemester(editingId, { name: name.trim(), session_id: Number(sessionId), status });
        } else {
          await createSemester({ name: name.trim(), session_id: Number(sessionId) });
        }
        setName("");
        setStatus("active");
        setEditingId(null);
      },
      editingId ? "Semester updated." : "Semester created.",
      load,
      setFeedback,
    );
  };

  const chooseCurrent = async (id: number) => {
    await runAction(
      async () => {
        await setCurrentSemester(id);
      },
      "Current semester updated.",
      load,
      setFeedback,
    );
  };

  const startEdit = (semester: Semester) => {
    setEditingId(semester.id);
    setName(semester.name);
    setSessionId(String(semester.session_id));
    setStatus(semester.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setStatus("active");
    setSessionId(String(settings?.current_session_id || sessions[0]?.id || ""));
  };

  return (
    <ManagementShell title="Semesters" current="Semesters">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard title={editingId ? "Edit Semester" : "Create Semester"} onSubmit={submit} disabled={!canManageCatalog}>
            <label>Session</label>
            <select
              className="form-control"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
              required
            >
              <option value="">Select Session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
            <label className="mt-3">Semester Name</label>
            <input
              className="form-control"
              placeholder="First Semester"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <label className="mt-3">Status</label>
            <select className="form-control" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="submit" className="btn btn-primary mt-3">
              {editingId ? "Update Semester" : "Save Semester"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title="All Semesters"
            loading={loading}
            headers={["Name", "Session", "Status", "Current", "Action"]}
            rows={semesters.map((semester) => {
              const isCurrent = settings?.current_semester_id === semester.id;
              return [
                semester.name,
                semester.session?.name || "",
                semester.status,
                isCurrent ? <span className="badge badge-success">Current</span> : "No",
                <div key={`semester-actions-${semester.id}`} className="cbt-actions">
                  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={!canManageCatalog} onClick={() => startEdit(semester)}>
                    Edit
                  </button>
                  {!isCurrent ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled={!canManageCatalog}
                      onClick={() => chooseCurrent(semester.id)}
                    >
                      Set Current
                    </button>
                  ) : null}
                </div>,
              ];
            })}
          />
        </div>
      </div>
    </ManagementShell>
  );
}

export function DepartmentsManagementPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({ name: "", code: "", status: "active" });
  const [levelForm, setLevelForm] = useState({ departmentId: "", name: "", status: "active" });
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);
  const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const canManageCatalog = Boolean(user?.capabilities?.manage_catalog);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDepartments(await listDepartments());
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load departments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingDepartmentId) {
          await updateDepartment(editingDepartmentId, {
            name: form.name.trim(),
            code: form.code.trim() || null,
            status: form.status,
          });
        } else {
          await createDepartment({
            name: form.name.trim(),
            code: form.code.trim() || undefined,
          });
        }
        setForm({ name: "", code: "", status: "active" });
        setEditingDepartmentId(null);
      },
      editingDepartmentId ? "Department updated." : "Department created.",
      load,
      setFeedback,
    );
  };

  const submitLevel = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingLevelId) {
          await updateLevel(editingLevelId, {
            name: levelForm.name.trim(),
            status: levelForm.status,
          });
        } else {
          await addDepartmentLevel(Number(levelForm.departmentId), { name: levelForm.name.trim() });
        }
        setLevelForm({ departmentId: editingLevelId ? "" : levelForm.departmentId, name: "", status: "active" });
        setEditingLevelId(null);
      },
      editingLevelId ? "Level updated." : "Level added to department.",
      load,
      setFeedback,
    );
  };

  const startEdit = (department: Department) => {
    setEditingDepartmentId(department.id);
    setForm({
      name: department.name,
      code: department.code || "",
      status: department.status,
    });
  };

  const cancelEdit = () => {
    setEditingDepartmentId(null);
    setForm({ name: "", code: "", status: "active" });
  };

  const startLevelEdit = (department: Department, level: Level) => {
    setEditingLevelId(level.id);
    setLevelForm({
      departmentId: String(department.id),
      name: level.name,
      status: level.status,
    });
  };

  const cancelLevelEdit = () => {
    setEditingLevelId(null);
    setLevelForm({ departmentId: "", name: "", status: "active" });
  };

  return (
    <ManagementShell title="Departments" current="Departments">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard title={editingDepartmentId ? "Edit Department" : "Create Department"} onSubmit={submit} disabled={!canManageCatalog}>
            <label>Department Name</label>
            <input
              className="form-control"
              placeholder="Computer Science"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <label className="mt-3">Department Code</label>
            <input
              className="form-control"
              placeholder="CSC"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            />
            <label className="mt-3">Status</label>
            <select
              className="form-control"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="submit" className="btn btn-primary mt-3">
              {editingDepartmentId ? "Update Department" : "Save Department"}
            </button>
            {editingDepartmentId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>

          <FormCard title={editingLevelId ? "Edit Level" : "Add Level to Department"} onSubmit={submitLevel} disabled={!canManageCatalog}>
            <label>Department</label>
            <select
              className="form-control"
              value={levelForm.departmentId}
              onChange={(event) =>
                setLevelForm((current) => ({ ...current, departmentId: event.target.value }))
              }
              disabled={Boolean(editingLevelId)}
              required
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <label className="mt-3">Level Name</label>
            <input
              className="form-control"
              placeholder="ND I"
              value={levelForm.name}
              onChange={(event) => setLevelForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <label className="mt-3">Status</label>
            <select
              className="form-control"
              value={levelForm.status}
              onChange={(event) => setLevelForm((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="submit" className="btn btn-primary mt-3">
              {editingLevelId ? "Update Level" : "Add Level"}
            </button>
            {editingLevelId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelLevelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title="All Departments"
            loading={loading}
            headers={["Name", "Code", "Levels", "Status", "Action"]}
            rows={departments.map((department) => [
              department.name,
              department.code || "",
              <LevelChips
                key="levels"
                department={department}
                canManage={canManageCatalog}
                onEdit={startLevelEdit}
              />,
              department.status,
              <button
                key={`edit-${department.id}`}
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={!canManageCatalog}
                onClick={() => startEdit(department)}
              >
                Edit
              </button>,
            ])}
          />
        </div>
      </div>
    </ManagementShell>
  );
}

export function CoursesManagementPage() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ departmentId: "", code: "", title: "" });
  const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const canManageCatalog = Boolean(user?.capabilities?.manage_catalog);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [departmentData, courseData] = await Promise.all([listDepartments(), listCourses()]);
      setDepartments(departmentData);
      setCourses(courseData);
      setForm((current) => ({
        ...current,
        departmentId: current.departmentId || String(departmentData[0]?.id || ""),
      }));
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load courses."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingCourseId) {
          await updateCourse(editingCourseId, {
            department_id: Number(form.departmentId),
            code: form.code.trim(),
            title: form.title.trim(),
          });
        } else {
          await createCourse({
            department_id: Number(form.departmentId),
            code: form.code.trim(),
            title: form.title.trim(),
          });
        }
        setForm((current) => ({ ...current, code: "", title: "" }));
        setEditingCourseId(null);
      },
      editingCourseId ? "Course updated." : "Course created.",
      load,
      setFeedback,
    );
  };

  const startEdit = (course: Course) => {
    setEditingCourseId(course.id);
    setForm({
      departmentId: String(course.department_id),
      code: course.code,
      title: course.title,
    });
  };

  const cancelEdit = () => {
    setEditingCourseId(null);
    setForm((current) => ({ ...current, code: "", title: "" }));
  };

  return (
    <ManagementShell title="Courses" current="Departments / Courses">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard
            title={editingCourseId ? "Edit Course" : "Create Course"}
            onSubmit={submit}
            disabled={!canManageCatalog}
          >
            <label>Department</label>
            <select
              className="form-control"
              value={form.departmentId}
              onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
              required
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <label className="mt-3">Course Code</label>
            <input
              className="form-control"
              placeholder="GST101"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              required
            />
            <label className="mt-3">Course Title</label>
            <input
              className="form-control"
              placeholder="Use of English"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
            <button type="submit" className="btn btn-primary mt-3">
              {editingCourseId ? "Update Course" : "Save Course"}
            </button>
            {editingCourseId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title="All Courses"
            loading={loading}
            headers={["Code", "Title", "Department", "Status", "Action"]}
            rows={courses.map((course) => [
              course.code,
              course.title,
              course.department?.name || "",
              course.status,
              <button
                key={`edit-${course.id}`}
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={!canManageCatalog}
                onClick={() => startEdit(course)}
              >
                Edit
              </button>,
            ])}
          />
        </div>
      </div>
    </ManagementShell>
  );
}

function LevelChips({
  department,
  canManage,
  onEdit,
}: {
  department: Department;
  canManage: boolean;
  onEdit: (department: Department, level: Level) => void;
}) {
  const levels = department.levels ?? [];

  if (levels.length === 0) {
    return <span className="text-muted">No levels</span>;
  }

  return (
    <div className="department-level-list">
      {levels.map((level) => (
        <span className="department-level-chip" key={level.id}>
          <span>{level.name}</span>
          <button type="button" disabled={!canManage} onClick={() => onEdit(department, level)}>
            Edit
          </button>
        </span>
      ))}
    </div>
  );
}

type Feedback = { type: "success" | "danger"; message: string } | null;
type TableCell = ReactNode;

function FormCard({
  title,
  disabled,
  onSubmit,
  children,
}: {
  title: string;
  disabled: boolean;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <div className="card height-auto">
      <div className="card-body">
        <div className="heading-layout1">
          <div className="item-title">
            <h3>{title}</h3>
          </div>
        </div>
        <form className="new-added-form" onSubmit={onSubmit}>
          <fieldset disabled={disabled}>{children}</fieldset>
        </form>
      </div>
    </div>
  );
}

function TableCard({
  title,
  loading,
  headers,
  rows,
}: {
  title: string;
  loading: boolean;
  headers: string[];
  rows: TableCell[][];
}) {
  return (
    <div className="card height-auto">
      <div className="card-body">
        <div className="heading-layout1">
          <div className="item-title">
            <h3>{title}</h3>
          </div>
        </div>
        {loading ? (
          <div className="text-muted">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackAlert({ feedback }: { feedback: Feedback }) {
  if (!feedback) {
    return null;
  }

  return (
    <div className={`alert alert-${feedback.type}`} role="alert">
      {feedback.message}
    </div>
  );
}

async function runAction(
  action: () => Promise<void>,
  successMessage: string,
  reload: () => Promise<void>,
  setFeedback: (feedback: Feedback) => void,
) {
  try {
    await action();
    setFeedback({ type: "success", message: successMessage });
    await reload();
  } catch (error) {
    setFeedback(toDanger(error, "Action failed."));
  }
}

function toDanger(error: unknown, fallback: string): Exclude<Feedback, null> {
  return {
    type: "danger",
    message: error instanceof Error ? error.message : fallback,
  };
}
