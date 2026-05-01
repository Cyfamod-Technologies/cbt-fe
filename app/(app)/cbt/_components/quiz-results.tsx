"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAssessmentAttempt, listAssessmentAttempts, type AssessmentAttempt } from "@/lib/cbt";
import { Pagination } from "@/app/_components/Pagination";

const RESULTS_PAGE_SIZE = 15;
import { formatDateTime, formatResultScore, statusBadgeClass } from "./cbt-utils";

interface QuizResultsProps {
  assessmentId?: number;
  attemptId?: number;
  review?: boolean;
}

export function QuizResults({ assessmentId, attemptId, review }: QuizResultsProps) {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    grade: "all",
    from: "",
    to: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (attemptId) {
          setAttempt(await getAssessmentAttempt(attemptId));
        } else {
          setAttempts(await listAssessmentAttempts(assessmentId));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load results.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assessmentId, attemptId]);

  const title = useMemo(() => {
    if (attemptId) {
      return review ? "Review Answers" : "Quiz Result";
    }
    return assessmentId ? "Quiz Results" : "Attempt History";
  }, [assessmentId, attemptId, review]);

  const filteredAttempts = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const from = filters.from ? new Date(filters.from).getTime() : null;
    const to = filters.to ? new Date(filters.to).getTime() : null;

    return attempts.filter((item) => {
      const haystack = [
        item.assessment?.title,
        item.assessment?.code,
        item.student?.name,
        item.student?.matric_no,
        item.grade,
        item.status,
      ].filter(Boolean).join(" ").toLowerCase();

      if (search && !haystack.includes(search)) {
        return false;
      }

      if (filters.status !== "all" && item.status !== filters.status) {
        return false;
      }

      if (filters.grade !== "all" && (item.grade || "none") !== filters.grade) {
        return false;
      }

      const traceDate = item.end_time || item.start_time;
      const traceTime = traceDate ? new Date(traceDate).getTime() : null;
      if (from && (!traceTime || traceTime < from)) {
        return false;
      }
      if (to && (!traceTime || traceTime > to)) {
        return false;
      }

      return true;
    });
  }, [attempts, filters]);

  const [resultsPage, setResultsPage] = useState(1);
  const resultsTotalPages = Math.ceil(filteredAttempts.length / RESULTS_PAGE_SIZE);
  const paginatedAttempts = filteredAttempts.slice((resultsPage - 1) * RESULTS_PAGE_SIZE, resultsPage * RESULTS_PAGE_SIZE);

  useEffect(() => { setResultsPage(1); }, [filteredAttempts.length]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{title}</h3>
        <ul>
          <li><Link href="/cbt">CBT</Link></li>
          <li>{title}</li>
        </ul>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="card"><div className="card-body">Loading results...</div></div>
      ) : attemptId ? (
        <div className="card">
          <div className="card-body">
            {!attempt ? (
              <div className="alert alert-secondary">Result not found.</div>
            ) : (
              <>
                <div className="heading-layout1">
                  <div className="item-title">
                    <h3>{attempt.assessment?.title || `Attempt #${attempt.id}`}</h3>
                    <div className="text-muted small">{formatDateTime(attempt.end_time || attempt.start_time)}</div>
                  </div>
                  <span className={statusBadgeClass(attempt.grade || attempt.status)}>{attempt.grade || attempt.status}</span>
                </div>
                <div className="cbt-result-score">{formatResultScore(attempt)}</div>
                {review && (
                  <div className="cbt-question-list">
                    {(attempt.assessment?.questions || []).map((question, index) => {
                      const answer = attempt.answers?.find((item) => item.question_id === question.id);
                      return (
                        <div className="cbt-question-item" key={question.id}>
                          <div className="cbt-question-title">
                            <span>{index + 1}. {question.question_text}</span>
                            <span className={answer?.is_correct ? "badge badge-success" : "badge badge-danger"}>
                              {answer?.marks_awarded ?? 0} / {question.marks}
                            </span>
                          </div>
                          <div className="text-muted small">Your answer: {answer?.answer_text || answer?.option_id || "Not answered"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="cbt-result-filter">
              <div className="form-group">
                <label>Search student or quiz</label>
                <input
                  className="form-control"
                  placeholder="Name, matric no, quiz title"
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="in_progress">In progress</option>
                  <option value="submitted">Submitted</option>
                </select>
              </div>
              <div className="form-group">
                <label>Grade</label>
                <select className="form-control" value={filters.grade} onChange={(event) => updateFilter("grade", event.target.value)}>
                  <option value="all">All grades</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="none">No grade</option>
                </select>
              </div>
              <div className="form-group">
                <label>From date/time</label>
                <input className="form-control" type="datetime-local" value={filters.from} onChange={(event) => updateFilter("from", event.target.value)} />
              </div>
              <div className="form-group">
                <label>To date/time</label>
                <input className="form-control" type="datetime-local" value={filters.to} onChange={(event) => updateFilter("to", event.target.value)} />
              </div>
              <div className="form-group cbt-filter-actions">
                <label>&nbsp;</label>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setFilters({ search: "", status: "all", grade: "all", from: "", to: "" })}>
                  Reset
                </button>
              </div>
            </div>
            <div className="text-muted small mg-b-20">
              Showing {filteredAttempts.length} of {attempts.length} attempt(s).
            </div>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Quiz</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAttempts.length === 0 ? (
                    <tr><td colSpan={6}>No results found.</td></tr>
                  ) : (
                    paginatedAttempts.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="font-weight-bold text-dark">{item.assessment?.title || `Assessment #${item.assessment_id}`}</div>
                          <div className="text-muted small">{item.assessment?.code || "-"}</div>
                        </td>
                        <td>
                          <div className="font-weight-bold text-dark">{item.student?.name || `Student #${item.student_id}`}</div>
                          <div className="text-muted small">{item.student?.matric_no || "-"}</div>
                        </td>
                        <td><span className={statusBadgeClass(item.status)}>{item.status}</span></td>
                        <td>{formatResultScore(item)}</td>
                        <td>{formatDateTime(item.end_time)}</td>
                        <td>
                          <div className="cbt-actions">
                            <Link className="btn btn-sm btn-outline-secondary" href={`/cbt/results/${item.id}`}>View</Link>
                            <Link className="btn btn-sm btn-outline-secondary" href={`/cbt/results/${item.id}/review`}>Review</Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={resultsPage}
              totalPages={resultsTotalPages}
              totalItems={filteredAttempts.length}
              pageSize={RESULTS_PAGE_SIZE}
              onPageChange={setResultsPage}
            />
          </div>
        </div>
      )}
    </>
  );
}
