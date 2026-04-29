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
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
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
          <div className="heading-layout1 mb-0">
            <div className="item-title">
              <h3>Student Actions</h3>
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
              <button type="button" className="btn btn-lg btn-warning" disabled>
                Upload CSV
              </button>
              <button type="button" className="btn btn-lg btn-warning" disabled>
                Overrides
              </button>
              <button type="button" className="btn btn-lg btn-warning" disabled>
                Student Courses
              </button>
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

      <TableCard
        title="Student List"
        loading={loading}
        headers={["Matric No", "Student ID No", "Full Name", "Department", "Level", "Email", "Phone", "Status", "Action"]}
        rows={students.map((student) => [
          student.matric_no || "-",
          student.student_id_no || "-",
          student.name,
          student.department?.name || "-",
          student.level?.name || "-",
          student.email || "-",
          student.phone || "-",
          student.status,
          <div key={`student-actions-${student.id}`} className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-warning btn-sm"
              disabled={!canManageUsers}
              onClick={() => startEdit(student)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-warning btn-sm"
              disabled={!canManageUsers}
              onClick={() => toggleStatus(student)}
            >
              {student.status === "active" ? "Deactivate" : "Activate"}
            </button>
          </div>,
        ])}
      />
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