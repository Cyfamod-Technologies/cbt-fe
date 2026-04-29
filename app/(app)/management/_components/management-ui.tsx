"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
  createDepartment,
  createSemester,
  createSession,
  getSchoolSettings,
  listDepartments,
  listSemesters,
  listSessions,
  setCurrentSemester,
  setCurrentSession,
  type AcademicSession,
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
        await createSession({ name: name.trim(), is_current: sessions.length === 0 });
        setName("");
      },
      "Session created.",
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
              session.status,
              session.is_current ? <span className="badge badge-success">Current</span> : "No",
              session.is_current ? (
                ""
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!canManageCatalog}
                  onClick={() => chooseCurrent(session.id)}
                >
                  Set Current
                </button>
              ),
            ])}
          />
        </div>
      </div>
    </ManagementShell>
  );
}

export function SemestersManagementPage() {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const canManageCatalog = Boolean(user?.capabilities?.manage_catalog);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [semesterData, settingsData] = await Promise.all([listSemesters(), getSchoolSettings()]);
      setSemesters(semesterData);
      setSettings(settingsData);
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
        await createSemester({ name: name.trim() });
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
            headers={["Name", "Status", "Current", "Action"]}
            rows={semesters.map((semester) => {
              const isCurrent = settings?.current_semester_id === semester.id;
              return [
                semester.name,
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
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title="All Departments"
            loading={loading}
            headers={["Name", "Code", "Status"]}
            rows={departments.map((department) => [
              department.name,
              department.code || "",
              department.status,
            ])}
          />
        </div>
      </div>
    </ManagementShell>
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
