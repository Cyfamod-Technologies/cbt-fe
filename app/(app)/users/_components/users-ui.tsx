"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@/app/_components/Pagination";
import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser,
  listCourses,
  listDepartments,
  listLevels,
  listStudentCourseEnrollments,
  listUsers,
  updateUser,
  type Course,
  type Department,
  type Level,
  type SchoolUser,
  type StudentCourseEnrollment,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";
import { DeleteModal } from "@/app/_components/DeleteModal";
import { ApiLinkedError, type LinkedItem } from "@/lib/apiClient";

type DeletePending = { name: string; linked: LinkedItem[]; onConfirm: () => Promise<void> } | null;

type Role = "staff" | "student";

export function UsersPage({ role, title }: { role: Role; title: string }) {
  const { user } = useAuth();
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", status: "active" });
  const [deletePending, setDeletePending] = useState<DeletePending>(null);
  const [confirming, setConfirming] = useState(false);
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

  const handleDelete = async (targetUser: SchoolUser) => {
    try {
      await deleteUser(targetUser.id);
      setFeedback({ type: "success", message: `${title} deleted.` });
      await load();
    } catch (err) {
      if (err instanceof ApiLinkedError) {
        setDeletePending({
          name: targetUser.name,
          linked: err.linked,
          onConfirm: async () => {
            await deleteUser(targetUser.id, true);
            setFeedback({ type: "success", message: `${title} deleted.` });
            await load();
          },
        });
      } else {
        setFeedback(toDanger(err, `Failed to delete ${title.toLowerCase()}.`));
      }
    }
  };

  const confirmDelete = async () => {
    if (!deletePending) return;
    setConfirming(true);
    try {
      await deletePending.onConfirm();
    } catch (err) {
      setFeedback(toDanger(err, "Failed to delete."));
    } finally {
      setConfirming(false);
      setDeletePending(null);
    }
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setForm({ name: "", email: "", password: "", status: "active" });
  };

  return (
    <>
      {deletePending && (
        <DeleteModal
          itemName={deletePending.name}
          linked={deletePending.linked}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeletePending(null)}
          confirming={confirming}
        />
      )}
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
              <div key={`actions-${user.id}`} className="cbt-actions">
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
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => void handleDelete(user)}
                  disabled={!canManageUsers}
                >
                  Delete
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
  const isStaff = user?.role === "staff";
  const staffDeptId = isStaff && user?.department_id ? String(user.department_id) : "";
  const [students, setStudents] = useState<SchoolUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [filters, setFilters] = useState({ search: "", departmentId: staffDeptId, levelId: "", status: "all" });
  const [deletePending, setDeletePending] = useState<DeletePending>(null);
  const [confirming, setConfirming] = useState(false);
  const canManageUsers = Boolean(user?.capabilities?.manage_users);

  // Courses modal state
  const [courseModal, setCourseModal] = useState<{
    student: SchoolUser;
    deptCourses: Course[];
    enrollments: StudentCourseEnrollment[];
  } | null>(null);
  const [courseModalLoading, setCourseModalLoading] = useState(false);

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

  const handleDelete = async (student: SchoolUser) => {
    try {
      await deleteUser(student.id);
      setFeedback({ type: "success", message: "Student deleted." });
      await load();
    } catch (err) {
      if (err instanceof ApiLinkedError) {
        setDeletePending({
          name: student.name,
          linked: err.linked,
          onConfirm: async () => {
            await deleteUser(student.id, true);
            setFeedback({ type: "success", message: "Student deleted." });
            await load();
          },
        });
      } else {
        setFeedback(toDanger(err, "Failed to delete student."));
      }
    }
  };

  const confirmStudentDelete = async () => {
    if (!deletePending) return;
    setConfirming(true);
    try {
      await deletePending.onConfirm();
    } catch (err) {
      setFeedback(toDanger(err, "Failed to delete."));
    } finally {
      setConfirming(false);
      setDeletePending(null);
    }
  };

  const openCoursesModal = async (student: SchoolUser) => {
    setCourseModalLoading(true);
    setCourseModal({ student, deptCourses: [], enrollments: [] });
    try {
      const [allCourses, enrollments] = await Promise.all([
        listCourses(),
        listStudentCourseEnrollments(student.id),
      ]);
      const deptCourses = allCourses.filter((c) => {
        const deptMatch = c.department_id === student.department_id;
        const levelMatch = c.level_id === null || c.level_id === student.level_id;
        return deptMatch && levelMatch;
      });
      setCourseModal({ student, deptCourses, enrollments });
    } catch {
      setCourseModal(null);
    } finally {
      setCourseModalLoading(false);
    }
  };

  const exportStudents = () => {
    const rows = filteredStudents.map((s) => [
      s.matric_no ?? "",
      s.student_id_no ?? "",
      s.name,
      s.email ?? "",
      s.phone ?? "",
      s.gender ?? "",
      s.department?.name ?? "",
      s.level?.name ?? "",
      s.status,
    ]);
    const header = ["Matric No", "Student ID No", "Full Name", "Email", "Phone", "Gender", "Department", "Level", "Status"];
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dept = departments.find((d) => String(d.id) === filters.departmentId)?.name ?? "all-depts";
    const lvl = levels.find((l) => String(l.id) === filters.levelId)?.name ?? "all-levels";
    a.href = url;
    a.download = `students-${dept}-${lvl}.csv`.replace(/\s+/g, "-").toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const search = filters.search.trim().toLowerCase();
        const haystack = [student.name, student.matric_no, student.student_id_no, student.phone, student.department?.name, student.level?.name]
          .filter(Boolean).join(" ").toLowerCase();
        if (search && !haystack.includes(search)) return false;
        if (filters.departmentId && String(student.department_id || "") !== filters.departmentId) return false;
        if (filters.levelId && String(student.level_id || "") !== filters.levelId) return false;
        if (filters.status !== "all" && student.status !== filters.status) return false;
        return true;
      }),
    [students, filters],
  );

  const STUDENTS_PAGE_SIZE = 15;
  const [studentsPage, setStudentsPage] = useState(1);
  const studentsTotalPages = Math.ceil(filteredStudents.length / STUDENTS_PAGE_SIZE);
  const paginatedStudents = filteredStudents.slice((studentsPage - 1) * STUDENTS_PAGE_SIZE, studentsPage * STUDENTS_PAGE_SIZE);

  useEffect(() => {
    setStudentsPage(1);
  }, [filteredStudents.length]);

  return (
    <>
      {deletePending && (
        <DeleteModal
          itemName={deletePending.name}
          linked={deletePending.linked}
          onConfirm={() => void confirmStudentDelete()}
          onCancel={() => setDeletePending(null)}
          confirming={confirming}
        />
      )}

      {/* Registered Courses Modal */}
      {courseModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h5 style={{ margin: 0, fontWeight: 700 }}>Registered Courses</h5>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                  {courseModal.student.name} · {courseModal.student.department?.name || "—"} · {courseModal.student.level?.name || "—"}
                </p>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCourseModal(null)}>✕</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "1rem 1.5rem" }}>
              {courseModalLoading ? (
                <p className="text-muted">Loading courses...</p>
              ) : (
                <>
                  <h6 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
                    Dept/Level Courses ({courseModal.deptCourses.length})
                  </h6>
                  {courseModal.deptCourses.length === 0 ? (
                    <p className="text-muted small">No courses assigned to this department/level.</p>
                  ) : (
                    <table className="table" style={{ fontSize: "0.88rem" }}>
                      <thead>
                        <tr><th>Code</th><th>Title</th><th>Level</th><th>CU</th></tr>
                      </thead>
                      <tbody>
                        {courseModal.deptCourses.map((c) => (
                          <tr key={c.id}>
                            <td><code>{c.code}</code></td>
                            <td>{c.title}</td>
                            <td>{c.level?.name || "Any"}</td>
                            <td>{c.credit_unit || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {courseModal.enrollments.length > 0 && (
                    <>
                      <h6 style={{ fontWeight: 700, margin: "1rem 0 0.5rem" }}>
                        Additional Enrollments ({courseModal.enrollments.length})
                      </h6>
                      <table className="table" style={{ fontSize: "0.88rem" }}>
                        <thead>
                          <tr><th>Code</th><th>Title</th><th>Type</th></tr>
                        </thead>
                        <tbody>
                          {courseModal.enrollments.map((e) => (
                            <tr key={e.id}>
                              <td><code>{e.course?.code || "—"}</code></td>
                              <td>{e.course?.title || "—"}</td>
                              <td><span className="badge badge-warning">{e.type}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: "0.75rem 1.5rem", borderTop: "1px solid #e5e7eb", textAlign: "right" }}>
              <button type="button" className="btn btn-outline-secondary" onClick={() => setCourseModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

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
              <button type="button" className="btn btn-lg btn-outline-secondary" onClick={exportStudents} disabled={filteredStudents.length === 0}>
                Export Students {filteredStudents.length > 0 ? `(${filteredStudents.length})` : ""}
              </button>
            </div>
          </div>
          <div className="student-filter-grid">
            <div className="form-group">
              <label>Search</label>
              <input className="form-control" placeholder="Name, matric no, student ID, phone" value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Department</label>
              {isStaff && staffDeptId ? (
                <div className="form-control" style={{ background: "#f8fafc", color: "#374151", fontWeight: 500 }}>
                  {departments.find((d) => String(d.id) === staffDeptId)?.name ?? "Your Department"}
                </div>
              ) : (
                <select className="form-control" value={filters.departmentId} onChange={(e) => setFilters((c) => ({ ...c, departmentId: e.target.value }))}>
                  <option value="">All departments</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
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
                  {paginatedStudents.length === 0 ? (
                    <tr><td colSpan={7} className="text-muted">No records found.</td></tr>
                  ) : (
                    paginatedStudents.map((student) => (
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
                          <div className="cbt-actions">
                            <Link href={`/users/students/${student.id}`} className="btn btn-sm btn-warning">
                              View
                            </Link>

                            {canManageUsers && (
                              <Link href={`/users/students/${student.id}/edit`} className="btn btn-sm btn-secondary">
                                Edit
                              </Link>
                            )}
                            {canManageUsers && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => void handleDelete(student)}
                              >
                                Delete
                              </button>
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
          <Pagination
            page={studentsPage}
            totalPages={studentsTotalPages}
            totalItems={filteredStudents.length}
            pageSize={STUDENTS_PAGE_SIZE}
            onPageChange={setStudentsPage}
          />
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
  pageSize = 15,
}: {
  title: string;
  loading: boolean;
  headers: string[];
  rows: React.ReactNode[][];
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [totalItems]);

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
          <>
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
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length} className="text-muted">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, rowIndex) => (
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
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
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
