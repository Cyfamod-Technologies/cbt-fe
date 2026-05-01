"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listAssessmentAttempts, type AssessmentAttempt } from "@/lib/cbt";
import { assessmentClass, assessmentSubject, formatDateTime } from "./cbt-utils";

const AUTO_REFRESH_MS = 30000;

function remainingSeconds(attempt: AssessmentAttempt, now: number) {
  const durationMinutes = Number(attempt.assessment?.duration_minutes || 0);
  if (!durationMinutes || !attempt.start_time) {
    return null;
  }

  const startedAt = new Date(attempt.start_time).getTime();
  if (Number.isNaN(startedAt)) {
    return null;
  }

  return Math.ceil((startedAt + durationMinutes * 60 * 1000 - now) / 1000);
}

function elapsedMinutes(attempt: AssessmentAttempt, now: number) {
  if (!attempt.start_time) {
    return "-";
  }

  const startedAt = new Date(attempt.start_time).getTime();
  if (Number.isNaN(startedAt)) {
    return "-";
  }

  return `${Math.max(0, Math.floor((now - startedAt) / 60000))} min`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "No time limit";
  }

  if (seconds <= 0) {
    return "Expired";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  }

  return `${minutes}m ${String(secs).padStart(2, "0")}s`;
}

function remainingClass(seconds: number | null) {
  if (seconds === null) {
    return "badge-info";
  }
  if (seconds <= 0) {
    return "badge-danger";
  }
  if (seconds <= 300) {
    return "badge-warning";
  }
  return "badge-success";
}

export function LiveMonitor() {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await listAssessmentAttempts();
      setAttempts(data.filter((attempt) => attempt.status === "in_progress"));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load live attempts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);

    const refreshTimer = window.setInterval(() => {
      void load(false);
    }, AUTO_REFRESH_MS);
    const tickTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearInterval(refreshTimer);
      window.clearInterval(tickTimer);
    };
  }, []);

  const stats = useMemo(() => {
    const expired = attempts.filter((attempt) => {
      const remaining = remainingSeconds(attempt, now);
      return remaining !== null && remaining <= 0;
    }).length;

    return {
      active: attempts.length,
      expiringSoon: attempts.filter((attempt) => {
        const remaining = remainingSeconds(attempt, now);
        return remaining !== null && remaining > 0 && remaining <= 300;
      }).length,
      expired,
    };
  }, [attempts, now]);

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Live CBT Monitor</h3>
        <ul>
          <li>
            <Link href="/cbt/admin">Quiz Management</Link>
          </li>
          <li>Live Monitor</li>
        </ul>
      </div>

      <div className="row gutters-20">
        <div className="col-lg-4 col-md-6 col-12">
          <div className="dashboard-summery-one bg-light-green">
            <div className="item-title">Currently Writing</div>
            <div className="item-number">{stats.active}</div>
          </div>
        </div>
        <div className="col-lg-4 col-md-6 col-12">
          <div className="dashboard-summery-one bg-yellow">
            <div className="item-title">5 Minutes or Less</div>
            <div className="item-number">{stats.expiringSoon}</div>
          </div>
        </div>
        <div className="col-lg-4 col-md-6 col-12">
          <div className="dashboard-summery-one bg-violet-blue">
            <div className="item-title">Expired</div>
            <div className="item-number">{stats.expired}</div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Students Currently Writing</h3>
              <div className="text-muted small">
                Auto-refreshes every 30 seconds. Timer updates every second.
                {lastUpdated ? ` Last updated ${lastUpdated.toLocaleTimeString()}.` : ""}
              </div>
            </div>
            <button type="button" className="btn btn-outline-secondary" onClick={() => load(true)} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Quiz</th>
                  <th>Class / Subject</th>
                  <th style={{ whiteSpace: "nowrap" }}>Started</th>
                  <th style={{ whiteSpace: "nowrap" }}>Elapsed</th>
                  <th style={{ whiteSpace: "nowrap" }}>Time Remaining</th>
                </tr>
              </thead>
              <tbody>
                {loading && attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Loading live attempts...</td>
                  </tr>
                ) : attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No student is currently writing.</td>
                  </tr>
                ) : (
                  attempts.map((attempt) => {
                    const remaining = remainingSeconds(attempt, now);
                    const assessment = attempt.assessment;

                    return (
                      <tr key={attempt.id} className={remaining !== null && remaining <= 0 ? "cbt-live-expired-row" : ""}>
                        <td>
                          <div className="font-weight-bold text-dark">{attempt.student?.name || `Student #${attempt.student_id}`}</div>
                          <div className="text-muted small">{attempt.student?.matric_no || "No matric number"}</div>
                        </td>
                        <td>
                          <div className="font-weight-bold text-dark">{assessment?.title || `Assessment #${attempt.assessment_id}`}</div>
                          <div className="text-muted small">{assessment?.code}</div>
                        </td>
                        <td>
                          <div>{assessment ? assessmentClass(assessment) : "-"}</div>
                          <div className="text-muted small">{assessment ? assessmentSubject(assessment) : "-"}</div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(attempt.start_time)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{elapsedMinutes(attempt, now)}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span className={`badge ${remainingClass(remaining)}`} style={{ fontSize: "0.85rem", padding: "4px 8px" }}>
                            {formatDuration(remaining)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
