"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  activateStaff,
  createStaff,
  deactivateStaff,
  getStaff,
  listDepartments,
  listStaff,
  updateStaff,
  type Department,
  type Staff,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

type StaffFormState = {
  staff_id: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: string;
  password: string;
  password_confirmation: string;
};

const emptyForm: StaffFormState = {
  staff_id: "",
  full_name: "",
  email: "",
  phone: "",
  department_id: "",
  password: "",
  password_confirmation: "",
};

export function StaffListPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const canManageUsers = Boolean(user?.capabilities?.manage_users);

  const load = async () => {
    setLoading(true);
    try {
      setStaff(await listStaff());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staff records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return staff;
    }

    return staff.filter((item) => {
      const haystack = [item.staff_id, item.full_name, item.email, item.phone, item.department?.name, item.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, staff]);

  const toggleStatus = async (item: Staff) => {
    const nextAction = item.status === "active" ? "deactivate" : "activate";
    if (!window.confirm(`${nextAction === "activate" ? "Activate" : "Deactivate"} staff profile for "${item.full_name}"?`)) {
      return;
    }

    try {
      if (nextAction === "activate") {
        await activateStaff(item.id);
      } else {
        await deactivateStaff(item.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update staff status.");
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Staff Management</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>Staff</li>
        </ul>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Staff</h3>
            </div>
            <div className="dropdown">
              {canManageUsers ? (
                <Link href="/users/staff/add" className="btn btn-outline-primary mr-3">
                  <i className="fas fa-user-plus mr-1" />
                  Add Staff
                </Link>
              ) : null}
              <a className="dropdown-toggle" href="#" role="button" data-toggle="dropdown" aria-expanded="false">
                ...
              </a>
              <div className="dropdown-menu dropdown-menu-right">
                <button className="dropdown-item" type="button" onClick={() => void load()}>
                  <i className="fas fa-redo-alt text-orange-peel" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <form className="row gutters-8 align-items-end mb-3" onSubmit={(event) => event.preventDefault()}>
            <div className="col-lg-4 col-md-6 col-12 form-group">
              <label className="text-dark-medium" htmlFor="staff-search">
                Search
              </label>
              <input
                id="staff-search"
                type="text"
                placeholder="Staff ID, name, email, phone or department"
                className="form-control"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </form>

          <div className="table-responsive">
            <table className="table display text-nowrap">
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center">
                      Loading staff...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((item) => (
                    <tr key={item.id}>
                      <td>{item.staff_id}</td>
                      <td>{item.full_name}</td>
                      <td>{item.email ?? "N/A"}</td>
                      <td>{item.phone ?? "N/A"}</td>
                      <td>{item.department?.name ?? "N/A"}</td>
                      <td className="text-capitalize">{item.status}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link href={`/users/staff/edit?id=${item.id}`} className="btn btn-sm btn-outline-primary mr-1">
                            Edit
                          </Link>
                          {canManageUsers ? (
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void toggleStatus(item)}>
                              {item.status === "active" ? "Deactivate" : "Activate"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export function StaffFormPage({ mode }: { mode: "create" | "edit" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get("id");
  const [form, setForm] = useState<StaffFormState>(emptyForm);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    void listDepartments()
      .then((items) => {
        if (active) {
          setDepartments(items);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to load departments.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    if (!staffId) {
      router.replace("/users/staff");
      return;
    }

    let active = true;

    void getStaff(Number(staffId))
      .then((staff) => {
        if (!active) {
          return;
        }

        setForm({
          staff_id: staff.staff_id,
          full_name: staff.full_name,
          email: staff.email ?? "",
          phone: staff.phone ?? "",
          department_id: staff.department_id ? String(staff.department_id) : "",
          password: "",
          password_confirmation: "",
        });
        setError(null);
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unable to load staff profile.");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mode, router, staffId]);

  const updateField = (key: keyof StaffFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.full_name.trim()) {
      setError("Enter the staff member's full name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Enter the staff email address.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Enter the staff phone number.");
      return;
    }
    if (!form.staff_id.trim()) {
      setError("Enter the staff ID.");
      return;
    }

    if (form.password || form.password_confirmation) {
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (form.password !== form.password_confirmation) {
        setError("Password confirmation does not match.");
        return;
      }
    }

    const payload = {
      staff_id: form.staff_id.trim(),
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department_id: form.department_id ? Number(form.department_id) : null,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      setSubmitting(true);

      if (mode === "edit") {
        if (!staffId) {
          throw new Error("Staff profile not found.");
        }

        await updateStaff(Number(staffId), payload);
        setSuccess("Staff profile updated successfully.");
        router.push("/users/staff");
      } else {
        const response = await createStaff(payload);
        const tempPassword = response.temporary_password ?? "A temporary password has been sent to the staff email.";

        setSuccess(
          typeof tempPassword === "string"
            ? `Staff profile created successfully. Temporary password: ${tempPassword}`
            : "Staff profile created successfully.",
        );

        setTimeout(() => {
          router.push("/users/staff");
        }, 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save staff profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === "edit" && loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Staff Management</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/users/staff">Staff</Link>
          </li>
          <li>{mode === "create" ? "Add Staff" : "Edit Staff"}</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>{mode === "create" ? "Create Staff Profile" : "Edit Staff Profile"}</h3>
            </div>
            <button className="btn btn-outline-secondary" type="button" onClick={() => router.back()}>
              <i className="fas fa-arrow-left mr-1" />
              Back
            </button>
          </div>

          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="alert alert-success" role="alert">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="row gutters-8">
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-number">Staff ID *</label>
                <input
                  id="staff-number"
                  type="text"
                  className="form-control"
                  placeholder="e.g. STF-001"
                  value={form.staff_id}
                  onChange={(event) => updateField("staff_id", event.target.value)}
                  required
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-name">Full Name *</label>
                <input
                  id="staff-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={form.full_name}
                  onChange={(event) => updateField("full_name", event.target.value)}
                  required
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-email">Email *</label>
                <input
                  id="staff-email"
                  type="email"
                  className="form-control"
                  placeholder="e.g. john@example.com"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  required
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-phone">Phone *</label>
                <input
                  id="staff-phone"
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 0803 000 0000"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  required
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-department">Department</label>
                <select
                  id="staff-department"
                  className="form-control"
                  value={form.department_id}
                  onChange={(event) => updateField("department_id", event.target.value)}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-password">{mode === "create" ? "Password" : "New Password"}</label>
                <input
                  id="staff-password"
                  type="password"
                  className="form-control"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder={mode === "create" ? "Leave blank to auto-generate" : "Leave blank to keep current password"}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-password-confirmation">Confirm Password</label>
                <input
                  id="staff-password-confirmation"
                  type="password"
                  className="form-control"
                  value={form.password_confirmation}
                  onChange={(event) => updateField("password_confirmation", event.target.value)}
                  placeholder="Repeat password if setting one"
                />
              </div>
            </div>

            <div className="d-flex justify-content-end">
              <button
                type="submit"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                disabled={submitting}
              >
                {submitting ? "Saving..." : mode === "create" ? "Create Staff" : "Update Staff"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
