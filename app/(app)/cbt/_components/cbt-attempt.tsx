"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAssessmentAttempt,
  startAssessmentAttempt,
  submitAssessmentAttempt,
  type AssessmentAttempt,
  type AssessmentQuestion,
} from "@/lib/cbt";

interface CbtAttemptProps {
  assessmentId: number;
}

type AnswerState = Record<number, { optionIds: number[]; answerText: string }>;

function answerCount(answers: AnswerState) {
  return Object.values(answers).filter((answer) => answer.optionIds.length > 0 || answer.answerText.trim()).length;
}

export function CbtAttempt({ assessmentId }: CbtAttemptProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAttempt = async () => {
      setLoading(true);
      setError(null);

      try {
        const started = await startAssessmentAttempt(assessmentId);
        const loaded = await getAssessmentAttempt(started.id);
        setAttempt(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to open this assessment.");
      } finally {
        setLoading(false);
      }
    };

    void loadAttempt();
  }, [assessmentId]);

  const questions = useMemo(() => attempt?.assessment?.questions || [], [attempt]);
  const answered = answerCount(answers);

  const setSingleOption = (question: AssessmentQuestion, optionId: number) => {
    setAnswers((current) => ({
      ...current,
      [question.id]: { optionIds: [optionId], answerText: "" },
    }));
  };

  const toggleOption = (question: AssessmentQuestion, optionId: number) => {
    setAnswers((current) => {
      const existing = current[question.id]?.optionIds || [];
      const optionIds = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];

      return {
        ...current,
        [question.id]: { optionIds, answerText: "" },
      };
    });
  };

  const setTextAnswer = (question: AssessmentQuestion, answerText: string) => {
    setAnswers((current) => ({
      ...current,
      [question.id]: { optionIds: [], answerText },
    }));
  };

  const handleSubmit = async () => {
    if (!attempt) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submitted = await submitAssessmentAttempt(attempt.id, {
        answers: questions.map((question) => ({
          question_id: question.id,
          option_ids: answers[question.id]?.optionIds || [],
          answer_text: answers[question.id]?.answerText || "",
        })),
      });

      setAttempt(submitted);
      router.push("/cbt/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Loading assessment...</div>
      </div>
    );
  }

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{attempt?.assessment?.title || "Assessment"}</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/cbt">CBT</Link>
          </li>
          <li>Take Assessment</li>
        </ul>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!attempt ? (
        <div className="alert alert-secondary">Assessment attempt was not found.</div>
      ) : attempt.status !== "in_progress" ? (
        <div className="card">
          <div className="card-body">
            <h3>This attempt has already been submitted.</h3>
            <p className="text-muted">Check your CBT history for the result.</p>
            <Link href="/cbt/history" className="btn btn-primary">
              View History
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-body cbt-attempt-header">
              <div>
                <strong>{attempt.assessment?.code}</strong>
                <div className="text-muted small">
                  {answered} of {questions.length} answered
                </div>
              </div>
              <button type="button" className="btn btn-primary" disabled={submitting || questions.length === 0} onClick={handleSubmit}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="alert alert-warning">This assessment has no questions yet.</div>
          ) : (
            questions.map((question, index) => (
              <div className="card" key={question.id}>
                <div className="card-body">
                  <div className="cbt-question-title">
                    <span>Question {index + 1}</span>
                    <span className="badge badge-info">{question.marks} mark(s)</span>
                  </div>
                  <p>{question.question_text}</p>

                  {question.question_type === "short_answer" ? (
                    <textarea
                      className="form-control"
                      rows={3}
                      value={answers[question.id]?.answerText || ""}
                      onChange={(event) => setTextAnswer(question, event.target.value)}
                    />
                  ) : (
                    <div className="cbt-option-list">
                      {question.options.map((option) => {
                        const selected = answers[question.id]?.optionIds.includes(option.id) || false;
                        const multi = question.question_type === "multiple_select";

                        return (
                          <label key={option.id} className={`cbt-option ${selected ? "selected" : ""}`}>
                            <input
                              type={multi ? "checkbox" : "radio"}
                              name={`question-${question.id}`}
                              checked={selected}
                              onChange={() => (multi ? toggleOption(question, option.id) : setSingleOption(question, option.id))}
                            />
                            <span>{option.option_text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </>
  );
}
