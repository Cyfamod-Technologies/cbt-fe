"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSchoolSettings,
  listCourses,
  listDepartments,
  listLevels,
  listSemesters,
  listSessions,
  listStaff,
  listStaffCourseAssignments,
  listUsers,
  type SchoolSettings,
  type SchoolUser,
  type Staff,
  type StaffCourseAssignment,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

const formatValue = (value: string | null | undefined) => {
  return value && value.trim().length > 0 ? value : "Not set";
};

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "staff") {
    return <StaffDashboardHome />;
  }

  return <AdminDashboardHome />;
}

function AdminDashboardHome() {
  const [counts, setCounts] = useState({
    sessions: 0,
    semesters: 0,
    departments: 0,
    levels: 0,
    courses: 0,
  });
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessions, semesters, departments, levels, courses, schoolSettings] = await Promise.all([
        listSessions(),
        listSemesters(),
        listDepartments(),
        listLevels(),
        listCourses(),
        getSchoolSettings(),
      ]);

      setCounts({
        sessions: sessions.length,
        semesters: semesters.length,
        departments: departments.length,
        levels: levels.length,
        courses: courses.length,
      });
      setSettings(schoolSettings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const summaryCards = useMemo(
    () => [
      { label: "Sessions", value: String(counts.sessions), icon: "S", accent: "bg-light-green" },
      { label: "Departments", value: String(counts.departments), icon: "D", accent: "bg-skyblue" },
      { label: "Levels", value: String(counts.levels), icon: "L", accent: "bg-yellow" },
      { label: "Courses", value: String(counts.courses), icon: "C", accent: "bg-violet-blue" },
    ],
    [counts],
  );

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>CBT Dashboard</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>Dashboard</li>
        </ul>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row">
        {summaryCards.map((card) => (
          <div className="col-lg-3 col-md-6 col-12" key={card.label}>
            <div className={`dashboard-summery-one ${card.accent}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="item-icon">{card.icon}</div>
                <div style={{ textAlign: "right" }}>
                  <div className="item-number">{loading ? "..." : card.value}</div>
                  <div className="item-title">{card.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <div className="col-lg-8 col-12">
          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Academic Foundation</h3>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Area</th>
                      <th>Records</th>
                      <th>Current</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Sessions</td>
                      <td>{loading ? "..." : counts.sessions}</td>
                      <td>{settings?.current_session?.name || "Not set"}</td>
                    </tr>
                    <tr>
                      <td>Semesters</td>
                      <td>{loading ? "..." : counts.semesters}</td>
                      <td>{settings?.current_semester?.name || "Not set"}</td>
                    </tr>
                    <tr>
                      <td>Departments</td>
                      <td>{loading ? "..." : counts.departments}</td>
                      <td>School scoped</td>
                    </tr>
                    <tr>
                      <td>Levels</td>
                      <td>{loading ? "..." : counts.levels}</td>
                      <td>School scoped</td>
                    </tr>
                    <tr>
                      <td>Courses</td>
                      <td>{loading ? "..." : counts.courses}</td>
                      <td>Department scoped</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        <div className="col-lg-4 col-12">
          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Management</h3>
                </div>
              </div>
              <div className="quick-action-list">
                <Link href="/management/sessions" className="quick-action">
                  <span>Session</span>
                  <span aria-hidden="true">›</span>
                </Link>
                <Link href="/management/semesters" className="quick-action">
                  <span>Semesters</span>
                  <span aria-hidden="true">›</span>
                </Link>
                <Link href="/management/departments" className="quick-action">
                  <span>Departments</span>
                  <span aria-hidden="true">›</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="card height-auto" id="sync">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Offline Sync</h3>
                </div>
              </div>
              <p className="text-muted" style={{ lineHeight: 1.7 }}>
                Offline mode keeps one school&apos;s data locally, queues changes, and syncs with the
                online server when connectivity returns.
              </p>
              <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                Backend remains the source of truth for sync state and conflicts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StaffDashboardHome() {
  const { user } = useAuth();
  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [assignments, setAssignments] = useState<StaffCourseAssignment[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [students, setStudents] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [staffList, schoolSettings] = await Promise.all([listStaff(), getSchoolSettings()]);
      const profile =
        staffList.find((staff) => staff.user_id === user.id) ||
        staffList.find((staff) => staff.email.toLowerCase() === user.email.toLowerCase()) ||
        null;

      const [staffAssignments, deptStudents] = await Promise.all([
        profile ? listStaffCourseAssignments(profile.id) : Promise.resolve([]),
        profile?.department_id ? listUsers("student").catch(() => []) : Promise.resolve([]),
      ]);
      setStaffProfile(profile);
      setAssignments(staffAssignments);
      setStudents(deptStudents);
      setSettings(schoolSettings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load staff dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "active"),
    [assignments],
  );

  const departments = useMemo(
    () => new Set(activeAssignments.map((assignment) => assignment.department_id)).size,
    [activeAssignments],
  );

  const levels = useMemo(
    () => new Set(activeAssignments.map((assignment) => assignment.level_id)).size,
    [activeAssignments],
  );

  const summaryCards = [
    { label: "Assigned Courses", value: activeAssignments.length, icon: "C", accent: "bg-light-green" },
    { label: "Departments", value: departments, icon: "D", accent: "bg-skyblue" },
    { label: "Levels", value: levels, icon: "L", accent: "bg-yellow" },
    { label: "Dept. Students", value: students.length, icon: "S", accent: "bg-violet-blue" },
  ];

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Staff Dashboard</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>Staff Dashboard</li>
        </ul>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row mb-3">
        <div className="col-12">
          <div className="alert alert-secondary dashboard-context-alert" role="status">
            <div>
              <strong>Current Session:</strong> {settings?.current_session?.name ?? "Not set"}
            </div>
            <div>
              <strong>Current Semester:</strong> {settings?.current_semester?.name ?? "Not set"}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {summaryCards.map((card) => (
          <div className="col-lg-3 col-md-6 col-12" key={card.label}>
            <div className={`dashboard-summery-one ${card.accent}`}>
              <div className="dashboard-summary-content">
                <div className="item-icon">{card.icon}</div>
                <div>
                  <div className="item-number">{loading ? "..." : card.value}</div>
                  <div className="item-title">{card.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card height-auto">
          <div className="card-body text-muted">Loading staff dashboard...</div>
        </div>
      ) : (
        <>
        <div className="row mt-4">
          <div className="col-xl-4 col-lg-5 col-12">
            <div className="card height-auto">
              <div className="card-body">
                <div className="heading-layout1">
                  <div className="item-title">
                    <h3>Staff Profile</h3>
                  </div>
                </div>
                <ul className="staff-profile-list">
                  <li>
                    <span>Name</span>
                    <strong>{staffProfile?.full_name ?? user?.name ?? "Not set"}</strong>
                  </li>
                  <li>
                    <span>Email</span>
                    <strong>{staffProfile?.email ?? user?.email ?? "Not set"}</strong>
                  </li>
                  <li>
                    <span>Staff ID</span>
                    <strong>{formatValue(staffProfile?.staff_id)}</strong>
                  </li>
                  <li>
                    <span>Department</span>
                    <strong>{formatValue(staffProfile?.department?.name)}</strong>
                  </li>
                  <li>
                    <span>Phone</span>
                    <strong>{formatValue(staffProfile?.phone)}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-xl-8 col-lg-7 col-12">
            <div className="card height-auto">
              <div className="card-body">
                <div className="heading-layout1">
                  <div className="item-title">
                    <h3>Assigned Courses</h3>
                  </div>
                  <Link href="/cbt/admin" className="btn btn-sm btn-outline-primary">
                    Manage Assessments
                  </Link>
                </div>
                {activeAssignments.length === 0 ? (
                  <div className="alert alert-info mb-0" role="alert">
                    No courses have been assigned to you yet. Please contact your administrator if this is unexpected.
                  </div>
                ) : (
                  <div className="staff-assignment-grid">
                    {activeAssignments.map((assignment) => (
                      <div className="staff-assignment-card" key={assignment.id}>
                        <div className="staff-assignment-title">
                          <strong>{assignment.course?.code ?? "Course"}</strong>
                          <span>{assignment.course?.title ?? "Untitled course"}</span>
                        </div>
                        <div className="staff-assignment-meta">
                          <span>{assignment.department?.name ?? "Department not set"}</span>
                          <span>{assignment.level?.name ?? "Level not set"}</span>
                          <span>{assignment.semester?.name ?? "Semester not set"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row mt-4">
          <div className="col-12">
            <div className="card height-auto">
              <div className="card-body">
                <div className="heading-layout1">
                  <div className="item-title">
                    <h3>Students — {staffProfile?.department?.name ?? "Your Department"}</h3>
                  </div>
                  <Link href="/cbt/admin" className="btn btn-sm btn-outline-primary">
                    CBT Management
                  </Link>
                </div>
                {!staffProfile?.department_id ? (
                  <div className="alert alert-warning mb-0" role="alert">
                    No department assigned to your profile. Contact your administrator.
                  </div>
                ) : students.length === 0 ? (
                  <div className="alert alert-info mb-0" role="alert">
                    No students found in your department.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Matric No.</th>
                          <th>Level</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id}>
                            <td>{student.name}</td>
                            <td>{student.matric_no ?? "—"}</td>
                            <td>{student.level?.name ?? "—"}</td>
                            <td>
                              <span className={`badge ${student.status === "active" ? "bg-success" : "bg-secondary"}`}>
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </>
  );
}
