"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StudentAuthProvider, useStudentAuth } from "@/contexts/StudentAuthContext";
import { studentFetch } from "@/lib/studentAuth";
import type { Assessment, AssessmentQuestion } from "@/lib/cbt";

interface Answer {
  questionId: number;
  selectedOption?: number;
  selectedOptions?: number[];
  answerText?: string;
}

function TakeInner() {
  const params = useParams();
  const router = useRouter();
  const { student, loading: authLoading } = useStudentAuth();
  const assessmentId = Number(params.assessmentId);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<number, Answer>>(new Map());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const submitCalledRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!student) { router.push(`/access/login?next=/access/${assessmentId}/take`); return; }

    (async () => {
      try {
        setLoading(true);
        const [asmtRes, qRes, attemptRes] = await Promise.all([
          studentFetch<{ data: Assessment }>(`/api/v1/assessments/${assessmentId}`),
          studentFetch<{ data: AssessmentQuestion[] }>(`/api/v1/assessments/${assessmentId}/questions`),
          studentFetch<{ data: { id: number; start_time: string } }>(`/api/v1/assessments/${assessmentId}/attempts`, { method: "POST", body: JSON.stringify({}) }),
        ]);
        setAssessment(asmtRes.data);
        setQuestions(qRes.data ?? []);
        setAttemptId(attemptRes.data.id);

        // Calculate remaining time from server start_time so refreshing never resets the clock
        const startMs = new Date(attemptRes.data.start_time).getTime();
        const durationMs = (asmtRes.data.duration_minutes ?? 45) * 60 * 1000;
        const remaining = Math.max(0, Math.floor((startMs + durationMs - Date.now()) / 1000));
        setTimeLeft(remaining);

        // Restore any answers saved to localStorage for this attempt
        try {
          const saved = localStorage.getItem(`cbt_answers_${attemptRes.data.id}`);
          if (saved) {
            setAnswers(new Map(JSON.parse(saved) as [number, Answer][]));
          }
        } catch { /* ignore corrupt storage */ }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, student, assessmentId, router]);

  // Persist answers to localStorage whenever they change
  useEffect(() => {
    if (!attemptId || answers.size === 0) return;
    try {
      localStorage.setItem(`cbt_answers_${attemptId}`, JSON.stringify([...answers]));
    } catch { /* ignore storage errors */ }
  }, [answers, attemptId]);

  const submitQuiz = useCallback(async () => {
    if (!attemptId || submitCalledRef.current) return;
    submitCalledRef.current = true;
    setSubmitting(true);
    try {
      const answersArray = questions.map((q) => {
        const ans = answers.get(q.id);
        if (!ans) return { question_id: q.id };
        if (q.question_type === "multiple_select") {
          return { question_id: q.id, option_ids: ans.selectedOptions ?? [] };
        }
        if (q.question_type === "short_answer") {
          return { question_id: q.id, answer_text: ans.answerText ?? "" };
        }
        return { question_id: q.id, option_ids: ans.selectedOption !== undefined ? [ans.selectedOption] : [] };
      });
      await studentFetch(`/api/v1/assessment-attempts/${attemptId}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: answersArray }),
      });
      try { localStorage.removeItem(`cbt_answers_${attemptId}`); } catch { /* ignore */ }
      router.push(`/access/results/${attemptId}`);
    } catch (e) {
      submitCalledRef.current = false;
      setError(e instanceof Error ? e.message : "Failed to submit.");
      setSubmitting(false);
    }
  }, [attemptId, questions, answers, router]);

  // Countdown timer — just counts down, no submit logic inside
  useEffect(() => {
    if (timeLeft <= 0 || !attemptId) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [timeLeft, attemptId]);

  // Auto-submit when time reaches 0 — handles both live countdown and expired-on-load
  useEffect(() => {
    if (timeLeft !== 0 || !attemptId || questions.length === 0) return;
    void submitQuiz();
  }, [timeLeft, attemptId, questions.length, submitQuiz]);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  };

  const setAnswer = (ans: Answer) => setAnswers((prev) => new Map(prev.set(ans.questionId, ans)));

  if (authLoading || loading) {
    return <div className="d-flex align-items-center justify-content-center min-vh-100"><div className="spinner-border" /></div>;
  }
  if (error || !assessment || questions.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <p className="mb-3" style={{ color: "#e4572e" }}>{error ?? "No questions found for this assessment."}</p>
          <button onClick={() => router.push("/access")} className="btn btn-primary">Back to Assessments</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const cur = answers.get(q.id);
  const answered = answers.size;
  const pct = Math.round((answered / questions.length) * 100);
  const typeLabel = q.question_type.replace(/_/g, " ");

  return (
    <div className="cbt-take">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Space+Grotesk:wght@400;500;600&display=swap');
        .cbt-take{--cbt-ink:#1a1a1a;--cbt-muted:#525760;--cbt-accent:#e4572e;--cbt-accent-2:#2a9d8f;
          --cbt-card:#ffffff;--cbt-border:#e7e1d9;--cbt-shadow:0 18px 40px rgba(18,24,38,.12);
          min-height:100vh;background:radial-gradient(circle at top right,#fff1da 0%,#f2f6ff 45%,#f7efe4 100%);
          color:var(--cbt-ink);font-family:'Space Grotesk','Trebuchet MS',sans-serif;padding:28px 20px 60px;}
        .cbt-shell{max-width:1200px;margin:0 auto;}
        .cbt-header{border-radius:26px;background:linear-gradient(135deg,#ff9d00ff 0%,#f2d39a 45%,#d7e8ff 100%);
          padding:24px 28px;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,.9fr);
          gap:24px;box-shadow:var(--cbt-shadow);position:relative;overflow:hidden;
          border:1px solid rgba(105,69,69,.08);}
        .cbt-header::before{content:'';position:absolute;inset:0;
          background:radial-gradient(circle at 15% 10%,rgba(255,255,255,.4),transparent 55%);pointer-events:none;}
        .cbt-header h1{font-family:'Fraunces','Times New Roman',serif;font-size:clamp(28px,3.2vw,42px);
          margin-bottom:8px;color:#151515;}
        .cbt-kicker{text-transform:uppercase;letter-spacing:.18em;font-size:11px;font-weight:600;color:#2f343a;}
        .cbt-subline{display:flex;flex-wrap:wrap;gap:10px;align-items:center;color:#2f343a;font-weight:500;}
        .cbt-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;
          background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.9);font-size:12px;
          font-weight:600;text-transform:uppercase;}
        .cbt-header__right{background:rgba(255,255,255,.82);border-radius:20px;padding:18px;
          border:1px solid rgba(255,255,255,.95);display:grid;gap:14px;align-content:start;}
        .cbt-timer{display:flex;align-items:center;gap:10px;font-weight:600;white-space:nowrap;}
        .cbt-timer__label{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--cbt-muted);}
        .cbt-timer__value{font-size:26px;color:var(--cbt-accent);letter-spacing:-.01em;}
        .cbt-progress__bar{height:8px;border-radius:999px;background:#efe8dd;overflow:hidden;}
        .cbt-progress__bar span{display:block;height:100%;border-radius:inherit;
          background:linear-gradient(90deg,var(--cbt-accent),var(--cbt-accent-2));}
        .cbt-progress__meta{display:flex;justify-content:space-between;font-size:13px;color:var(--cbt-muted);}
        .cbt-card{background:var(--cbt-card);border-radius:20px;padding:18px 20px;
          border:1px solid var(--cbt-border);box-shadow:0 14px 30px rgba(18,24,38,.08);}
        .cbt-student-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;}
        .cbt-info-item span{display:block;font-size:12px;text-transform:uppercase;
          letter-spacing:.04em;color:var(--cbt-muted);margin-bottom:4px;}
        .cbt-info-item strong{font-size:16px;}
        .cbt-layout{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1.2fr);gap:22px;margin-top:22px;}
        .cbt-question-title{font-size:22px;font-weight:600;margin-top:10px;margin-bottom:6px;}
        .cbt-question-top{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;}
        .cbt-question-tags{display:flex;gap:8px;flex-wrap:wrap;}
        .cbt-tag{padding:6px 12px;border-radius:999px;background:rgba(42,157,143,.14);
          color:#1f756d;font-size:12px;font-weight:600;text-transform:uppercase;}
        .cbt-tag--muted{background:rgba(228,87,46,.14);color:#8f3a20;}
        .cbt-answer-block{margin-top:20px;display:grid;gap:12px;}
        .cbt-option{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;
          padding:14px 16px;border-radius:16px;border:1px solid var(--cbt-border);background:#fffdfb;
          cursor:pointer;transition:border-color 150ms ease,box-shadow 150ms ease,transform 150ms ease;}
        .cbt-option input{width:18px;height:18px;appearance:none;border:2px solid #cfc7bd;
          border-radius:50%;display:inline-grid;place-content:center;margin:0;}
        .cbt-option input[type='checkbox']{border-radius:6px;}
        .cbt-option input::before{content:'';width:8px;height:8px;transform:scale(0);
          transition:transform 120ms ease;border-radius:inherit;background:var(--cbt-accent);}
        .cbt-option input:checked::before{transform:scale(1);}
        .cbt-option.is-selected{border-color:rgba(228,87,46,.6);
          box-shadow:0 12px 24px rgba(228,87,46,.12);transform:translateY(-1px);}
        .cbt-option__text{font-size:15px;color:var(--cbt-ink);}
        .cbt-textarea{width:100%;border-radius:16px;padding:14px;border:1px solid var(--cbt-border);
          font-family:inherit;}
        .cbt-textarea:focus{outline:none;border-color:rgba(228,87,46,.5);
          box-shadow:0 0 0 3px rgba(228,87,46,.16);}
        .cbt-nav{display:flex;flex-wrap:wrap;gap:12px;border-top:1px solid #efe7dd;
          padding-top:18px;margin-top:24px;align-items:center;}
        .cbt-btn{border-radius:999px;padding:10px 18px;font-weight:600;border:1px solid transparent;
          transition:transform 150ms ease,box-shadow 150ms ease;}
        .cbt-btn--ghost{border-color:#d9d1c7;background:#fff;color:var(--cbt-ink);}
        .cbt-btn--primary{background:var(--cbt-ink);color:#fff;}
        .cbt-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;}
        .cbt-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(18,24,38,.18);}
        .cbt-sidebar{position:sticky;top:24px;align-self:start;}
        .cbt-palette{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:12px;}
        .cbt-palette__btn{border:none;border-radius:10px;padding:8px 0;font-weight:600;font-size:13px;
          cursor:pointer;transition:transform 150ms ease,box-shadow 150ms ease;}
        .cbt-palette__btn.is-active{background:var(--cbt-ink);color:#fff;
          box-shadow:0 10px 20px rgba(18,24,38,.2);}
        .cbt-palette__btn.is-answered{background:rgba(42,157,143,.18);color:#1a6d64;}
        .cbt-palette__btn.is-unanswered{background:#f0e9e0;color:#6b6f76;}
        .cbt-legend{display:grid;gap:8px;margin-top:16px;font-size:13px;color:var(--cbt-muted);}
        .cbt-legend span{display:inline-flex;align-items:center;gap:8px;}
        .cbt-legend i{width:10px;height:10px;border-radius:50%;display:inline-block;}
        .cbt-modal{position:fixed;inset:0;background:rgba(16,18,22,.55);display:grid;
          place-items:center;padding:20px;z-index:50;}
        .cbt-modal__card{max-width:420px;width:100%;background:#fff;border-radius:20px;
          padding:24px;box-shadow:0 24px 50px rgba(18,24,38,.2);}
        .cbt-fade{animation:cbt-fade 600ms ease both;}
        .cbt-delay-1{animation-delay:120ms;}.cbt-delay-2{animation-delay:240ms;}.cbt-delay-3{animation-delay:360ms;}
        @keyframes cbt-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:980px){.cbt-header,.cbt-layout{grid-template-columns:1fr;}
          .cbt-sidebar{position:static;}}
      `}</style>

      <div className="cbt-shell">
        <header className="cbt-header cbt-fade">
          <div>
            <div className="cbt-kicker">CBT Session</div>
            <h1>{assessment.title}</h1>
            <div className="cbt-subline">
              <span className="cbt-pill">{assessment.course?.title ?? assessment.department?.name ?? "General"}</span>
              <span>Question {currentIdx + 1} of {questions.length}</span>
            </div>
          </div>
          <div className="cbt-header__right">
            <div className="cbt-timer">
              <span className="cbt-timer__label">Time left</span>
              <span className="cbt-timer__value">{fmtTime(timeLeft)}</span>
            </div>
            <div>
              <div className="cbt-progress__bar"><span style={{ width: `${pct}%` }} /></div>
              <div className="cbt-progress__meta"><span>{answered} answered</span><span>{questions.length - answered} remaining</span></div>
            </div>
          </div>
        </header>

        <section className="cbt-card cbt-fade cbt-delay-1" style={{ marginTop: "18px" }}>
          <div className="cbt-student-grid">
            <div className="cbt-info-item"><span>Matric No</span><strong>{student?.matric_no ?? "—"}</strong></div>
            <div className="cbt-info-item"><span>Student</span><strong>{student?.name.split(" ")[0] ?? "—"}</strong></div>
            <div className="cbt-info-item"><span>Department</span><strong>{student?.department?.name ?? "—"}</strong></div>
            <div className="cbt-info-item"><span>Level</span><strong>{student?.level?.name ?? "—"}</strong></div>
          </div>
        </section>

        <div className="cbt-layout">
          <main className="cbt-card cbt-fade cbt-delay-2">
            <div className="cbt-question-top">
              <div>
                <div className="cbt-kicker">Question {currentIdx + 1}</div>
                <div className="cbt-question-title">{q.question_text}</div>
              </div>
              <div className="cbt-question-tags">
                <span className="cbt-tag">{Number(q.marks)} marks</span>
                <span className="cbt-tag cbt-tag--muted">{typeLabel}</span>
              </div>
            </div>

            {(q.question_type === "multiple_choice" || q.question_type === "true_false") && (
              <div className="cbt-answer-block">
                {q.options.map((opt) => {
                  const sel = cur?.selectedOption === opt.id;
                  return (
                    <label key={opt.id} className={`cbt-option ${sel ? "is-selected" : ""}`}>
                      <input type="radio" name={`q-${q.id}`} value={opt.id} checked={sel}
                        onChange={() => setAnswer({ questionId: q.id, selectedOption: opt.id })} />
                      <span className="cbt-option__text">{opt.option_text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.question_type === "multiple_select" && (
              <div className="cbt-answer-block">
                {q.options.map((opt) => {
                  const sel = cur?.selectedOptions?.includes(opt.id) ?? false;
                  return (
                    <label key={opt.id} className={`cbt-option ${sel ? "is-selected" : ""}`}>
                      <input type="checkbox" value={opt.id} checked={sel}
                        onChange={(e) => {
                          const s = new Set(cur?.selectedOptions ?? []);
                          e.target.checked ? s.add(opt.id) : s.delete(opt.id);
                          setAnswer({ questionId: q.id, selectedOptions: Array.from(s) });
                        }} />
                      <span className="cbt-option__text">{opt.option_text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.question_type === "short_answer" && (
              <textarea value={cur?.answerText ?? ""} rows={6} className="cbt-textarea"
                placeholder="Enter your answer here..."
                onChange={(e) => setAnswer({ questionId: q.id, answerText: e.target.value })} />
            )}

            <div className="cbt-nav">
              <button onClick={() => setCurrentIdx((i) => i - 1)} disabled={currentIdx === 0} className="cbt-btn cbt-btn--ghost">Previous</button>
              <button onClick={() => setCurrentIdx((i) => i + 1)} disabled={currentIdx === questions.length - 1} className="cbt-btn cbt-btn--ghost">Next</button>
              <button onClick={() => setShowConfirm(true)} className="cbt-btn cbt-btn--primary" style={{ marginLeft: "auto" }} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit assessment"}
              </button>
            </div>
          </main>

          <aside className="cbt-card cbt-sidebar cbt-fade cbt-delay-3">
            <div className="cbt-kicker">Question map</div>
            <div className="cbt-question-title" style={{ fontSize: "18px" }}>{answered}/{questions.length} answered</div>
            <div className="cbt-palette">
              {questions.map((qItem, i) => (
                <button key={qItem.id} onClick={() => setCurrentIdx(i)}
                  className={`cbt-palette__btn ${i === currentIdx ? "is-active" : answers.has(qItem.id) ? "is-answered" : "is-unanswered"}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="cbt-legend">
              <span><i style={{ background: "#1a1a1a" }} /> Current</span>
              <span><i style={{ background: "#2a9d8f" }} /> Answered</span>
              <span><i style={{ background: "#d8d1c8" }} /> Unanswered</span>
            </div>
          </aside>
        </div>
      </div>

      {showConfirm && (
        <div className="cbt-modal">
          <div className="cbt-modal__card">
            <h2 className="cbt-question-title">Submit assessment?</h2>
            <p style={{ color: "#525760", marginBottom: "8px" }}>
              You have answered <strong>{answered}</strong> out of <strong>{questions.length}</strong> questions.
            </p>
            <p style={{ color: "#525760", marginBottom: "18px" }}>Once submitted, you cannot change your answers.</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowConfirm(false)} className="cbt-btn cbt-btn--ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={() => { setShowConfirm(false); void submitQuiz(); }} className="cbt-btn cbt-btn--primary" style={{ flex: 1 }}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TakeAssessmentPage() {
  return <StudentAuthProvider><TakeInner /></StudentAuthProvider>;
}
