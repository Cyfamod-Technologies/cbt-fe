"use client";

import { useEffect, useMemo, useState } from "react";
import type { Course } from "@/lib/academic";
import {
  createQuestionBankItem,
  deleteQuestionBankItem,
  listQuestionBankItems,
  updateQuestionBankItem,
  type QuestionBankItem,
  type QuestionBankItemOption,
  type SaveBankItemPayload,
} from "@/lib/questionBank";

type QuestionType = SaveBankItemPayload["question_type"];

interface QuestionOptionForm {
  id?: number;
  option_text: string;
  sort_order: number;
  is_correct: boolean;
}

interface BankItemForm {
  id?: number;
  course_id: string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  sort_order: number;
  correct_answer: string;
  explanation: string;
  options: QuestionOptionForm[];
}

const questionTypeLabels: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  multiple_select: "Multiple Select",
  true_false: "True / False",
  short_answer: "Short Answer",
};

const questionTypes: QuestionType[] = ["multiple_choice", "multiple_select", "true_false", "short_answer"];

const makeTrueFalseOptions = (existing?: QuestionOptionForm[]): QuestionOptionForm[] => [
  { id: existing?.[0]?.id, option_text: "True", sort_order: 1, is_correct: existing?.[0]?.is_correct ?? false },
  { id: existing?.[1]?.id, option_text: "False", sort_order: 2, is_correct: existing?.[1]?.is_correct ?? false },
];

const normalizeOptions = (type: QuestionType, options: QuestionOptionForm[]): QuestionOptionForm[] => {
  if (type === "short_answer") return [];
  if (type === "true_false") return makeTrueFalseOptions(options);
  if (options.length === 0) return [
    { option_text: "", sort_order: 1, is_correct: false },
    { option_text: "", sort_order: 2, is_correct: false },
  ];
  return options.map((o, i) => ({ ...o, sort_order: i + 1 }));
};

const emptyForm = (courseId: string): BankItemForm => ({
  course_id: courseId,
  question_text: "",
  question_type: "multiple_choice",
  marks: 1,
  sort_order: 1,
  correct_answer: "",
  explanation: "",
  options: normalizeOptions("multiple_choice", []),
});

function mapOptions(options: QuestionBankItemOption[] = []): QuestionOptionForm[] {
  return options.map((o, i) => ({
    id: o.id,
    option_text: o.option_text,
    sort_order: o.sort_order || i + 1,
    is_correct: Boolean(o.is_correct),
  }));
}

interface QuestionBankPanelProps {
  courses: Course[];
}

export function QuestionBankPanel({ courses }: QuestionBankPanelProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [items, setItems] = useState<QuestionBankItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [form, setForm] = useState<BankItemForm>(() => emptyForm(""));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isEditing = Boolean(activeItemId);

  const load = async (courseId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const cid = courseId !== undefined ? courseId : selectedCourseId;
      const data = await listQuestionBankItems(cid ? Number(cid) : null);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load question bank.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCourseChange = (cid: string) => {
    setSelectedCourseId(cid);
    void load(cid);
    resetForm(cid);
  };

  const resetForm = (courseId?: string) => {
    setActiveItemId(null);
    setForm(emptyForm(courseId ?? selectedCourseId));
  };

  const handleItemSelect = (item: QuestionBankItem) => {
    setActiveItemId(item.id);
    setForm({
      id: item.id,
      course_id: item.course_id ? String(item.course_id) : "",
      question_text: item.question_text,
      question_type: item.question_type,
      marks: Number(item.marks || 1),
      sort_order: item.sort_order || 1,
      correct_answer: item.correct_answer || "",
      explanation: item.explanation || "",
      options: normalizeOptions(item.question_type, mapOptions(item.options)),
    });
  };

  const updateType = (nextType: QuestionType) => {
    setForm((f) => ({
      ...f,
      question_type: nextType,
      options: normalizeOptions(nextType, f.options),
      correct_answer: nextType === "short_answer" ? f.correct_answer : "",
    }));
  };

  const updateOptionText = (index: number, value: string) => {
    setForm((f) => {
      const options = [...f.options];
      options[index] = { ...options[index], option_text: value };
      return { ...f, options };
    });
  };

  const updateOptionCorrect = (index: number, checked: boolean) => {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => {
        if (f.question_type === "multiple_select") return i === index ? { ...o, is_correct: checked } : o;
        return { ...o, is_correct: i === index ? checked : false };
      }),
    }));
  };

  const validate = (): string | null => {
    if (!form.question_text.trim()) return "Question text is required.";
    if (form.marks < 1) return "Marks must be at least 1.";
    if (form.question_type === "short_answer") {
      if (!form.correct_answer.trim()) return "Provide the correct answer.";
      return null;
    }
    const filled = form.options.filter((o) => o.option_text.trim());
    if (filled.length < 2) return "Provide at least two options.";
    const correct = filled.filter((o) => o.is_correct).length;
    if (correct === 0) return "Select at least one correct option.";
    if ((form.question_type === "multiple_choice" || form.question_type === "true_false") && correct > 1)
      return "Only one correct option is allowed.";
    return null;
  };

  const saveItem = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload: SaveBankItemPayload = {
      course_id: form.course_id ? Number(form.course_id) : null,
      question_text: form.question_text.trim(),
      question_type: form.question_type,
      marks: form.marks,
      sort_order: form.sort_order,
      correct_answer: form.question_type === "short_answer" ? form.correct_answer.trim() : null,
      explanation: form.explanation.trim() || null,
      options: form.question_type === "short_answer"
        ? []
        : form.options.filter((o) => o.option_text.trim()).map((o, i) => ({
          option_text: o.option_text.trim(),
          is_correct: o.is_correct,
          sort_order: i + 1,
        })),
    };

    try {
      if (form.id) {
        await updateQuestionBankItem(form.id, payload);
      } else {
        await createQuestionBankItem(payload);
      }
      await load();
      resetForm();
      setSuccess("Question saved to bank.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this question from the bank?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteQuestionBankItem(id);
      await load();
      resetForm();
      setSuccess("Question deleted from bank.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete question.");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!selectedCourseId) return items;
    return items.filter((i) => String(i.course_id) === selectedCourseId);
  }, [items, selectedCourseId]);

  return (
    <div className="row gutters-20">
      <div className="col-xl-5 col-12">
        <div className="card height-auto">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title"><h3>Question Bank</h3></div>
            </div>

            <div className="form-group mb-3">
              <label>Filter by Course</label>
              <select
                className="form-control"
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                ))}
              </select>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="cbt-school-panel">
              {loading ? (
                <p className="text-muted">Loading...</p>
              ) : filteredItems.length === 0 ? (
                <p className="text-muted mb-0">No questions in the bank{selectedCourseId ? " for this course" : ""}.</p>
              ) : (
                <ul className="cbt-school-question-list">
                  {filteredItems.map((item) => (
                    <li key={item.id} className={`cbt-school-question-row ${activeItemId === item.id ? "active" : ""}`}>
                      <div>
                        <div className="font-weight-bold text-dark small">{item.question_text.slice(0, 70)}</div>
                        <small className="text-muted">
                          {questionTypeLabels[item.question_type]} · {item.marks} mark(s)
                          {item.course ? ` · ${item.course.code || item.course.title}` : ""}
                        </small>
                      </div>
                      <div className="cbt-school-question-actions">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleItemSelect(item)}>Edit</button>
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteItem(item.id)} disabled={saving}>Del</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button type="button" className="btn btn-primary mt-2" onClick={() => resetForm()}>
              + New Question
            </button>
          </div>
        </div>
      </div>

      <div className="col-xl-7 col-12">
        <div className="card height-auto">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title"><h3>{isEditing ? "Edit Question" : "Add Question"}</h3></div>
            </div>

            <div className="row gutters-8">
              <div className="col-12 form-group">
                <label>Course</label>
                <select
                  className="form-control"
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                >
                  <option value="">No specific course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} - {c.title}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 form-group">
                <label>Question Text *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.question_text}
                  onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                />
              </div>
              <div className="col-md-5 col-12 form-group">
                <label>Question Type</label>
                <select className="form-control" value={form.question_type} onChange={(e) => updateType(e.target.value as QuestionType)}>
                  {questionTypes.map((t) => (
                    <option key={t} value={t}>{questionTypeLabels[t]}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4 col-6 form-group">
                <label>Marks</label>
                <input type="number" min="1" className="form-control" value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} />
              </div>
              <div className="col-md-3 col-6 form-group">
                <label>Order</label>
                <input type="number" min="1" className="form-control" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="col-12 form-group">
                <label>Explanation (optional)</label>
                <textarea className="form-control" rows={2} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
              </div>
            </div>

            {form.question_type === "short_answer" ? (
              <div className="form-group">
                <label>Correct Answer *</label>
                <textarea className="form-control" rows={3} value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} />
              </div>
            ) : (
              <div className="form-group">
                <label>Options *</label>
                {form.options.map((opt, i) => (
                  <div key={opt.id ?? `opt-${i}`} className="cbt-school-option-row">
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Option ${i + 1}`}
                      value={opt.option_text}
                      onChange={(e) => updateOptionText(i, e.target.value)}
                      readOnly={form.question_type === "true_false"}
                    />
                    <label className="cbt-school-correct">
                      <input
                        type={form.question_type === "multiple_select" ? "checkbox" : "radio"}
                        name="correct-bank-option"
                        checked={opt.is_correct}
                        onChange={(e) => updateOptionCorrect(i, e.target.checked)}
                      />
                      <span>Correct</span>
                    </label>
                    {form.question_type !== "true_false" && (
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => {
                        setForm((f) => ({ ...f, options: normalizeOptions(f.question_type, f.options.filter((_, idx) => idx !== i)) }));
                      }}>Remove</button>
                    )}
                  </div>
                ))}
                {form.question_type !== "true_false" && (
                  <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={() => {
                    setForm((f) => ({ ...f, options: [...f.options, { option_text: "", sort_order: f.options.length + 1, is_correct: false }] }));
                  }}>+ Add Option</button>
                )}
              </div>
            )}

            <div className="cbt-school-form-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={() => resetForm()}>Reset</button>
              <button type="button" className="btn btn-primary" onClick={saveItem} disabled={saving}>
                {saving ? "Saving..." : "Save to Bank"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
