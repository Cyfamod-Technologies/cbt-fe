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
  const { student, loading: authLoading, logout } = useStudentAuth();
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

  if (authLoading || loading) {
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
          min-height:100vh;padding:24px 20px 72px;
          background:radial-gradient(circle at top right,#fff2dc 0%,#f4f7fb 45%,#f6efe6 100%);
          color:var(--cbt-ink);font-family:'Space Grotesk','Trebuchet MS',sans-serif;
        }
        .cbt-portal__inner{max-width:1100px;margin:0 auto;}
        .cbt-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;
          padding:14px 20px;background:rgba(255,255,255,.9);border-radius:18px;
          border:1px solid rgba(255,255,255,.95);box-shadow:0 4px 18px rgba(18,24,38,.08);
          margin-bottom:20px;flex-wrap:wrap;}
        .cbt-topbar__brand{display:flex;align-items:center;gap:10px;font-weight:700;
          font-size:17px;color:var(--cbt-ink);}
        .cbt-topbar__dot{width:10px;height:10px;border-radius:50%;
          background:var(--cbt-accent);display:inline-block;}
        .cbt-topbar__actions{display:flex;align-items:center;gap:12px;}
        .cbt-topbar__name{font-weight:600;color:var(--cbt-muted);font-size:14px;}
        .cbt-card{background:var(--cbt-card);border-radius:20px;padding:22px 24px;
          box-shadow:0 16px 32px rgba(18,24,38,.07);border:1px solid var(--cbt-border);margin-bottom:20px;}
        .cbt-card h3{margin-bottom:14px;font-weight:700;font-size:17px;}
        .cbt-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;}
        .cbt-info-item span{display:block;font-size:11px;text-transform:uppercase;
          letter-spacing:.06em;color:var(--cbt-muted);margin-bottom:3px;}
        .cbt-info-item strong{font-size:15px;font-weight:600;}
        .cbt-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;align-items:end;}
        .cbt-input,.cbt-select{width:100%;border-radius:12px;padding:10px 12px;
          border:1px solid var(--cbt-border);background:#fff;color:var(--cbt-ink);font-weight:500;font-size:14px;}
        .cbt-input:focus,.cbt-select:focus{outline:none;border-color:rgba(228,87,46,.5);
          box-shadow:0 0 0 3px rgba(228,87,46,.12);}
        .cbt-count{font-size:26px;font-weight:700;color:var(--cbt-accent);}
        .cbt-alert{border-radius:12px;padding:12px 14px;background:rgba(228,87,46,.08);
          color:#8c2c12;margin-bottom:12px;font-size:14px;}
        .cbt-assessment-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
          gap:18px;margin-top:4px;}
        .cbt-assessment-card{background:var(--cbt-card);border-radius:18px;padding:18px 20px;
          border:1px solid var(--cbt-border);box-shadow:0 14px 28px rgba(18,24,38,.07);
          display:grid;gap:14px;animation:cbt-fade 600ms ease both;}
        .cbt-assessment-card__head{display:flex;justify-content:space-between;gap:10px;align-items:start;}
        .cbt-assessment-title{font-weight:700;font-size:17px;margin-bottom:3px;}
        .cbt-assessment-desc{color:var(--cbt-muted);font-size:13px;}
        .cbt-status{padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;
          text-transform:uppercase;letter-spacing:.03em;}
        .cbt-status--published{background:rgba(42,157,143,.15);color:#1a685f;}
        .cbt-status--draft{background:rgba(244,162,97,.18);color:#9c4f1a;}
        .cbt-status--closed{background:rgba(231,76,60,.16);color:#8b2c24;}
        .cbt-assessment-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
          gap:8px;font-size:13px;color:var(--cbt-muted);}
        .cbt-assessment-meta strong{display:block;font-size:15px;color:var(--cbt-ink);font-weight:600;}
        .cbt-assessment-footer{display:flex;justify-content:space-between;align-items:center;
          gap:12px;flex-wrap:wrap;}
        .cbt-course{background:rgba(42,157,143,.1);color:#1f756d;padding:5px 10px;
          border-radius:999px;font-weight:600;font-size:12px;text-transform:uppercase;}
        .cbt-schedule{font-size:12px;font-weight:600;color:var(--cbt-muted);}
        .cbt-schedule strong{color:var(--cbt-ink);}
        .cbt-btn{border:none;border-radius:12px;padding:9px 18px;font-weight:600;font-size:14px;
          cursor:pointer;transition:transform 150ms ease,box-shadow 150ms ease;}
        .cbt-btn--primary{background:var(--cbt-ink);color:#fff;}
        .cbt-btn--primary:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(18,24,38,.2);}
        .cbt-btn--outline{background:#fff;border:1px solid var(--cbt-border);color:var(--cbt-ink);}
        .cbt-btn--outline:hover{border-color:#b5b0ab;background:#fafaf9;}
        .cbt-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none;}
        @keyframes cbt-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:600px){.cbt-topbar{gap:10px;}.cbt-topbar__name{display:none;}}
      `}</style>

      <div className="cbt-portal__inner">
        {/* Top bar */}
        <nav className="cbt-topbar">
          <div className="cbt-topbar__brand">
            <span className="cbt-topbar__dot" />
            CBT Portal
          </div>
          <div className="cbt-topbar__actions">
            {student && <span className="cbt-topbar__name">{student.name}</span>}
            {student ? (
              <button type="button" className="cbt-btn cbt-btn--outline" onClick={() => void logout()}>
                Logout
              </button>
            ) : (
              <button type="button" className="cbt-btn cbt-btn--primary" onClick={() => router.push("/access/login?next=/access")}>
                Login
              </button>
            )}
          </div>
        </nav>

        {/* Student info */}
        {student && (
          <section className="cbt-card">
            <h3>Welcome, {student.name.split(" ")[0]}</h3>
            <div className="cbt-info-grid">
              <div className="cbt-info-item"><span>Full Name</span><strong>{student.name}</strong></div>
              <div className="cbt-info-item"><span>Matric No</span><strong>{student.matric_no ?? "—"}</strong></div>
              <div className="cbt-info-item"><span>Department</span><strong>{student.department?.name ?? "—"}</strong></div>
              <div className="cbt-info-item"><span>Level</span><strong>{student.level?.name ?? "—"}</strong></div>
            </div>
          </section>
        )}

        {/* Filter */}
        <section className="cbt-card">
          <h3>Find an assessment</h3>
          {error && <div className="cbt-alert">{error}</div>}
          <div className="cbt-filters">
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Course</label>
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="cbt-select">
                <option value="all">All courses</option>
                {courseOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Search</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="cbt-input" placeholder="Type an assessment title" />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, marginBottom: "6px", display: "block" }}>Available</label>
              <div className="cbt-count">{availableCount}</div>
            </div>
          </div>
        </section>

        {/* Assessments */}
        <section className="cbt-card">
          <h3>Assessments</h3>
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
                        {a.description && <div className="cbt-assessment-desc">{a.description}</div>}
                      </div>
                      <span className={`cbt-status cbt-status--${a.status}`}>{a.status}</span>
                    </div>
                    <div className="cbt-assessment-meta">
                      <div>Duration<strong>{a.duration_minutes ?? 0} min</strong></div>
                      <div>Questions<strong>{a.total_questions ?? 0}</strong></div>
                      <div>Pass mark<strong>{a.pass_mark ?? 0} pts</strong></div>
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
                        <button type="button" className="cbt-btn cbt-btn--primary" disabled={!canStart}
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
    </div>
  );
}

export default function AccessPage() {
  return <StudentAuthProvider><Portal /></StudentAuthProvider>;
}
