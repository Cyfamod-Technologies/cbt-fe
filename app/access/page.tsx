"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentAuthProvider, useStudentAuth } from "@/contexts/StudentAuthContext";
import { studentFetch } from "@/lib/studentAuth";
import type { Assessment } from "@/lib/cbt";

const parseDate = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  const n = new Date(v.replace(" ", "T"));
  return isNaN(n.getTime()) ? null : n;
};

const fmtDate = (d: Date) => {
  const day = d.getDate();
  const sfx = [, "st", "nd", "rd"][((day % 100) - 20 > 0 ? day % 10 : day % 100)] || "th";
  const mon = d.toLocaleString("en-US", { month: "short" });
  const time = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
  return `${day}${sfx} ${mon} ${d.getFullYear()} ${time}`;
};

const scheduleStatus = (a: Assessment) => {
  const now = new Date();
  const start = parseDate(a.start_time);
  const end = parseDate(a.end_time);
  if (start && now < start) return { state: "upcoming", label: fmtDate(start) };
  if (end && now > end) return { state: "closed", label: fmtDate(end) };
  if (end) return { state: "open", label: fmtDate(end) };
  return { state: "open", label: null };
};

const courseLabel = (a: Assessment) =>
  a.course?.title ?? a.course?.name ?? a.department?.name ?? "General";

function Portal() {
  const router = useRouter();
  const { student, loading: authLoading } = useStudentAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!student) { router.replace("/access/login?next=/access"); return; }

    studentFetch<{ data: Assessment[] }>("/api/v1/assessments/available")
      .then((r) => { setAssessments(r.data ?? []); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load assessments."))
      .finally(() => setLoading(false));
  }, [authLoading, student, router]);

  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    assessments.forEach((a) => map.set(String(a.course_id ?? a.department_id ?? "general"), courseLabel(a)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [assessments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assessments.filter((a) => {
      const key = String(a.course_id ?? a.department_id ?? "general");
      if (courseFilter !== "all" && key !== courseFilter) return false;
      if (q && !a.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assessments, courseFilter, search]);

  const availableCount = filtered.filter((a) => scheduleStatus(a).state === "open").length;

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-ash">
        <div className="spinner-border" role="status"><span className="sr-only">Loading...</span></div>
      </div>
    );
  }

  return (
    <div className="cbt-portal">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Space+Grotesk:wght@400;500;600&display=swap');
        .cbt-portal {
          --cbt-ink:#171717;--cbt-muted:#4d5159;--cbt-accent:#e4572e;--cbt-accent-2:#2a9d8f;
          --cbt-card:#ffffff;--cbt-border:#e7e1d9;--cbt-shadow:0 20px 45px rgba(18,24,38,.12);
          min-height:100vh;padding:32px 20px 72px;
          background:radial-gradient(circle at top right,#fff2dc 0%,#f4f7fb 45%,#f6efe6 100%);
          color:var(--cbt-ink);font-family:'Space Grotesk','Trebuchet MS',sans-serif;
        }
        .cbt-hero{position:relative;border-radius:28px;padding:32px 32px 36px;
          background:linear-gradient(135deg,#fef3dd 0%,#f6e7c5 40%,#e4f1ff 100%);
          box-shadow:var(--cbt-shadow);overflow:hidden;margin-bottom:28px;}
        .cbt-hero::before{content:'';position:absolute;width:240px;height:240px;border-radius:50%;
          background:rgba(42,157,143,.14);top:-80px;right:-60px;}
        .cbt-hero::after{content:'';position:absolute;width:180px;height:180px;border-radius:26px;
          background:rgba(228,87,46,.14);bottom:-40px;left:-30px;transform:rotate(12deg);}
        .cbt-hero__grid{position:relative;z-index:1;display:grid;
          grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:24px;}
        .cbt-hero h1{font-family:'Fraunces','Times New Roman',serif;
          font-size:clamp(28px,3.4vw,44px);margin-bottom:10px;color:var(--cbt-ink);}
        .cbt-hero p{color:var(--cbt-muted);margin-bottom:18px;max-width:520px;}
        .cbt-pill{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;
          border-radius:999px;background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.8);
          font-weight:600;letter-spacing:.02em;font-size:12px;text-transform:uppercase;}
        .cbt-steps{display:grid;gap:10px;margin-top:18px;}
        .cbt-step{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;
          padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.65);
          border:1px solid rgba(255,255,255,.9);}
        .cbt-step__index{font-weight:700;color:var(--cbt-accent);}
        .cbt-hero__panel{background:rgba(255,255,255,.8);border-radius:20px;padding:18px;
          border:1px solid rgba(255,255,255,.95);display:grid;gap:12px;align-content:start;}
        .cbt-hero__stat{display:flex;justify-content:space-between;font-weight:600;color:var(--cbt-ink);}
        .cbt-card{background:var(--cbt-card);border-radius:20px;padding:20px 22px;
          box-shadow:0 16px 32px rgba(18,24,38,.08);border:1px solid var(--cbt-border);margin-bottom:20px;}
        .cbt-card h3{margin-bottom:12px;font-weight:600;}
        .cbt-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;}
        .cbt-info-item span{display:block;font-size:12px;text-transform:uppercase;
          letter-spacing:.04em;color:var(--cbt-muted);margin-bottom:4px;}
        .cbt-info-item strong{font-size:16px;}
        .cbt-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:end;}
        .cbt-input,.cbt-select{width:100%;border-radius:14px;padding:12px 14px;
          border:1px solid var(--cbt-border);background:#fff;color:var(--cbt-ink);font-weight:500;}
        .cbt-input:focus,.cbt-select:focus{outline:none;border-color:rgba(228,87,46,.5);
          box-shadow:0 0 0 3px rgba(228,87,46,.15);}
        .cbt-count{font-size:28px;font-weight:700;}
        .cbt-alert{border-radius:14px;padding:12px 14px;background:rgba(228,87,46,.1);
          color:#8c2c12;margin-bottom:12px;}
        .cbt-assessment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
          gap:18px;margin-top:12px;}
        .cbt-assessment-card{background:var(--cbt-card);border-radius:18px;padding:18px;
          border:1px solid var(--cbt-border);box-shadow:0 14px 28px rgba(18,24,38,.08);
          display:grid;gap:14px;animation:cbt-fade 600ms ease both;}
        .cbt-assessment-card__head{display:flex;justify-content:space-between;gap:10px;align-items:start;}
        .cbt-assessment-title{font-weight:600;font-size:18px;margin-bottom:4px;}
        .cbt-assessment-desc{color:var(--cbt-muted);font-size:14px;}
        .cbt-status{padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;text-transform:capitalize;}
        .cbt-status--published{background:rgba(42,157,143,.15);color:#1a685f;}
        .cbt-status--draft{background:rgba(244,162,97,.18);color:#9c4f1a;}
        .cbt-status--closed{background:rgba(231,76,60,.16);color:#8b2c24;}
        .cbt-assessment-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
          gap:8px;font-size:13px;color:var(--cbt-muted);}
        .cbt-assessment-meta strong{display:block;font-size:16px;color:var(--cbt-ink);}
        .cbt-assessment-footer{display:flex;justify-content:space-between;align-items:center;
          gap:12px;flex-wrap:wrap;}
        .cbt-course{background:rgba(42,157,143,.12);color:#1f756d;padding:6px 12px;
          border-radius:999px;font-weight:600;font-size:12px;text-transform:uppercase;}
        .cbt-schedule{font-size:12px;font-weight:600;color:var(--cbt-muted);}
        .cbt-schedule strong{color:var(--cbt-ink);}
        .cbt-btn{border:none;border-radius:999px;padding:10px 18px;background:var(--cbt-ink);
          color:#fff;font-weight:600;transition:transform 150ms ease,box-shadow 150ms ease;}
        .cbt-btn:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(18,24,38,.2);}
        .cbt-btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none;transform:none;}
        .cbt-secondary-btn{background:#fff;border:1px solid var(--cbt-border);color:var(--cbt-ink);}
        @keyframes cbt-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:900px){.cbt-hero__grid{grid-template-columns:1fr;}}
      `}</style>

      <section className="cbt-hero">
        <div className="cbt-hero__grid">
          <div>
            <div className="cbt-pill">CBT Portal</div>
            <h1>Sign in, pick a subject, start an assessment.</h1>
            <p>Log in with your matric details to see assessments available for your class.</p>
            <div className="cbt-steps">
              <div className="cbt-step"><div className="cbt-step__index">01</div><div>Sign in with your matric number and first name.</div></div>
              <div className="cbt-step"><div className="cbt-step__index">02</div><div>Pick an assessment that fits your course.</div></div>
              <div className="cbt-step"><div className="cbt-step__index">03</div><div>Answer questions and submit before time runs out.</div></div>
            </div>
          </div>
          <div className="cbt-hero__panel">
            <div className="cbt-hero__stat"><span>Total assessments</span><span>{assessments.length}</span></div>
            <div className="cbt-hero__stat"><span>Courses</span><span>{courseOptions.length}</span></div>
            <div className="cbt-hero__stat"><span>Signed in</span><span>{student ? "Yes" : "No"}</span></div>
            {!student && (
              <button type="button" onClick={() => router.push("/access/login?next=/access")} className="cbt-btn cbt-secondary-btn">
                Go to login
              </button>
            )}
          </div>
        </div>
      </section>

      {student && (
        <section className="cbt-card">
          <h3>Welcome, {student.name.split(" ")[0]}</h3>
          <div className="cbt-info-grid">
            <div className="cbt-info-item"><span>Matric No</span><strong>{student.matric_no ?? "—"}</strong></div>
            <div className="cbt-info-item"><span>Department</span><strong>{student.department?.name ?? "—"}</strong></div>
            <div className="cbt-info-item"><span>Level</span><strong>{student.level?.name ?? "—"}</strong></div>
          </div>
        </section>
      )}

      <section className="cbt-card">
        <h3>Find an assessment</h3>
        {error && <div className="cbt-alert">{error}</div>}
        <div className="cbt-filters">
          <div>
            <label>Course</label>
            <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="cbt-select">
              <option value="all">All courses</option>
              {courseOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Search assessment</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="cbt-input" placeholder="Type an assessment title" />
          </div>
          <div>
            <label>Available assessments</label>
            <div className="cbt-count">{availableCount}</div>
          </div>
        </div>
      </section>

      <section className="cbt-card">
        <h3>Available assessments</h3>
        {filtered.length === 0 ? (
          <div className="cbt-alert">No assessments found for this selection.</div>
        ) : (
          <div className="cbt-assessment-grid">
            {filtered.map((a, i) => {
              const attemptCount = (a as Assessment & { attempt_count?: number }).attempt_count ?? 0;
              const attempted = (a as Assessment & { attempted?: boolean }).attempted ?? false;
              const hasLimit = a.allow_multiple_attempts && a.max_attempts;
              const sched = scheduleStatus(a);
              const attemptLocked = a.allow_multiple_attempts === false ? attempted : Boolean(hasLimit && attemptCount >= (a.max_attempts ?? 0));
              const schedLocked = sched.state !== "open";
              const canStart = !attemptLocked && !schedLocked;

              return (
                <div key={a.id} className="cbt-assessment-card" style={{ animationDelay: `${i * 70}ms` }}>
                  <div className="cbt-assessment-card__head">
                    <div>
                      <div className="cbt-assessment-title">{a.title}</div>
                      <div className="cbt-assessment-desc">{a.description ?? "No description"}</div>
                    </div>
                    <span className={`cbt-status cbt-status--${a.status}`}>{a.status}</span>
                  </div>
                  <div className="cbt-assessment-meta">
                    <div>Course<strong>{courseLabel(a)}</strong></div>
                    <div>Duration<strong>{a.duration_minutes ?? 0} min</strong></div>
                    <div>Questions<strong>{a.total_questions ?? 0}</strong></div>
                    <div>Pass mark<strong>{a.pass_mark ?? 0}%</strong></div>
                    {sched.state === "upcoming" && <div>Opens<strong>{sched.label}</strong></div>}
                    {sched.state === "open" && sched.label && <div>Closes<strong>{sched.label}</strong></div>}
                    {sched.state === "closed" && <div>Closed<strong>{sched.label}</strong></div>}
                  </div>
                  <div className="cbt-assessment-footer">
                    <span className="cbt-course">{courseLabel(a)}</span>
                    {schedLocked ? (
                      <span className="cbt-schedule">
                        {sched.state === "upcoming" ? <>Opens <strong>{sched.label}</strong></> : <>Closed <strong>{sched.label}</strong></>}
                      </span>
                    ) : (
                      <button type="button" className="cbt-btn" disabled={!canStart}
                        onClick={() => { if (canStart) router.push(`/access/${a.id}/take`); }}>
                        {attemptLocked ? "Attempted" : "Start assessment"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AccessPage() {
  return <StudentAuthProvider><Portal /></StudentAuthProvider>;
}
