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
  type SchoolSettings,
} from "@/lib/academic";

const workflowRows = [
  ["Foundation", "Auth, roles, current user, API client", "Done"],
  ["Catalog", "Sessions, semesters, departments, levels, courses", "In progress"],
  ["Question Workflow", "Create, export, import, review, approve", "Planned"],
  ["Exam Workflow", "Schedule, register students, attempt lifecycle", "Planned"],
  ["Results", "Score, publish, review according to settings", "Planned"],
] as const;

export default function DashboardPage() {
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
                <span className="badge badge-info">V1.1</span>
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

          <div className="card height-auto" id="questions">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Build Workflow</h3>
                </div>
              </div>
              <SimpleTable headers={["Phase", "Scope", "Status"]} rows={workflowRows.map((row) => [...row])} />
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

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
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
          {rows.map((row, index) => (
            <tr key={`${row.join("-")}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
