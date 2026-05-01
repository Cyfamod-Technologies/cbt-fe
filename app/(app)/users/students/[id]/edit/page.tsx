"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getUser,
  listDepartments,
  updateUser,
  type Department,
} from "@/lib/academic";

interface StudentForm {
  name: string;
  matric_no: string;
  student_id_no: string;
  department_id: string;
  level_id: string;
  email: string;
  phone: string;
  password: string;
  status: string;
}

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.id);

  const [form, setForm] = useState<StudentForm>({
    name: "",
    matric_no: "",
    student_id_no: "",
    department_id: "",
    level_id: "",
    email: "",
    phone: "",
    password: "",
    status: "active",
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [student, depts] = await Promise.all([
        getUser(studentId),
        listDepartments(),
      ]);
      setForm({
        name: student.name ?? "",
        matric_no: student.matric_no ?? "",
        student_id_no: student.student_id_no ?? "",
        department_id: student.department_id ? String(student.department_id) : "",
        level_id: student.level_id ? String(student.level_id) : "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        password: "",
        status: student.status ?? "active",
      });
      setDepartments(depts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const availableLevels = useMemo(() => {
    const dept = departments.find((d) => String(d.id) === form.department_id);
    return dept?.levels ?? [];
  }, [departments, form.department_id]);

  const handleDeptChange = (value: string) => {
    setForm((prev) => ({ ...prev, department_id: value, level_id: "" }));
  };

  useEffect(() => { void load(); }, [load]);

  const setField = (key: keyof StudentForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Full name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await updateUser(studentId, {
        name: form.name.trim(),
        matric_no: form.matric_no.trim() || undefined,
        student_id_no: form.student_id_no.trim() || undefined,
        department_id: form.department_id ? Number(form.department_id) : null,
        level_id: form.level_id ? Number(form.level_id) : null,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password.trim() || undefined,
        status: form.status,
      });
      router.push(`/users/students/${studentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update student.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 200 }}>
        <div className="spinner-border" />
      </div>
    );
  }

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Student Management</h3>
        <ul>
          <li><Link href="/dashboard">Home</Link></li>
          <li><Link href="/users/students">Students</Link></li>
          <li><Link href={`/users/students/${studentId}`}>Student Details</Link></li>
          <li>Edit Student</li>
        </ul>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Edit Student</h3>
            </div>
          </div>

          <form className="new-added-form" onSubmit={(e) => void handleSubmit(e)}>
            <div className="row">
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  required
                />
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Matric No</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.matric_no}
                  onChange={(e) => setField("matric_no", e.target.value)}
                />
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Student ID No</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.student_id_no}
                  onChange={(e) => setField("student_id_no", e.target.value)}
                />
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Department</label>
                <select
                  className="form-control"
                  value={form.department_id}
                  onChange={(e) => handleDeptChange(e.target.value)}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Level</label>
                <select
                  className="form-control"
                  value={form.level_id}
                  onChange={(e) => setField("level_id", e.target.value)}
                  disabled={!form.department_id || availableLevels.length === 0}
                >
                  <option value="">
                    {form.department_id && availableLevels.length === 0
                      ? "No levels assigned to this dept"
                      : "Select Level"}
                  </option>
                  {availableLevels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="col-xl-3 col-lg-6 col-12 form-group">
                <label>Status *</label>
                <select
                  className="form-control"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="col-12 form-group mg-t-8">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
                <Link href={`/users/students/${studentId}`} className="btn-fill-lg bg-blue-dark btn-hover-yellow ml-3">
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
