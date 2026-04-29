"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAssessmentAttempt, listAssessmentAttempts, type AssessmentAttempt } from "@/lib/cbt";
import { formatDateTime, formatResultScore, statusBadgeClass } from "./cbt-utils";

interface QuizResultsProps {
  assessmentId?: number;
  attemptId?: number;
  review?: boolean;
}

export function QuizResults({ assessmentId, attemptId, review }: QuizResultsProps) {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
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
                  {attempts.length === 0 ? (
                    <tr><td colSpan={6}>No results found.</td></tr>
                  ) : (
                    attempts.map((item) => (
                      <tr key={item.id}>
                        <td>{item.assessment?.title || `Assessment #${item.assessment_id}`}</td>
                        <td>{item.student?.name || `Student #${item.student_id}`}</td>
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
          </div>
        </div>
      )}
    </>
  );
}
