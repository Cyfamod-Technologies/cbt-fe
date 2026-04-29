"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
  createCourse,
  addDepartmentLevel,
  createDepartment,
  createSemester,
  createSession,
  getSchoolSettings,
  listDepartments,
  listSemesters,
  listSessions,
  listCourses,
  removeDepartmentLevel,
  setCurrentSemester,
  setCurrentSession,
  type AcademicSession,
  type Course,
  type Department,
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
    updateCourse,
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
    const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
      </div>
      {children}
    </>
  );
}

export function SessionsManagementPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [name, setName] = useState("");
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
        setName("");
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

  return (
    <ManagementShell title="Sessions" current="Session">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard title="Create Session" onSubmit={submit} disabled={!canManageCatalog}>
            <label>Session Name</label>
            <input
              className="form-control"
              placeholder="2025/2026"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary mt-3">
              Save Session
            </button>
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title="All Sessions"
            loading={loading}
            headers={["Name", "Status", "Current", "Action"]}
            rows={sessions.map((session) => [
              session.name,
                {editingCourseId ? "Update Course" : "Save Course"}
              session.is_current ? <span className="badge badge-success">Current</span> : "No",
              {editingCourseId ? (
                <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                  Cancel Edit
                </button>
              ) : null}
              session.is_current ? (
                ""
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
              headers={["Code", "Title", "Department", "Status", "Action"]}
                  onClick={() => chooseCurrent(session.id)}
                >
                  Set Current
                </button>
              ),
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

export function SemestersManagementPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState("");
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
        await createSemester({ name: name.trim(), session_id: Number(sessionId) });
        setName("");
      },
      "Semester created.",
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

  return (
    <ManagementShell title="Semesters" current="Semesters">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard title="Create Semester" onSubmit={submit} disabled={!canManageCatalog}>
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
            <label>Semester Name</label>
            <input
              className="form-control"
              placeholder="First Semester"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary mt-3">
              Save Semester
            </button>
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
                isCurrent ? (
                  ""
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    disabled={!canManageCatalog}
                    onClick={() => chooseCurrent(semester.id)}
                  >
                    Set Current
                  </button>
                ),
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
  const [form, setForm] = useState({ name: "", code: "" });
  const [levelForm, setLevelForm] = useState({ departmentId: "", name: "" });
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
        await createDepartment({
          name: form.name.trim(),
          code: form.code.trim() || undefined,
        });
        setForm({ name: "", code: "" });
      },
      "Department created.",
      load,
      setFeedback,
    );
  };

  const submitLevel = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        await addDepartmentLevel(Number(levelForm.departmentId), { name: levelForm.name.trim() });
        setLevelForm({ departmentId: levelForm.departmentId, name: "" });
      },
      "Level added to department.",
      load,
      setFeedback,
    );
  };

  const detachLevel = async (departmentId: number, levelId: number) => {
    await runAction(
      async () => {
        await removeDepartmentLevel(departmentId, levelId);
      },
      "Level removed from department.",
      load,
      setFeedback,
    );
  };

  return (
    <ManagementShell title="Departments" current="Departments">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard title="Create Department" onSubmit={submit} disabled={!canManageCatalog}>
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
            <button type="submit" className="btn btn-primary mt-3">
              Save Department
            </button>
          </FormCard>

          <FormCard title="Add Level to Department" onSubmit={submitLevel} disabled={!canManageCatalog}>
            <label>Department</label>
            <select
              className="form-control"
              value={levelForm.departmentId}
              onChange={(event) =>
                setLevelForm((current) => ({ ...current, departmentId: event.target.value }))
              }
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
            <button type="submit" className="btn btn-primary mt-3">
              Add Level
            </button>
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title="All Departments"
            loading={loading}
            headers={["Name", "Code", "Levels", "Status"]}
            rows={departments.map((department) => [
              department.name,
              department.code || "",
              <LevelChips
                key="levels"
                department={department}
                canManage={canManageCatalog}
                onRemove={detachLevel}
              />,
              department.status,
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
          <FormCard title={editingCourseId ? "Edit Course" : "Create Course"} onSubmit={submit} disabled={!canManageCatalog}>
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
  onRemove,
}: {
  department: Department;
  canManage: boolean;
  onRemove: (departmentId: number, levelId: number) => void;
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
          {canManage ? (
            <button
              type="button"
              aria-label={`Remove ${level.name} from ${department.name}`}
              onClick={() => onRemove(department.id, level.id)}
            >
              x
            </button>
          ) : null}
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
