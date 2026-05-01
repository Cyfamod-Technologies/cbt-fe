"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StudentAuthProvider, useStudentAuth } from "@/contexts/StudentAuthContext";
import { studentFetch } from "@/lib/studentAuth";
import type { AssessmentAttempt } from "@/lib/cbt";

const fmtDuration = (s: number | null) => {
  if (s === null || isNaN(s)) return "—";
  const safe = Math.max(0, s);
  const h = Math.floor(safe / 3600), m = Math.floor((safe % 3600) / 60), sec = safe % 60;
  return [h > 0 && `${h}h`, (m > 0 || h > 0) && `${m}m`, `${sec}s`].filter(Boolean).join(" ");
};

const fmtPct = (v: number | string | null | undefined) => {
  const n = typeof v === "number" ? v : Number(v);
  return isNaN(n) ? "0.0" : n.toFixed(1);
};

function ResultsInner() {
  const params = useParams();
  const router = useRouter();
  const { student, loading: authLoading, logout } = useStudentAuth();
  const attemptId = Number(params.attemptId);

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !student) return;
    studentFetch<{ data: AssessmentAttempt }>(`/api/v1/assessment-attempts/${attemptId}`)
      .then((r) => { setAttempt(r.data); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load results."))
      .finally(() => setLoading(false));
  }, [authLoading, student, attemptId]);

  const timeUsed = useMemo(() => {
    if (!attempt?.start_time) return null;
    const end = attempt.end_time ?? null;
    if (!end) return null;
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(attempt.start_time).getTime()) / 1000));
  }, [attempt]);

  const showScore = attempt?.assessment?.show_score ?? true;
  const allowReview = attempt?.assessment?.allow_review ?? false;

  const accuracy = useMemo(() => {
    if (!attempt) return 0;
    const answers = attempt.answers ?? [];
    if (answers.length === 0) return 0;
    const correct = answers.filter((a) => a.is_correct).length;
    return (correct / answers.length) * 100;
  }, [attempt]);

  const correctCount = useMemo(() => (attempt?.answers ?? []).filter((a) => a.is_correct).length, [attempt]);
  const attemptedCount = useMemo(() => (attempt?.answers ?? []).length, [attempt]);

  if (authLoading || loading) {
    return <div className="d-flex align-items-center justify-content-center min-vh-100"><div className="spinner-border" /></div>;
  }

  if (!student) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <p className="mb-3">Please log in to view results.</p>
          <button onClick={() => router.push("/access/login?next=/access")} className="btn btn-primary">Go to Login</button>
        </div>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="text-center">
          <p className="mb-3" style={{ color: "#e4572e" }}>{error ?? "Failed to load results."}</p>
          <button onClick={() => router.push("/access")} className="btn btn-primary">Back to Assessments</button>
        </div>
      </div>
    );
  }

  const firstName = student.name.split(" ")[0];
  const passed = attempt.grade === "pass";

  return (
    <div className="cbt-result">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Space+Grotesk:wght@400;500;600&display=swap');
        .cbt-result{--cbt-ink:#1a1a1a;--cbt-muted:#525760;--cbt-accent:#e4572e;--cbt-accent-2:#2a9d8f;
          --cbt-card:#ffffff;--cbt-border:#e7e1d9;--cbt-shadow:0 18px 40px rgba(18,24,38,.12);
          min-height:100vh;background:radial-gradient(circle at top right,#fff1da 0%,#f2f6ff 45%,#f7efe4 100%);
          color:var(--cbt-ink);font-family:'Space Grotesk','Trebuchet MS',sans-serif;padding:28px 20px 60px;}
        .cbt-result__shell{max-width:1100px;margin:0 auto;display:grid;gap:22px;}
        .cbt-result__hero{border-radius:26px;
          background:linear-gradient(135deg,#fef3dd 0%,#f8e4bb 45%,#e3f0ff 100%);
          padding:28px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);
          gap:20px;box-shadow:var(--cbt-shadow);}
        .cbt-result__hero h1{font-family:'Fraunces','Times New Roman',serif;
          font-size:clamp(28px,3.2vw,40px);margin-bottom:10px;}
        .cbt-result__kicker{text-transform:uppercase;letter-spacing:.16em;font-size:11px;
          font-weight:600;color:var(--cbt-muted);margin-bottom:6px;}
        .cbt-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;
          background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.9);font-size:12px;
          font-weight:600;text-transform:uppercase;}
        .cbt-pill--accent{background:rgba(228,87,46,.14);color:#8f3a20;}
        .cbt-pill--success{background:rgba(42,157,143,.15);color:#1f756d;}
        .cbt-card{background:var(--cbt-card);border-radius:20px;padding:18px 20px;
          border:1px solid var(--cbt-border);box-shadow:0 14px 30px rgba(18,24,38,.08);}
        .cbt-metrics{display:grid;gap:14px;align-content:start;}
        .cbt-metric{display:flex;justify-content:space-between;font-weight:600;color:var(--cbt-ink);}
        .cbt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;}
        .cbt-stat{background:#fffdfb;border-radius:16px;border:1px solid var(--cbt-border);padding:16px;}
        .cbt-stat span{display:block;font-size:12px;text-transform:uppercase;
          letter-spacing:.04em;color:var(--cbt-muted);}
        .cbt-stat strong{font-size:22px;}
        .cbt-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;}
        .cbt-btn{border-radius:999px;padding:10px 20px;font-weight:600;border:1px solid transparent;
          transition:transform 150ms ease,box-shadow 150ms ease;}
        .cbt-btn--primary{background:var(--cbt-ink);color:#fff;}
        .cbt-btn--ghost{background:#fff;border-color:#d9d1c7;color:var(--cbt-ink);}
        .cbt-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(18,24,38,.18);}
        @media(max-width:900px){.cbt-result__hero{grid-template-columns:1fr;}}
      `}</style>

      <div className="cbt-result__shell">
        <section className="cbt-result__hero">
          <div>
            <div className="cbt-result__kicker">Assessment submitted</div>
            <h1>Well done, {firstName}.</h1>
            <p style={{ color: "#525760", marginBottom: "16px" }}>
              You have successfully completed <strong>{attempt.assessment?.title ?? "your assessment"}</strong>.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <span className={`cbt-pill cbt-pill--${showScore && passed ? "success" : "accent"}`}>
                {showScore ? (passed ? "Passed" : "Not Passed") : "Completed"}
              </span>
              {showScore && (
                <>
                  <span className="cbt-pill cbt-pill--accent">{fmtPct(attempt.percentage)}%</span>
                  {attempt.grade && <span className="cbt-pill">Grade {attempt.grade}</span>}
                </>
              )}
            </div>
          </div>
          <div className="cbt-card cbt-metrics">
            <div className="cbt-metric"><span>Time used</span><span>{fmtDuration(timeUsed)}</span></div>
            {showScore && (
              <div className="cbt-metric">
                <span>Score</span>
                <span>{Number(attempt.score ?? 0)} / {Number(attempt.total_marks ?? 0)}</span>
              </div>
            )}
            {attempt.end_time && (
              <div className="cbt-metric"><span>Submitted</span><span>{new Date(attempt.end_time).toLocaleString()}</span></div>
            )}
          </div>
        </section>

        <section className="cbt-card">
          <div className="cbt-grid">
            <div className="cbt-stat"><span>Total questions</span><strong>{(attempt.assessment as { total_questions?: number })?.total_questions ?? (attempt.answers?.length ?? "—")}</strong></div>
            <div className="cbt-stat"><span>Attempted</span><strong>{attemptedCount}</strong></div>
            {showScore && (
              <>
                <div className="cbt-stat"><span>Correct answers</span><strong>{correctCount}</strong></div>
                <div className="cbt-stat"><span>Accuracy</span><strong>{accuracy.toFixed(1)}%</strong></div>
              </>
            )}
          </div>
        </section>

        <section className="cbt-card">
          <div className="cbt-grid">
            <div className="cbt-stat"><span>Matric No</span><strong>{student?.matric_no ?? "—"}</strong></div>
            <div className="cbt-stat"><span>Department</span><strong>{student?.department?.name ?? "—"}</strong></div>
            <div className="cbt-stat"><span>Level</span><strong>{student?.level?.name ?? "—"}</strong></div>
          </div>
        </section>

        <div className="cbt-actions">
          <button onClick={async () => { await logout(); router.push("/access/login?next=/access"); }} className="cbt-btn cbt-btn--primary">
            Logout
          </button>
          {allowReview && (
            <button onClick={() => router.push(`/access/results/${attemptId}/review`)} className="cbt-btn cbt-btn--ghost">
              Review answers
            </button>
          )}
          <button onClick={() => router.push("/access")} className="cbt-btn cbt-btn--ghost">
            Back to assessments
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return <StudentAuthProvider><ResultsInner /></StudentAuthProvider>;
}
