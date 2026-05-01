"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  activateUser,
  createUser,
  deactivateUser,
  listDepartments,
  listLevels,
  listUsers,
  updateUser,
  type Department,
  type Level,
  type SchoolUser,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

type Role = "staff" | "student";

export function UsersPage({ role, title }: { role: Role; title: string }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", status: "active" });
  const canManageUsers = Boolean(user?.capabilities?.manage_users);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listUsers(role));
    } catch (error) {
      setFeedback(toDanger(error, `Unable to load ${title.toLowerCase()}.`));
    } finally {
      setLoading(false);
    }
  }, [role, title]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        if (editingUserId) {
          await updateUser(editingUserId, {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password.trim() || undefined,
            status: form.status,
          });
        } else {
          await createUser({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password.trim(),
            role,
            status: form.status,
          });
        }
        setEditingUserId(null);
        setForm({ name: "", email: "", password: "", status: "active" });
      },
      editingUserId ? "User updated." : "User created.",
      load,
      setFeedback,
    );
  };

  const startEdit = (user: SchoolUser) => {
    setEditingUserId(user.id);
    setForm({ name: user.name, email: user.email ?? "", password: "", status: user.status });
  };

  const toggleStatus = async (user: SchoolUser) => {
    await runAction(
      async () => {
        if (user.status === "active") {
          await deactivateUser(user.id);
        } else {
          await activateUser(user.id);
        }
      },
      "User status updated.",
      load,
      setFeedback,
    );
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setForm({ name: "", email: "", password: "", status: "active" });
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{title}</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>Users</li>
          <li>{title}</li>
        </ul>
      </div>

      <FeedbackAlert feedback={feedback} />

      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard
            title={editingUserId ? `Edit ${title}` : `Create ${title}`}
            onSubmit={submit}
            disabled={!canManageUsers}
          >
            <label>Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <label className="mt-3">Email</label>
            <input
              className="form-control"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <label className="mt-3">Password</label>
            <input
              className="form-control"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required={!editingUserId}
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
              {editingUserId ? "Update User" : "Save User"}
            </button>
            {editingUserId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <TableCard
            title={`${title} List`}
            loading={loading}
            headers={["Name", "Email", "Status", "Last Login", "Action"]}
            rows={users.map((user) => [
              user.name,
              user.email,
              user.status,
              user.last_login_at || "-",
              <div key={`actions-${user.id}`} className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => startEdit(user)}
                  disabled={!canManageUsers}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => toggleStatus(user)}
                  disabled={!canManageUsers}
                >
                  {user.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </div>,
            ])}
          />
        </div>
      </div>
    </>
  );
}

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<SchoolUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [filters, setFilters] = useState({ search: "", departmentId: "", levelId: "", status: "all" });
  const canManageUsers = Boolean(user?.capabilities?.manage_users);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studentList, departmentList, levelList] = await Promise.all([
        listUsers("student"),
        listDepartments(),
        listLevels(),
      ]);
      setStudents(studentList);
      setDepartments(departmentList);
      setLevels(levelList);
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load students."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredStudents = students.filter((student) => {
    const search = filters.search.trim().toLowerCase();
    const haystack = [student.name, student.matric_no, student.student_id_no, student.phone, student.department?.name, student.level?.name]
      .filter(Boolean).join(" ").toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (filters.departmentId && String(student.department_id || "") !== filters.departmentId) return false;
    if (filters.levelId && String(student.level_id || "") !== filters.levelId) return false;
    if (filters.status !== "all" && student.status !== filters.status) return false;
    return true;
  });

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Students</h3>
        <ul>
          <li><Link href="/dashboard">Home</Link></li>
          <li>Users</li>
          <li>Students</li>
        </ul>
      </div>

      <FeedbackAlert feedback={feedback} />

      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1 mb-3">
            <div className="item-title">
              <h3>Students</h3>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {canManageUsers && (
                <Link href="/users/students/create" className="btn btn-lg btn-gradient-yellow btn-hover-bluedark">
                  Add Student
                </Link>
              )}
              <a href="/templates/student-bulk-upload-template.csv" download className="btn btn-lg btn-outline-secondary">
                Download Template
              </a>
            </div>
          </div>
          <div className="student-filter-grid">
            <div className="form-group">
              <label>Search</label>
              <input className="form-control" placeholder="Name, matric no, student ID, phone" value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select className="form-control" value={filters.departmentId} onChange={(e) => setFilters((c) => ({ ...c, departmentId: e.target.value }))}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Level</label>
              <select className="form-control" value={filters.levelId} onChange={(e) => setFilters((c) => ({ ...c, levelId: e.target.value }))}>
                <option value="">All levels</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Loading...</div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Matric No</th>
                    <th>Student ID No</th>
                    <th>Full Name</th>
                    <th>Department</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr><td colSpan={7} className="text-muted">No records found.</td></tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.matric_no || "-"}</td>
                        <td>{student.student_id_no || "-"}</td>
                        <td>{student.name}</td>
                        <td>{student.department?.name || "-"}</td>
                        <td>{student.level?.name || "-"}</td>
                        <td>
                          <span className={`badge ${student.status === "active" ? "badge-success" : "badge-secondary"}`}>
                            {student.status}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Link href={`/users/students/${student.id}`} className="btn btn-warning">
                              View
                            </Link>
                            {canManageUsers && (
                              <Link href={`/users/students/${student.id}/edit`} className="btn btn-secondary">
                                Edit
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FormCard({
  title,
  disabled,
  onSubmit,
  children,
}: {
  title: string;
  disabled: boolean;
  onSubmit: (event: FormEvent) => void;
  children: React.ReactNode;
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
  rows: React.ReactNode[][];
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

type Feedback = { type: "success" | "danger"; message: string } | null;

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
