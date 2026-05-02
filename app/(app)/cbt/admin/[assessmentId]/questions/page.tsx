"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAssessment, listAssessmentQuestions, type Assessment, type AssessmentQuestion } from "@/lib/cbt";
import { QuestionManager } from "@/app/(app)/cbt/_components/question-manager";

type Mode = "choose" | "new";

export default function QuestionsPage() {
  const params = useParams();
  const assessmentId = Number(params.assessmentId);

  const [mode, setMode] = useState<Mode>("choose");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [asm, qs] = await Promise.all([
          getAssessment(assessmentId),
          listAssessmentQuestions(assessmentId),
        ]);
        setAssessment(asm);
        setQuestions(qs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [assessmentId]);

  // If user chose "new", render the full question manager
  if (mode === "new") {
    return <QuestionManager assessmentId={assessmentId} />;
  }

  // Landing / choice page
  return (
    <div className="bg-ash min-vh-100">
      <div className="breadcrumbs-area">
        <h3>Assessment Questions</h3>
        <ul>
          <li><Link href="/cbt/admin">Assessment Management</Link></li>
          <li>Questions</li>
        </ul>
      </div>

      {/* Choice cards — always first */}
      <div className="row gutters-20 mb-4">
        {/* Card 1 — Add New Question */}
        <div className="col-md-6 col-12">
          <button
            type="button"
            onClick={() => setMode("new")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              width: "100%",
              background: "#fff",
              border: "2px solid #e5e7eb",
              borderRadius: 16,
              padding: "1.75rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color .15s, box-shadow .15s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#4f46e5"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(79,70,229,.12)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", fontSize: "28px" }}>
              ✏️
            </div>
            <h5 style={{ fontWeight: 700, margin: "0 0 10px", fontSize: "22px" }}>New Question</h5>
            <p style={{ color: "#6b7280", margin: 0, fontSize: "16px", lineHeight: 1.7 }}>
              Type and add questions manually — single choice, multi-select, true/false or short answer.
            </p>
            <span style={{ marginTop: "16px", color: "#4f46e5", fontWeight: 600, fontSize: "15px" }}>
              Add manually →
            </span>
          </button>
        </div>

        {/* Card 2 — From Question Bank */}
        <div className="col-md-6 col-12">
          <Link
            href={`/cbt/admin/${assessmentId}/questions/bank`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              background: "#fff",
              border: "2px solid #e5e7eb",
              borderRadius: 16,
              padding: "1.75rem",
              textDecoration: "none",
              color: "inherit",
              transition: "border-color .15s, box-shadow .15s",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#059669"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(5,150,105,.1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"; }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 14, background: "linear-gradient(135deg,#059669,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem", fontSize: "28px" }}>
              📚
            </div>
            <h5 style={{ fontWeight: 700, margin: "0 0 10px", fontSize: "22px" }}>From Question Bank</h5>
            <p style={{ color: "#6b7280", margin: 0, fontSize: "16px", lineHeight: 1.7 }}>
              Pick from your saved question bank — filter by course, select multiple questions and import at once.
            </p>
            <span style={{ marginTop: "16px", color: "#059669", fontWeight: 600, fontSize: "15px" }}>
              Browse bank →
            </span>
          </Link>
        </div>
      </div>

      {/* Existing questions list */}
      {!loading && questions.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="heading-layout1 mb-3">
              <div className="item-title">
                <h3>Questions Added ({questions.length})</h3>
              </div>
              <button type="button" className="btn-fill-lg bg-blue-dark btn-hover-yellow" onClick={() => setMode("new")}>
                Edit / Manage
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {questions.map((q, i) => (
                <div key={q.id} style={{ display: "flex", gap: "0.75rem", padding: "0.85rem 1rem", background: "#f8fafc", borderRadius: 10, alignItems: "flex-start" }}>
                  <span style={{ fontWeight: 700, color: "#6b7280", fontSize: "16px", minWidth: 28, paddingTop: 2 }}>{i + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px", lineHeight: 1.5 }}>
                      {q.question_text.length > 100 ? `${q.question_text.slice(0, 100)}…` : q.question_text}
                    </div>
                    <div className="text-muted" style={{ fontSize: "14px", marginTop: 2 }}>
                      {q.question_type.replace("_", " ")} · {q.marks} mark{Number(q.marks) !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
