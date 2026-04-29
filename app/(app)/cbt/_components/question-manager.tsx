"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  createAssessmentQuestion,
  deleteAssessmentQuestion,
  getAssessment,
  listAssessmentQuestions,
  publishAssessment,
  updateAssessmentQuestion,
  type Assessment,
  type AssessmentQuestion,
  type AssessmentQuestionOption,
  type SaveQuestionPayload,
} from "@/lib/cbt";
import { statusBadgeClass } from "./cbt-utils";

interface QuestionManagerProps {
  assessmentId: number;
}

type QuestionType = SaveQuestionPayload["question_type"];
type BulkImportResult = { imported: number; failed: number; errors: string[] };

interface QuestionOptionForm {
  id?: number;
  option_text: string;
  sort_order: number;
  is_correct: boolean;
}

interface QuestionForm {
  id?: number;
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

const makeTrueFalseOptions = (existing?: QuestionOptionForm[]): QuestionOptionForm[] => {
  const trueOption = existing?.[0];
  const falseOption = existing?.[1];

  return [
    {
      id: trueOption?.id,
      option_text: "True",
      sort_order: 1,
      is_correct: trueOption?.is_correct ?? false,
    },
    {
      id: falseOption?.id,
      option_text: "False",
      sort_order: 2,
      is_correct: falseOption?.is_correct ?? false,
    },
  ];
};

const normalizeOptions = (type: QuestionType, options: QuestionOptionForm[]): QuestionOptionForm[] => {
  if (type === "short_answer") {
    return [];
  }

  if (type === "true_false") {
    return makeTrueFalseOptions(options);
  }

  if (options.length === 0) {
    return [
      { option_text: "", sort_order: 1, is_correct: false },
      { option_text: "", sort_order: 2, is_correct: false },
    ];
  }

  return options.map((option, index) => ({ ...option, sort_order: index + 1 }));
};

const emptyQuestionForm = (sortOrder: number): QuestionForm => ({
  question_text: "",
  question_type: "multiple_choice",
  marks: 1,
  sort_order: sortOrder,
  correct_answer: "",
  explanation: "",
  options: normalizeOptions("multiple_choice", []),
});

const bulkImportTemplate = [
  "question_text,question_type,marks,options,correct_answers,correct_answer,explanation",
  "\"What is the capital of France?\",multiple_choice,1,\"London|Paris|Berlin\",\"2\",,",
  "\"Select prime numbers.\",multiple_select,2,\"2|3|4|5\",\"1|2|4\",,",
  "\"The earth is round.\",true_false,1,,true,,",
  "\"2 + 2 = ?\",short_answer,1,,,\"4\",",
].join("\n");

function mapQuestionOptions(options: AssessmentQuestionOption[] = []): QuestionOptionForm[] {
  return options.map((option, index) => ({
    id: option.id,
    option_text: option.option_text,
    sort_order: option.sort_order || index + 1,
    is_correct: Boolean(option.is_correct),
  }));
}

function splitPipeList(value: string): string[] {
  return value.split("|").map((item) => item.trim()).filter(Boolean);
}

function normalizeCsvHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function parseCsvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === "\"") {
      if (quoted && next === "\"") {
        field += "\"";
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  return rows;
}

function parseCsvRecords(input: string): Record<string, string>[] {
  const rows = parseCsvRows(input);
  if (rows.length < 2) {
    throw new Error("CSV must include a header row and at least one question row.");
  }

  const headers = rows[0].map(normalizeCsvHeader);
  if (!headers.includes("question_text")) {
    throw new Error("CSV header must include question_text.");
  }

  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] || "").trim();
    });
    return record;
  }).filter((record) => Object.values(record).some(Boolean));
}

function markCorrectOptions(options: QuestionOptionForm[], correctTokens: string[]) {
  const optionTextMap = new Map(options.map((option, index) => [option.option_text.toLowerCase(), index] as const));

  correctTokens.forEach((token) => {
    const numeric = Number(token);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= options.length) {
      options[numeric - 1].is_correct = true;
      return;
    }

    const optionIndex = optionTextMap.get(token.toLowerCase());
    if (typeof optionIndex === "number") {
      options[optionIndex].is_correct = true;
    }
  });
}

function buildBulkPayload(record: Record<string, string>, sortOrder: number): SaveQuestionPayload {
  const questionText = record.question_text || record.question || "";
  const typeRaw = (record.question_type || record.type || "multiple_choice").toLowerCase().replace("mcq", "multiple_choice");
  const questionType = questionTypes.includes(typeRaw as QuestionType) ? typeRaw as QuestionType : "multiple_choice";
  const marks = Number(record.marks || 1);

  if (!questionText.trim()) {
    throw new Error("question_text is required.");
  }

  if (questionType === "short_answer") {
    const correctAnswer = record.correct_answer || record.answer || "";
    if (!correctAnswer.trim()) {
      throw new Error("short_answer questions require correct_answer.");
    }

    return {
      question_text: questionText.trim(),
      question_type: questionType,
      marks: Number.isFinite(marks) && marks > 0 ? marks : 1,
      sort_order: sortOrder,
      correct_answer: correctAnswer.trim(),
      explanation: record.explanation || null,
      options: [],
    };
  }

  let options = splitPipeList(record.options || record.option_texts || "").map((optionText, index) => ({
    option_text: optionText,
    is_correct: false,
    sort_order: index + 1,
  }));

  if (questionType === "true_false" && options.length === 0) {
    const correct = (record.correct_answer || record.answer || "").toLowerCase();
    options = [
      { option_text: "True", is_correct: ["true", "1", "yes"].includes(correct), sort_order: 1 },
      { option_text: "False", is_correct: ["false", "0", "no"].includes(correct), sort_order: 2 },
    ];
  }

  markCorrectOptions(options, splitPipeList(record.correct_answers || record.correct || ""));

  const correctCount = options.filter((option) => option.is_correct).length;
  if (options.length < 2) {
    throw new Error("At least two options are required.");
  }
  if (correctCount === 0) {
    throw new Error("Select at least one correct option.");
  }
  if ((questionType === "multiple_choice" || questionType === "true_false") && correctCount > 1) {
    throw new Error("Only one correct option is allowed for this question type.");
  }

  return {
    question_text: questionText.trim(),
    question_type: questionType,
    marks: Number.isFinite(marks) && marks > 0 ? marks : 1,
    sort_order: sortOrder,
    correct_answer: null,
    explanation: record.explanation || null,
    options,
  };
}

export function QuestionManager({ assessmentId }: QuestionManagerProps) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(() => emptyQuestionForm(1));
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<BulkImportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const nextQuestionOrder = questions.length + 1;
  const isEditingQuestion = Boolean(activeQuestionId);

  const questionMismatch = useMemo(() => {
    if (!assessment) {
      return false;
    }
    return Number(assessment.total_questions || 0) !== questions.length;
  }, [assessment, questions.length]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [assessmentData, questionData] = await Promise.all([
        getAssessment(assessmentId),
        listAssessmentQuestions(assessmentId),
      ]);
      setAssessment(assessmentData);
      setQuestions(questionData);
      setQuestionForm(emptyQuestionForm(questionData.length + 1));
      setActiveQuestionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quiz questions.");
    } finally {
      setLoading(false);
    }
  };

  const refreshQuestions = async () => {
    const questionData = await listAssessmentQuestions(assessmentId);
    setQuestions(questionData);
    setAssessment((current) => current ? { ...current, total_questions: questionData.length } : current);
    return questionData;
  };

  useEffect(() => {
    void load();
  }, [assessmentId]);

  const resetQuestionForm = (sortOrder: number) => {
    setActiveQuestionId(null);
    setQuestionForm(emptyQuestionForm(sortOrder));
  };

  const handleQuestionSelect = (question: AssessmentQuestion) => {
    setActiveQuestionId(question.id);
    setQuestionForm({
      id: question.id,
      question_text: question.question_text,
      question_type: question.question_type,
      marks: Number(question.marks || 1),
      sort_order: question.sort_order || 1,
      correct_answer: question.correct_answer || "",
      explanation: question.explanation || "",
      options: normalizeOptions(question.question_type, mapQuestionOptions(question.options)),
    });
  };

  const updateQuestionType = (nextType: QuestionType) => {
    setQuestionForm((current) => ({
      ...current,
      question_type: nextType,
      options: normalizeOptions(nextType, current.options),
      correct_answer: nextType === "short_answer" ? current.correct_answer : "",
    }));
  };

  const updateOptionText = (index: number, value: string) => {
    setQuestionForm((current) => {
      const options = [...current.options];
      options[index] = { ...options[index], option_text: value };
      return { ...current, options };
    });
  };

  const updateOptionCorrect = (index: number, checked: boolean) => {
    setQuestionForm((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => {
        if (current.question_type === "multiple_select") {
          return optionIndex === index ? { ...option, is_correct: checked } : option;
        }
        return { ...option, is_correct: optionIndex === index ? checked : false };
      }),
    }));
  };

  const addOption = () => {
    setQuestionForm((current) => ({
      ...current,
      options: [
        ...current.options,
        { option_text: "", sort_order: current.options.length + 1, is_correct: false },
      ],
    }));
  };

  const removeOption = (index: number) => {
    setQuestionForm((current) => ({
      ...current,
      options: normalizeOptions(current.question_type, current.options.filter((_, optionIndex) => optionIndex !== index)),
    }));
  };

  const validateQuestion = () => {
    if (!questionForm.question_text.trim()) {
      return "Question text is required.";
    }

    if (questionForm.marks < 1) {
      return "Marks must be at least 1.";
    }

    if (questionForm.question_type === "short_answer") {
      if (!questionForm.correct_answer.trim()) {
        return "Provide the correct answer for short answer questions.";
      }
      return null;
    }

    const filledOptions = questionForm.options.filter((option) => option.option_text.trim());
    if (filledOptions.length < 2) {
      return "Provide at least two options.";
    }

    const correctCount = filledOptions.filter((option) => option.is_correct).length;
    if (correctCount === 0) {
      return "Select at least one correct option.";
    }

    if ((questionForm.question_type === "multiple_choice" || questionForm.question_type === "true_false") && correctCount > 1) {
      return "Only one correct option is allowed.";
    }

    return null;
  };

  const saveQuestion = async () => {
    const validationError = validateQuestion();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSavingQuestion(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: SaveQuestionPayload = {
        question_text: questionForm.question_text.trim(),
        question_type: questionForm.question_type,
        marks: questionForm.marks,
        sort_order: questionForm.sort_order,
        correct_answer: questionForm.question_type === "short_answer" ? questionForm.correct_answer.trim() : null,
        explanation: questionForm.explanation.trim() || null,
        options: questionForm.question_type === "short_answer"
          ? []
          : questionForm.options.filter((option) => option.option_text.trim()).map((option, index) => ({
            option_text: option.option_text.trim(),
            is_correct: option.is_correct,
            sort_order: index + 1,
          })),
      };

      if (questionForm.id) {
        await updateAssessmentQuestion(questionForm.id, payload);
      } else {
        await createAssessmentQuestion(assessmentId, payload);
      }

      const refreshed = await refreshQuestions();
      resetQuestionForm(refreshed.length + 1);
      setSuccess("Question saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const deleteQuestion = async (questionId: number) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    setSavingQuestion(true);
    setError(null);

    try {
      await deleteAssessmentQuestion(questionId);
      const refreshed = await refreshQuestions();
      resetQuestionForm(refreshed.length + 1);
      setSuccess("Question deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete question.");
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleBulkFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setBulkInput(await file.text());
      setError(null);
      setSuccess(`Loaded ${file.name}. Review and click Import Questions.`);
      setBulkImportResult(null);
    } catch {
      setError("Unable to read file. Please use a valid CSV file.");
    } finally {
      event.target.value = "";
    }
  };

  const handleDownloadCsvTemplate = () => {
    const blob = new Blob([bulkImportTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cbt-questions-template-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async () => {
    if (!bulkInput.trim()) {
      setError("Paste CSV questions or upload a CSV file first.");
      return;
    }

    setSavingQuestion(true);
    setBulkImporting(true);
    setError(null);
    setSuccess(null);
    setBulkImportResult(null);

    try {
      const records = parseCsvRecords(bulkInput);
      const importErrors: string[] = [];
      let imported = 0;
      let orderCursor = nextQuestionOrder;

      for (let index = 0; index < records.length; index += 1) {
        try {
          await createAssessmentQuestion(assessmentId, buildBulkPayload(records[index], orderCursor));
          imported += 1;
          orderCursor += 1;
        } catch (err) {
          const label = records[index].question_text ? ` (${records[index].question_text.slice(0, 40)})` : "";
          importErrors.push(`Item ${index + 1}${label}: ${err instanceof Error ? err.message : "Import failed."}`);
        }
      }

      const refreshed = await refreshQuestions();
      resetQuestionForm(refreshed.length + 1);
      setBulkImportResult({ imported, failed: importErrors.length, errors: importErrors });

      if (imported > 0) {
        setSuccess(`Imported ${imported} question${imported === 1 ? "" : "s"}${importErrors.length ? ` with ${importErrors.length} failure(s)` : ""}.`);
      } else {
        setError("Bulk import failed. Fix the errors and try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import questions.");
    } finally {
      setSavingQuestion(false);
      setBulkImporting(false);
    }
  };

  const publish = async () => {
    setSavingQuestion(true);
    setError(null);

    try {
      await publishAssessment(assessmentId);
      setAssessment(await getAssessment(assessmentId));
      setSuccess("Quiz published successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish quiz.");
    } finally {
      setSavingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-ash">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-ash">
        <div className="alert alert-danger">Quiz not found.</div>
      </div>
    );
  }

  return (
    <div className="bg-ash min-vh-100">
      <div className="breadcrumbs-area quiz-fade-up">
        <h3>Quiz Questions</h3>
        <ul>
          <li>
            <Link href="/cbt/admin">Quiz Management</Link>
          </li>
          <li>Questions</li>
        </ul>
      </div>

      {error && <div className="alert alert-danger mg-b-20">{error}</div>}
      {success && <div className="alert alert-success mg-b-20">{success}</div>}

      <div className="row gutters-20">
        <div className="col-xl-8 col-12">
          <div className="card height-auto quiz-fade-up quiz-fade-up-delay-1">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Manage Questions</h3>
                </div>
                <span className={statusBadgeClass(assessment.status)}>{assessment.status}</span>
              </div>

              <div className="row">
                <div className="col-lg-5 col-12">
                  <div className="cbt-school-panel">
                    {questions.length === 0 ? (
                      <p className="text-muted mb-0">No questions yet.</p>
                    ) : (
                      <ul className="cbt-school-question-list">
                        {questions.map((question) => (
                          <li key={question.id} className={`cbt-school-question-row ${activeQuestionId === question.id ? "active" : ""}`}>
                            <div>
                              <div className="font-weight-bold text-dark">
                                {question.sort_order}. {question.question_text.slice(0, 60)}
                              </div>
                              <small className="text-muted">
                                {questionTypeLabels[question.question_type]} - {question.marks} mark(s)
                              </small>
                            </div>
                            <div className="cbt-school-question-actions">
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handleQuestionSelect(question)}>
                                Edit
                              </button>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => deleteQuestion(question.id)} disabled={savingQuestion}>
                                Delete
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button type="button" className="btn btn-primary" onClick={() => resetQuestionForm(nextQuestionOrder)}>
                    + New Question
                  </button>

                  <div className="cbt-school-panel mt-3">
                    <h5>Bulk Import Questions</h5>
                    <p className="text-muted small">
                      Paste CSV rows or upload a CSV file, then import all questions at once.
                    </p>
                    <p className="text-muted small">
                      Use <code>|</code> to separate values in <code>options</code> and <code>correct_answers</code>.
                    </p>

                    <textarea className="form-control mb-2" rows={9} value={bulkInput} onChange={(event) => setBulkInput(event.target.value)} placeholder="Paste CSV bulk payload here" />
                    <input type="file" accept=".csv,text/csv,text/plain" className="form-control mb-3" onChange={handleBulkFileSelect} />

                    <div className="cbt-actions">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setBulkInput(bulkImportTemplate)}>
                        Use CSV Template
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleDownloadCsvTemplate}>
                        Download CSV
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => {
                        setBulkInput("");
                        setBulkImportResult(null);
                      }}>
                        Clear
                      </button>
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleBulkImport} disabled={bulkImporting || !bulkInput.trim()}>
                        {bulkImporting ? "Importing..." : "Import Questions"}
                      </button>
                    </div>

                    {bulkImportResult && (
                      <div className={`alert ${bulkImportResult.failed > 0 ? "alert-warning" : "alert-success"} mt-3 mb-0`}>
                        <div className="font-weight-bold">Imported: {bulkImportResult.imported} | Failed: {bulkImportResult.failed}</div>
                        {bulkImportResult.errors.length > 0 && (
                          <ul className="mb-0 pl-3">
                            {bulkImportResult.errors.slice(0, 5).map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        )}
                        {bulkImportResult.errors.length > 5 && <div className="small mt-1">Showing first 5 errors only.</div>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-lg-7 col-12">
                  <div className="cbt-school-panel">
                    <h4>{isEditingQuestion ? "Edit Question" : "Add Question"}</h4>

                    <div className="form-group">
                      <label>Question Text *</label>
                      <textarea value={questionForm.question_text} onChange={(event) => setQuestionForm({ ...questionForm, question_text: event.target.value })} className="form-control" rows={3} />
                    </div>

                    <div className="row gutters-20">
                      <div className="col-md-6 col-12 form-group">
                        <label>Question Type</label>
                        <select value={questionForm.question_type} onChange={(event) => updateQuestionType(event.target.value as QuestionType)} className="form-control">
                          {Object.entries(questionTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-3 col-6 form-group">
                        <label>Marks</label>
                        <input type="number" min="1" value={questionForm.marks} onChange={(event) => setQuestionForm({ ...questionForm, marks: Number(event.target.value) })} className="form-control" />
                      </div>
                      <div className="col-md-3 col-6 form-group">
                        <label>Order</label>
                        <input type="number" min="1" value={questionForm.sort_order} onChange={(event) => setQuestionForm({ ...questionForm, sort_order: Number(event.target.value) })} className="form-control" />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Explanation (optional)</label>
                      <textarea value={questionForm.explanation} onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })} className="form-control" rows={2} />
                    </div>

                    {questionForm.question_type === "short_answer" ? (
                      <div className="form-group">
                        <label>Correct Answer *</label>
                        <textarea value={questionForm.correct_answer} onChange={(event) => setQuestionForm({ ...questionForm, correct_answer: event.target.value })} className="form-control" rows={4} placeholder="Enter the accepted answer." />
                        <small className="text-muted">This backend supports one accepted answer for short-answer grading.</small>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Options *</label>
                        {questionForm.options.map((option, index) => (
                          <div key={option.id ?? `option-${index}`} className="cbt-school-option-row">
                            <input type="text" value={option.option_text} onChange={(event) => updateOptionText(index, event.target.value)} className="form-control" placeholder={`Option ${index + 1}`} readOnly={questionForm.question_type === "true_false"} />
                            <label className="cbt-school-correct">
                              <input type={questionForm.question_type === "multiple_select" ? "checkbox" : "radio"} name="correct-option" checked={option.is_correct} onChange={(event) => updateOptionCorrect(index, event.target.checked)} />
                              <span>Correct</span>
                            </label>
                            {questionForm.question_type !== "true_false" && (
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeOption(index)}>
                                Remove
                              </button>
                            )}
                          </div>
                        ))}

                        {questionForm.question_type !== "true_false" && (
                          <button type="button" onClick={addOption} className="btn btn-sm btn-outline-secondary">
                            + Add Option
                          </button>
                        )}
                      </div>
                    )}

                    <div className="cbt-school-form-footer">
                      <button type="button" className="btn btn-outline-secondary" onClick={() => resetQuestionForm(nextQuestionOrder)}>
                        Reset
                      </button>
                      <button type="button" className="btn btn-primary" onClick={saveQuestion} disabled={savingQuestion}>
                        {savingQuestion ? "Saving..." : "Save Question"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-12">
          <div className="card height-auto quiz-fade-up quiz-fade-up-delay-2">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Quiz Summary</h3>
                </div>
              </div>
              <ul className="cbt-summary-list">
                <li><span>Title</span><strong>{assessment.title}</strong></li>
                <li><span>Status</span><strong>{assessment.status}</strong></li>
                <li><span>Configured Questions</span><strong>{questions.length}</strong></li>
                <li><span>Pass Mark</span><strong>{assessment.pass_mark ?? 0}</strong></li>
                <li><span>Duration</span><strong>{assessment.duration_minutes || 0} min</strong></li>
              </ul>
              {questionMismatch && (
                <div className="alert alert-warning mt-3 mb-0">
                  Total questions is {assessment.total_questions || 0}, but you have {questions.length} configured.
                </div>
              )}
            </div>
          </div>

          <div className="card height-auto quiz-fade-up quiz-fade-up-delay-3">
            <div className="card-body bg-light-blue">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Navigation</h3>
                </div>
              </div>
              <div className="cbt-actions">
                <Link className="btn btn-outline-secondary" href={`/cbt/admin/${assessmentId}/edit`}>
                  Back to Settings
                </Link>
                <Link className="btn btn-outline-secondary" href="/cbt/admin">
                  Back to Quiz List
                </Link>
                <button type="button" className="btn btn-primary" onClick={publish} disabled={savingQuestion || questions.length === 0}>
                  Publish Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
