"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteAssessment, listAssessments, publishAssessment, closeAssessment, type Assessment } from "@/lib/cbt";
import { assessmentSubject, statusBadgeClass } from "./cbt-utils";

type FilterStatus = "all" | "draft" | "published" | "closed";

export function QuizAdminDashboard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAssessments(await listAssessments());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(
    () => ({
      total: assessments.length,
      draft: assessments.filter((assessment) => assessment.status === "draft").length,
      published: assessments.filter((assessment) => assessment.status === "published").length,
      closed: assessments.filter((assessment) => assessment.status === "closed").length,
    }),
    [assessments],
  );

  const filtered = filter === "all" ? assessments : assessments.filter((assessment) => assessment.status === filter);

  const updateStatus = async (assessment: Assessment, action: "publish" | "close") => {
    setBusyId(assessment.id);
    try {
      if (action === "publish") {
        await publishAssessment(assessment.id);
      } else {
        await closeAssessment(assessment.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update assessment.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (assessment: Assessment) => {
    if (!confirm(`Delete "${assessment.title}"?`)) {
      return;
    }

    setBusyId(assessment.id);
    try {
      await deleteAssessment(assessment.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete assessment.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area quiz-fade-up">
        <h3>Assessment Management</h3>
        <ul>
          <li>
            <Link href="/cbt">CBT</Link>
          </li>
          <li>Assessment Management</li>
        </ul>
      </div>

      <div className="row gutters-20 quiz-fade-up quiz-fade-up-delay-1">
        {[
          ["Total Assessments", stats.total, "bg-skyblue"],
          ["Draft", stats.draft, "bg-yellow"],
          ["Published", stats.published, "bg-light-green"],
          ["Closed", stats.closed, "bg-violet-blue"],
        ].map(([label, value, color]) => (
          <div className="col-lg-3 col-md-6 col-12" key={label}>
            <div className={`dashboard-summery-one ${color}`}>
              <div className="item-title">{label}</div>
              <div className="item-number">{value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card height-auto quiz-fade-up quiz-fade-up-delay-2">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>All Assessments</h3>
            </div>
            <div className="cbt-actions">
              <Link href="/cbt/question-bank" className="btn-fill-lg bg-blue-dark btn-hover-yellow">
                Question Bank
              </Link>
              <Link href="/cbt/admin/live" className="btn-fill-lg bg-blue-dark btn-hover-yellow">
                Live Monitor
              </Link>
              <Link href="/cbt/admin/create" className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark">
                + Create New Assessment
              </Link>
            </div>
          </div>

          <div className="cbt-filter-row">
            {(["all", "draft", "published", "closed"] as const).map((status) => (
              <button type="button" key={status} className={`cbt-filter ${filter === status ? "active" : ""}`} onClick={() => setFilter(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)} ({status === "all" ? stats.total : stats[status]})
              </button>
            ))}
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Questions</th>
                  <th>Pass Mark</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>Loading assessments...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No assessments found for this filter.</td>
                  </tr>
                ) : (
                  filtered.map((assessment) => (
                    <tr key={assessment.id}>
                      <td>
                        <div className="font-weight-bold text-dark">{assessment.title}</div>
                        <div className="text-muted small">{assessmentSubject(assessment)}</div>
                      </td>
                      <td>{assessment.duration_minutes || 0} min</td>
                      <td>{assessment.questions_count ?? assessment.total_questions ?? 0}</td>
                      <td>{assessment.pass_mark ?? 0}</td>
                      <td>
                        <span className={statusBadgeClass(assessment.status)}>{assessment.status}</span>
                      </td>
                      <td>
                        <div className="cbt-actions">
                          <Link className="btn btn-sm btn-outline-secondary" href={`/cbt/admin/${assessment.id}/questions`}>
                            Questions
                          </Link>
                          <Link className="btn btn-sm btn-outline-secondary" href={`/cbt/admin/${assessment.id}/results`}>
                            Results
                          </Link>
                          <Link className="btn btn-sm btn-outline-secondary" href={`/cbt/admin/${assessment.id}/edit`}>
                            Edit
                          </Link>
                          {assessment.status !== "published" && (
                            <button type="button" className="btn btn-sm btn-primary" disabled={busyId === assessment.id} onClick={() => updateStatus(assessment, "publish")}>
                              Publish
                            </button>
                          )}
                          {assessment.status === "published" && (
                            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busyId === assessment.id} onClick={() => updateStatus(assessment, "close")}>
                              Close
                            </button>
                          )}
                          <button type="button" className="btn btn-sm btn-danger" disabled={busyId === assessment.id} onClick={() => remove(assessment)}>
                            Delete
                          </button>
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
