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
import { listAssessmentAttempts, type AssessmentAttempt } from "@/lib/cbt";
import { formatDateTime, formatResultScore, statusBadgeClass } from "@/app/(app)/cbt/_components/cbt-utils";

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
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [viewStudent, setViewStudent] = useState<SchoolUser | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<AssessmentAttempt[]>([]);
  const [filters, setFilters] = useState({ search: "", departmentId: "", levelId: "", status: "all" });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    matric_no: "",
    student_id_no: "",
    full_name: "",
    department_id: "",
    level_id: "",
    email: "",
    phone: "",
    status: "active",
  });
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

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editingUserId) {
        await updateUser(editingUserId, {
          full_name: form.full_name.trim(),
          matric_no: form.matric_no.trim(),
          student_id_no: form.student_id_no.trim(),
          department_id: Number(form.department_id),
          level_id: Number(form.level_id),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          status: form.status,
        });
        setFeedback({ type: "success", message: "Student updated." });
      } else {
        const response = await createUser({
          full_name: form.full_name.trim(),
          matric_no: form.matric_no.trim(),
          student_id_no: form.student_id_no.trim(),
          department_id: Number(form.department_id),
          level_id: Number(form.level_id),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          role: "student",
          status: form.status,
        });

        setFeedback({
          type: "success",
          message: response.temporary_password
            ? `Student created. Temporary password: ${response.temporary_password}`
            : "Student created.",
        });
      }

      setEditingUserId(null);
      setForm({
        matric_no: "",
        student_id_no: "",
        full_name: "",
        department_id: "",
        level_id: "",
        email: "",
        phone: "",
        status: "active",
      });
      setFormOpen(false);
      await load();
    } catch (error) {
      setFeedback(toDanger(error, "Action failed."));
    }
  };

  const startAdd = () => {
    setEditingUserId(null);
    setForm({
      matric_no: "",
      student_id_no: "",
      full_name: "",
      department_id: "",
      level_id: "",
      email: "",
      phone: "",
      status: "active",
    });
    setFormOpen(true);
  };

  const startEdit = (student: SchoolUser) => {
    setEditingUserId(student.id);
    setForm({
      matric_no: student.matric_no ?? "",
      student_id_no: student.student_id_no ?? "",
      full_name: student.name,
      department_id: student.department_id ? String(student.department_id) : "",
      level_id: student.level_id ? String(student.level_id) : "",
      email: student.email ?? "",
      phone: student.phone ?? "",
      status: student.status,
    });
    setFormOpen(true);
  };

  const toggleStatus = async (student: SchoolUser) => {
    await runAction(
      async () => {
        if (student.status === "active") {
          await deactivateUser(student.id);
        } else {
          await activateUser(student.id);
        }
      },
      "Student status updated.",
      load,
      setFeedback,
    );
  };

  const filteredStudents = students.filter((student) => {
    const search = filters.search.trim().toLowerCase();
    const haystack = [student.name, student.matric_no, student.student_id_no, student.phone, student.department?.name, student.level?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (search && !haystack.includes(search)) {
      return false;
    }
    if (filters.departmentId && String(student.department_id || "") !== filters.departmentId) {
      return false;
    }
    if (filters.levelId && String(student.level_id || "") !== filters.levelId) {
      return false;
    }
    if (filters.status !== "all" && student.status !== filters.status) {
      return false;
    }
    return true;
  });

  const showStudent = async (student: SchoolUser) => {
    setViewStudent(student);
    setAttemptsLoading(true);
    try {
      const attempts = await listAssessmentAttempts();
      setStudentAttempts(attempts.filter((attempt) => attempt.student_id === student.id));
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load student quiz history."));
      setStudentAttempts([]);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setFormOpen(false);
    setForm({
      matric_no: "",
      student_id_no: "",
      full_name: "",
      department_id: "",
      level_id: "",
      email: "",
      phone: "",
      status: "active",
    });
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Students</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
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
              <button
                type="button"
                className="btn btn-lg btn-gradient-yellow btn-hover-bluedark"
                onClick={startAdd}
                disabled={!canManageUsers}
              >
                Add Student
              </button>
              <a
                href="/templates/student-bulk-upload-template.csv"
                download
                className="btn btn-lg btn-outline-secondary"
              >
                Download Template
              </a>
            </div>
          </div>
          <div className="student-filter-grid">
            <div className="form-group">
              <label>Search</label>
              <input className="form-control" placeholder="Name, matric no, student ID, phone" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select className="form-control" value={filters.departmentId} onChange={(event) => setFilters((current) => ({ ...current, departmentId: event.target.value }))}>
                <option value="">All departments</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Level</label>
              <select className="form-control" value={filters.levelId} onChange={(event) => setFilters((current) => ({ ...current, levelId: event.target.value }))}>
                <option value="">All levels</option>
                {levels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select className="form-control" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {formOpen ? (
        <div className="row mb-4">
          <div className="col-12 col-lg-5">
            <FormCard title={editingUserId ? "Edit Student" : "Create Student"} onSubmit={submit} disabled={!canManageUsers}>
              <label>Matric No *</label>
              <input
                className="form-control"
                value={form.matric_no}
                onChange={(event) => setForm((current) => ({ ...current, matric_no: event.target.value }))}
                required
              />
              <label className="mt-3">Student ID No *</label>
              <input
                className="form-control"
                value={form.student_id_no}
                onChange={(event) => setForm((current) => ({ ...current, student_id_no: event.target.value }))}
                required
              />
              <label className="mt-3">Full Name *</label>
              <input
                className="form-control"
                value={form.full_name}
                onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                required
              />
              <label className="mt-3">Department *</label>
              <select
                className="form-control"
                value={form.department_id}
                onChange={(event) => setForm((current) => ({ ...current, department_id: event.target.value }))}
                required
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <label className="mt-3">Level *</label>
              <select
                className="form-control"
                value={form.level_id}
                onChange={(event) => setForm((current) => ({ ...current, level_id: event.target.value }))}
                required
              >
                <option value="">Select level</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
              <label className="mt-3">Email</label>
              <input
                className="form-control"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
              <label className="mt-3">Phone</label>
              <input
                className="form-control"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
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
              <button type="submit" className="btn btn-lg btn-gradient-yellow btn-hover-bluedark mt-3">
                {editingUserId ? "Update Student" : "Save Student"}
              </button>
              <button type="button" className="btn btn-lg btn-warning mt-3 ml-2" onClick={cancelEdit}>
                Cancel
              </button>
            </FormCard>
          </div>
        </div>
      ) : null}

      {viewStudent ? (
        <div className="card height-auto mb-4">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h3>About {viewStudent.name}</h3>
              </div>
              <div className="dropdown">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary dropdown-toggle"
                  data-toggle="dropdown"
                  aria-expanded="false"
                >
                  ...
                </button>
                <div className="dropdown-menu dropdown-menu-right">
                  <button
                    type="button"
                    className="dropdown-item"
                    disabled={!canManageUsers}
                    onClick={() => startEdit(viewStudent)}
                  >
                    <i className="fas fa-cogs"></i> Edit
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    disabled={!canManageUsers}
                    onClick={() => toggleStatus(viewStudent)}
                  >
                    <i className="fas fa-ban"></i> {viewStudent.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <div className="dropdown-divider"></div>
                  <button type="button" className="dropdown-item" onClick={() => setViewStudent(null)}>
                    <i className="fas fa-times"></i> Close
                  </button>
                </div>
              </div>
            </div>
            <div className="single-info-details">
              <div className="item-img">
                <img
                  src="/assets/img/figure/student.png"
                  alt="student"
                  style={{ width: "150px", height: "auto", borderRadius: "4px" }}
                />
              </div>
              <div className="item-content">
                <div className="info-table table-responsive">
                  <table className="table text-nowrap">
                    <tbody>
                      <tr>
                        <td>Full Name:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.name}</td>
                      </tr>
                      <tr>
                        <td>Matric No:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.matric_no || "-"}</td>
                      </tr>
                      <tr>
                        <td>Student ID:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.student_id_no || "-"}</td>
                      </tr>
                      <tr>
                        <td>Department:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.department?.name || "-"}</td>
                      </tr>
                      <tr>
                        <td>Level:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.level?.name || "-"}</td>
                      </tr>
                      <tr>
                        <td>Phone:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.phone || "-"}</td>
                      </tr>
                      <tr>
                        <td>Email:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.email || "-"}</td>
                      </tr>
                      <tr>
                        <td>Status:</td>
                        <td className="font-medium text-dark-medium">{viewStudent.status}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="heading-layout1 mt-4">
              <div className="item-title">
                <h3>Quiz History</h3>
              </div>
            </div>
            {attemptsLoading ? (
              <div className="text-muted">Loading quiz history...</div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Quiz</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Started</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAttempts.length === 0 ? (
                      <tr><td colSpan={5}>No quiz attempts found.</td></tr>
                    ) : (
                      studentAttempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td>{attempt.assessment?.title || `Assessment #${attempt.assessment_id}`}</td>
                          <td><span className={statusBadgeClass(attempt.status)}>{attempt.status}</span></td>
                          <td>{formatResultScore(attempt)}</td>
                          <td>{formatDateTime(attempt.start_time)}</td>
                          <td>{formatDateTime(attempt.end_time)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>All Students</h3>
            </div>
          </div>
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
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-muted">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.matric_no || "-"}</td>
                        <td>{student.student_id_no || "-"}</td>
                        <td>{student.name}</td>
                        <td>{student.phone || "-"}</td>
                        <td>{student.status}</td>
                        <td>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn-warning btn-sm"
                              onClick={() => showStudent(student)}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="btn btn-warning btn-sm"
                              disabled={!canManageUsers}
                              onClick={() => startEdit(student)}
                            >
                              Edit
                            </button>
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
