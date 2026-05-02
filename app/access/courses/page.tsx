"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StudentAuthProvider, useStudentAuth } from "@/contexts/StudentAuthContext";
import { studentFetch } from "@/lib/studentAuth";

interface Course {
  id: number;
  code: string;
  title: string;
  credit_unit?: number | null;
  department_id?: number | null;
  level_id?: number | null;
  level?: { id: number; name: string } | null;
}

function CoursesInner() {
  const router = useRouter();
  const { student, loading: authLoading } = useStudentAuth();

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!student) {
      router.replace("/access/login?next=/access/courses");
      return;
    }

    studentFetch<{ data: Course[] }>("/api/v1/courses")
      .then((res) => {
        const courses = res.data ?? [];
        setAllCourses(courses);
        // Pre-select all matching courses
        const matching = courses.filter((c) => {
          const deptMatch = c.department_id === student.department_id;
          const levelMatch = c.level_id === null || c.level_id === undefined || c.level_id === student.level_id;
          return deptMatch && levelMatch;
        });
        setSelectedIds(new Set(matching.map((c) => c.id)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load courses."))
      .finally(() => setLoading(false));
  }, [authLoading, student, router]);

  const courses = useMemo(() => {
    if (!student) return [];
    return allCourses.filter((c) => {
      const deptMatch = c.department_id === student.department_id;
      const levelMatch = c.level_id === null || c.level_id === undefined || c.level_id === student.level_id;
      return deptMatch && levelMatch;
    });
  }, [allCourses, student]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    setConfirming(true);
    router.push("/access");
  };

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
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap');
        .cbt-portal {
          --cbt-ink:#171717;--cbt-muted:#4d5159;--cbt-accent:#e4572e;--cbt-accent-2:#2a9d8f;
          --cbt-card:#ffffff;--cbt-border:#e7e1d9;--cbt-shadow:0 20px 45px rgba(18,24,38,.12);
          min-height:100vh;padding:24px 20px 72px;
          background:radial-gradient(circle at top right,#fff2dc 0%,#f4f7fb 45%,#f6efe6 100%);
          color:var(--cbt-ink);font-family:'Space Grotesk','Trebuchet MS',sans-serif;
        }
        .cbt-portal__inner{max-width:680px;margin:0 auto;}
        .cbt-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;
          padding:14px 20px;background:rgba(255,255,255,.9);border-radius:18px;
          border:1px solid rgba(255,255,255,.95);box-shadow:0 4px 18px rgba(18,24,38,.08);
          margin-bottom:20px;flex-wrap:wrap;}
        .cbt-topbar__brand{display:flex;align-items:center;gap:10px;font-weight:700;
          font-size:17px;color:var(--cbt-ink);}
        .cbt-topbar__dot{width:10px;height:10px;border-radius:50%;
          background:var(--cbt-accent);display:inline-block;}
        .cbt-card{background:var(--cbt-card);border-radius:20px;padding:22px 24px;
          box-shadow:0 16px 32px rgba(18,24,38,.07);border:1px solid var(--cbt-border);margin-bottom:20px;}
        .cbt-btn{border:none;border-radius:12px;padding:9px 18px;font-weight:600;font-size:14px;
          cursor:pointer;transition:transform 150ms ease,box-shadow 150ms ease;}
        .cbt-btn--primary{background:var(--cbt-ink);color:#fff;}
        .cbt-btn--primary:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(18,24,38,.2);}
        .cbt-btn--teal{background:#2a9d8f;color:#fff;}
        .cbt-btn--teal:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(42,157,143,.3);}
        .cbt-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none;}
        .course-item{display:flex;align-items:center;gap:14px;padding:14px 16px;
          border-radius:12px;border:1.5px solid #e7e1d9;margin-bottom:10px;background:#fff;
          cursor:pointer;transition:border-color .15s,background .15s;}
        .course-item--selected{border-color:#2a9d8f;background:#f0faf9;}
        .course-item:hover{border-color:#b5b0ab;}
        .course-badge{font-size:14px;font-weight:700;background:#e0f2fe;color:#075985;
          padding:5px 12px;border-radius:999px;white-space:nowrap;}
        .course-check{width:22px;height:22px;border-radius:6px;border:2px solid #d1d5db;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          transition:border-color .15s,background .15s;}
        .course-check--on{border-color:#2a9d8f;background:#2a9d8f;}
        .notice-box{background:rgba(42,157,143,.08);border:1px solid rgba(42,157,143,.2);
          border-radius:12px;padding:14px 16px;font-size:14px;color:#1a685f;margin-bottom:20px;
          line-height:1.6;}
      `}</style>

      <div className="cbt-portal__inner">
        <nav className="cbt-topbar">
          <div className="cbt-topbar__brand">
            <span className="cbt-topbar__dot" />
            CBT Portal
          </div>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#4d5159" }}>
            {student?.name}
          </span>
        </nav>

        <div className="cbt-card">
          <h2 style={{ fontWeight: 700, fontSize: "22px", marginBottom: "6px" }}>
            Course Registration Confirmation
          </h2>
          <p style={{ color: "#4d5159", fontSize: "15px", marginBottom: "20px", lineHeight: 1.6 }}>
            Please review the courses assigned to your level. Check the ones you are registered for, then click <strong>Confirm</strong> to proceed to your dashboard.
          </p>

          {error && (
            <div style={{ background: "rgba(228,87,46,.08)", color: "#8c2c12", borderRadius: "10px", padding: "12px 14px", fontSize: "14px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {!loading && courses.length === 0 && !error && (
            <div className="notice-box">
              No courses are currently assigned to your department and level. You can proceed to your dashboard.
            </div>
          )}

          {courses.length > 0 && (
            <>
              <div className="notice-box">
                <strong>{selectedIds.size}</strong> of <strong>{courses.length}</strong> course{courses.length !== 1 ? "s" : ""} selected
              </div>

              <div style={{ marginBottom: "24px" }}>
                {courses.map((course) => {
                  const on = selectedIds.has(course.id);
                  return (
                    <div
                      key={course.id}
                      className={`course-item${on ? " course-item--selected" : ""}`}
                      onClick={() => toggle(course.id)}
                      role="checkbox"
                      aria-checked={on}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggle(course.id); }}
                    >
                      <div className={`course-check${on ? " course-check--on" : ""}`}>
                        {on && (
                          <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                            <path d="M1.5 5L5 8.5L11.5 1.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="course-badge">{course.code}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "16px", lineHeight: 1.4 }}>{course.title}</div>
                        <div style={{ color: "#6b7280", fontSize: "14px", marginTop: "2px" }}>
                          {course.level?.name && <span>{course.level.name}</span>}
                          {course.credit_unit != null && (
                            <span>{course.level?.name ? " · " : ""}{course.credit_unit} credit unit{course.credit_unit !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <button
            type="button"
            className="cbt-btn cbt-btn--teal"
            style={{ width: "100%", padding: "13px 18px", fontSize: "16px", borderRadius: "14px" }}
            disabled={confirming}
            onClick={handleConfirm}
          >
            {confirming ? "Redirecting..." : "Confirm & Go to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <StudentAuthProvider>
      <CoursesInner />
    </StudentAuthProvider>
  );
}
