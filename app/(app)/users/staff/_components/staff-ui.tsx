"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createStaff,
  deleteStaff,
  getUser,
  listStaff,
  updateStaff,
  type SchoolUser,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "others", label: "Others" },
];

type StaffFormState = {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  gender: string;
  employment_start_date: string;
  address: string;
  qualifications: string;
  password: string;
  password_confirmation: string;
};

const emptyForm: StaffFormState = {
  full_name: "",
  email: "",
  phone: "",
  role: "Staff",
  gender: "",
  employment_start_date: "",
  address: "",
  qualifications: "",
  password: "",
  password_confirmation: "",
};

export function StaffListPage() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<SchoolUser[]>([]);
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
      const haystack = [item.full_name ?? item.name, item.email, item.phone, item.gender, item.qualifications]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, staff]);

  const handleDelete = async (item: SchoolUser) => {
    if (!window.confirm(`Delete staff profile for "${item.full_name ?? item.name}"?`)) {
      return;
    }

    try {
      await deleteStaff(item.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete staff profile.");
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
                placeholder="Name, email, phone or qualification"
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
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Gender</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center">
                      Loading staff…
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((item) => (
                    <tr key={item.id}>
                      <td>{item.full_name ?? item.name}</td>
                      <td>{item.email ?? "N/A"}</td>
                      <td>{item.phone ?? "N/A"}</td>
                      <td>Staff</td>
                      <td className="text-capitalize">{item.gender ?? "N/A"}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link href={`/users/staff/edit?id=${item.id}`} className="btn btn-sm btn-outline-primary mr-1">
                            Edit
                          </Link>
                          {canManageUsers ? (
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => void handleDelete(item)}>
                              Delete
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    if (!staffId) {
      router.replace("/users/staff");
      return;
    }

    let active = true;

    void getUser(Number(staffId))
      .then((staff) => {
        if (!active) {
          return;
        }

        setForm({
          full_name: staff.full_name ?? staff.name ?? "",
          email: staff.email ?? "",
          phone: staff.phone ?? "",
          role: "Staff",
          gender: staff.gender ?? "",
          employment_start_date: staff.employment_start_date ?? "",
          address: staff.address ?? "",
          qualifications: staff.qualifications ?? "",
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
    if (!form.gender.trim()) {
      setError("Select the staff gender.");
      return;
    }

    if (mode === "edit" && (form.password || form.password_confirmation)) {
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (form.password !== form.password_confirmation) {
        setError("Password confirmation does not match.");
        return;
      }
    }

    const payload = new FormData();
    payload.append("full_name", form.full_name.trim());
    payload.append("email", form.email.trim());
    payload.append("phone", form.phone.trim());
    payload.append("role", "staff");
    payload.append("gender", form.gender.trim());
    payload.append("employment_start_date", form.employment_start_date);
    payload.append("address", form.address.trim());
    payload.append("qualifications", form.qualifications.trim());

    if (mode === "edit" && form.password) {
      payload.append("password", form.password);
      payload.append("password_confirmation", form.password_confirmation);
    }

    if (photoFile) {
      payload.append("photo", photoFile);
    }

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
                <label htmlFor="staff-role">Role *</label>
                <select id="staff-role" className="form-control" value={form.role} disabled>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-gender">Gender *</label>
                <select
                  id="staff-gender"
                  className="form-control"
                  value={form.gender}
                  onChange={(event) => updateField("gender", event.target.value)}
                  required
                >
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-start-date">Employment Start Date</label>
                <input
                  id="staff-start-date"
                  type="date"
                  className="form-control"
                  value={form.employment_start_date}
                  onChange={(event) => updateField("employment_start_date", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-qualifications">Qualifications</label>
                <input
                  id="staff-qualifications"
                  type="text"
                  className="form-control"
                  placeholder="e.g. B.Ed Mathematics"
                  value={form.qualifications}
                  onChange={(event) => updateField("qualifications", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-address">Address</label>
                <input
                  id="staff-address"
                  type="text"
                  className="form-control"
                  placeholder="e.g. 123 Main Street"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="staff-photo">Profile Photo</label>
                <input
                  id="staff-photo"
                  type="file"
                  accept="image/*"
                  className="form-control-file"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                />
              </div>
              {mode === "edit" ? (
                <>
                  <div className="col-lg-6 col-12 form-group">
                    <label htmlFor="staff-password">New Password</label>
                    <input
                      id="staff-password"
                      type="password"
                      className="form-control"
                      value={form.password}
                      onChange={(event) => updateField("password", event.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                  <div className="col-lg-6 col-12 form-group">
                    <label htmlFor="staff-password-confirmation">Confirm New Password</label>
                    <input
                      id="staff-password-confirmation"
                      type="password"
                      className="form-control"
                      value={form.password_confirmation}
                      onChange={(event) => updateField("password_confirmation", event.target.value)}
                      placeholder="Repeat the new password"
                    />
                  </div>
                </>
              ) : null}
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