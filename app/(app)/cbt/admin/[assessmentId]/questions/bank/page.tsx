"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAssessment, listAssessmentQuestions, type Assessment } from "@/lib/cbt";
import { importFromBank, listQuestionBankItems, type QuestionBankItem } from "@/lib/questionBank";

const questionTypeLabels: Record<string, string> = {
  multiple_choice: "MCQ",
  multiple_select: "Multi-Select",
  true_false: "True/False",
  short_answer: "Short Answer",
};

export default function BankSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = Number(params.assessmentId);

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [bankItems, setBankItems] = useState<QuestionBankItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCount, setExistingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [asm, questions] = await Promise.all([
          getAssessment(assessmentId),
          listAssessmentQuestions(assessmentId),
        ]);
        setAssessment(asm);
        setExistingCount(questions.length);

        // Pre-filter bank by assessment's course
        const items = await listQuestionBankItems(asm.course_id ?? null);
        setBankItems(items);
        if (asm.course_id) {
          setCourseFilter(String(asm.course_id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bank.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assessmentId]);

  const filtered = useMemo(() => {
    let items = bankItems;
    if (courseFilter) items = items.filter((i) => String(i.course_id) === courseFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.question_text.toLowerCase().includes(q));
    }
    return items;
  }, [bankItems, courseFilter, search]);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((i) => i.id)));
  const clearAll = () => setSelectedIds(new Set());

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    setError(null);
    try {
      await importFromBank(assessmentId, Array.from(selectedIds));
      router.push(`/cbt/admin/${assessmentId}/questions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
      setImporting(false);
    }
  };

  return (
    <div className="bg-ash min-vh-100">
      {/* Breadcrumbs */}
      <div className="breadcrumbs-area">
        <h3>Select from Question Bank</h3>
        <ul>
          <li><Link href="/cbt/admin">Assessment Management</Link></li>
          <li><Link href={`/cbt/admin/${assessmentId}/questions`}>Questions</Link></li>
          <li>From Bank</li>
        </ul>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body">
          {/* Filters row */}
          <div className="row gutters-8 mb-3">
            <div className="col-lg-5 col-md-6 col-12 form-group mb-0">
              <label className="small text-muted mb-1">Course</label>
              <div className="form-control" style={{ background: "#f8fafc", color: "#374151", fontWeight: 500 }}>
                {assessment?.course ? `${assessment.course.code} — ${assessment.course.title}` : "All Courses"}
              </div>
            </div>
            <div className="col-lg-5 col-md-6 col-12 form-group mb-0">
              <label className="small text-muted mb-1">Search Questions</label>
              <input
                className="form-control"
                placeholder="Type to filter question text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-lg-2 col-12 form-group mb-0 d-flex align-items-end">
              <div className="cbt-actions w-100">
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={selectAll}>All</button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearAll}>None</button>
              </div>
            </div>
          </div>

          {/* Assessment info bar — below filters */}
          {assessment && (
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3 pb-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
              <div>
                <strong>{assessment.title}</strong>
                <span className="text-muted small ml-2">
                  · {existingCount} question{existingCount !== 1 ? "s" : ""} already added
                </span>
              </div>
              <Link href={`/cbt/admin/${assessmentId}/questions`} className="btn btn-sm btn-outline-secondary">
                ← Back to Questions
              </Link>
            </div>
          )}

          {/* Selection summary */}
          <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
            <span className="text-muted" style={{ fontSize: "15px" }}>
              {loading ? "Loading..." : `${filtered.length} question${filtered.length !== 1 ? "s" : ""} in bank · ${selectedIds.size} selected`}
            </span>
            <div className="cbt-actions">
              <Link href={`/cbt/admin/${assessmentId}/questions`} className="btn btn-outline-secondary">
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                disabled={selectedIds.size === 0 || importing}
                onClick={() => void handleImport()}
              >
                {importing ? "Importing..." : `Import ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""} Questions`}
              </button>
            </div>
          </div>

          {/* Questions list */}
          {loading ? (
            <div className="text-muted py-4 text-center">Loading bank questions...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
              <p className="text-muted mb-2">No questions found in the bank{courseFilter ? " for this course" : ""}.</p>
              <Link href="/cbt/question-bank" className="btn btn-outline-primary btn-sm">
                Add Questions to Bank
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {filtered.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem",
                    padding: "0.85rem 1rem",
                    borderRadius: 10,
                    border: `1.5px solid ${selectedIds.has(item.id) ? "#4f46e5" : "#e5e7eb"}`,
                    background: selectedIds.has(item.id) ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    transition: "all .15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggle(item.id)}
                    style={{ marginTop: 4, flexShrink: 0, width: 20, height: 20 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "6px", lineHeight: 1.5 }}>
                      {item.question_text.length > 120 ? `${item.question_text.slice(0, 120)}…` : item.question_text}
                    </div>
                    <div className="d-flex flex-wrap gap-2" style={{ fontSize: "14px" }}>
                      <span className="badge badge-info" style={{ fontSize: "13px", padding: "4px 8px" }}>{questionTypeLabels[item.question_type] ?? item.question_type}</span>
                      <span className="text-muted">{item.marks} mark{Number(item.marks) !== 1 ? "s" : ""}</span>
                      {item.course && (
                        <span className="text-muted">
                          <code style={{ fontSize: "13px" }}>{item.course.code}</code>
                          {" — "}{item.course.title}
                        </span>
                      )}
                      {item.options && item.options.length > 0 && (
                        <span className="text-muted">{item.options.length} options</span>
                      )}
                    </div>
                  </div>
                  {selectedIds.has(item.id) && (
                    <span style={{ color: "#4f46e5", fontWeight: 700, fontSize: "1.1rem", flexShrink: 0 }}>✓</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {/* Bottom import bar (sticky feel) */}
          {selectedIds.size > 0 && !loading && (
            <div style={{
              position: "sticky",
              bottom: 0,
              background: "#fff",
              borderTop: "2px solid #4f46e5",
              marginTop: "1rem",
              padding: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderRadius: "0 0 12px 12px",
            }}>
              <span style={{ fontWeight: 600 }}>
                {selectedIds.size} question{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                className="btn btn-primary"
                disabled={importing}
                onClick={() => void handleImport()}
              >
                {importing ? "Importing..." : `Import ${selectedIds.size} Question${selectedIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
