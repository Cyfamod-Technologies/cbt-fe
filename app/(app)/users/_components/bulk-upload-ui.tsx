"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createStaff,
  createUser,
  listDepartments,
  listLevels,
  type Department,
  type Level,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

type ImportKind = "student" | "staff";
type ParsedRow = Record<string, string>;
type ImportResult = { row: number; name: string; status: "success" | "error"; message: string };
type Feedback = { type: "success" | "danger" | "warning" | "info"; message: string } | null;

const studentColumns = ["matric_no", "student_id_no", "full_name", "department", "level", "email", "phone", "status"];
const staffColumns = ["staff_id", "full_name", "email", "phone", "status"];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function BulkUploadPage({ kind }: { kind: ImportKind }) {
  const { user } = useAuth();
  const canManageUsers = Boolean(user?.capabilities?.manage_users);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loadingAcademic, setLoadingAcademic] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const config = kind === "student"
    ? {
        title: "Student Bulk Upload",
        parentHref: "/users/students",
        parentLabel: "Students",
        columns: studentColumns,
        templateUrl: "/templates/student-bulk-upload-template.csv",
        kindLabel: "Students",
      }
    : {
        title: "Staff Bulk Upload",
        parentHref: "/users/staff",
        parentLabel: "Staff",
        columns: staffColumns,
        templateUrl: "/templates/staff-bulk-upload-template.csv",
        kindLabel: "Staff",
      };

  const currentStep = useMemo(() => {
    if (rows.length > 0) return 3;
    return 2;
  }, [rows.length]);

  useEffect(() => {
    if (kind !== "student") return;
    setLoadingAcademic(true);
    Promise.all([listDepartments(), listLevels()])
      .then(([depts, lvls]) => { setDepartments(depts); setLevels(lvls); })
      .catch(() => {})
      .finally(() => setLoadingAcademic(false));
  }, [kind]);

  useEffect(() => {
    if (rows.length > 0) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [rows.length]);

  const handleFileChosen = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFeedback({ type: "warning", message: "Only CSV files are supported. Please choose a .csv file." });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFeedback({ type: "warning", message: "File is larger than 5MB. Split it and try again." });
      return;
    }
    setSelectedFile(file);
    setFeedback({ type: "info", message: `File selected: ${file.name}` });
  }, []);

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChosen(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileChosen(file);
  };

  const handleParseAndPreview = async () => {
    if (!selectedFile) {
      setFeedback({ type: "warning", message: "Please choose a CSV file first." });
      return;
    }
    try {
      const text = await selectedFile.text();
      const parsed = parseCsv(text);
      setRows(parsed);
      setResults([]);
      setFileName(selectedFile.name);
      setFeedback({
        type: "success",
        message: `${parsed.length} row${parsed.length === 1 ? "" : "s"} ready. Review below and click Import.`,
      });
    } catch (err) {
      setRows([]);
      setFileName("");
      setFeedback({ type: "danger", message: err instanceof Error ? err.message : "Unable to read CSV file." });
    }
  };

  const importRows = async () => {
    if (!canManageUsers || rows.length === 0) return;
    setImporting(true);
    setResults([]);
    const nextResults: ImportResult[] = [];

    for (const [index, row] of rows.entries()) {
      try {
        if (kind === "student") {
          const department = findDepartment(departments, row.department);
          const level = findLevel(levels, row.level);
          if (!department) throw new Error(`Department "${row.department}" not found.`);
          if (!level) throw new Error(`Level "${row.level}" not found.`);
          const response = await createUser({
            role: "student",
            matric_no: row.matric_no,
            student_id_no: row.student_id_no,
            full_name: row.full_name,
            department_id: department.id,
            level_id: level.id,
            email: row.email || undefined,
            phone: row.phone || undefined,
            status: row.status || "active",
          });
          nextResults.push({
            row: index + 2,
            name: row.full_name || row.matric_no,
            status: "success",
            message: response.temporary_password ? `Created. Password: ${response.temporary_password}` : "Created.",
          });
        } else {
          const response = await createStaff({
            staff_id: row.staff_id,
            full_name: row.full_name,
            email: row.email,
            phone: row.phone || null,
          });
          nextResults.push({
            row: index + 2,
            name: row.full_name || row.staff_id,
            status: "success",
            message: response.temporary_password ? `Created. Password: ${response.temporary_password}` : "Created.",
          });
        }
      } catch (err) {
        nextResults.push({
          row: index + 2,
          name: row.full_name || row.matric_no || row.staff_id || "Unknown",
          status: "error",
          message: err instanceof Error ? err.message : "Import failed.",
        });
      }
      setResults([...nextResults]);
    }

    setImporting(false);
    const successCount = nextResults.filter((r) => r.status === "success").length;
    setFeedback({
      type: nextResults.some((r) => r.status === "error") ? "warning" : "success",
      message: `${successCount} of ${nextResults.length} rows imported successfully.`,
    });
  };

  const resetAll = () => {
    setRows([]);
    setResults([]);
    setFileName("");
    setSelectedFile(null);
    setFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const previewRows = useMemo(() => rows.slice(0, 10), [rows]);

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{config.title}</h3>
        <ul>
          <li><Link href="/dashboard">Home</Link></li>
          <li><Link href={config.parentHref}>{config.parentLabel}</Link></li>
          <li>Bulk Upload</li>
        </ul>
      </div>

      {/* Progress Steps */}
      <div className="bulk-upload-progress mb-4">
        <div className={`progress-step active completed`}>
          <div className="step-number"><i className="fas fa-check" /></div>
          <div className="step-label">Prepare</div>
        </div>
        <div className="progress-line" />
        <div className={`progress-step ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
          <div className="step-number">{currentStep > 2 ? <i className="fas fa-check" /> : "2"}</div>
          <div className="step-label">Upload File</div>
        </div>
        <div className="progress-line" />
        <div className={`progress-step ${currentStep >= 3 ? "active" : ""}`}>
          <div className="step-number">3</div>
          <div className="step-label">Review &amp; Import</div>
        </div>
      </div>

      <div className="row">
        {/* Step 1: Prepare / Reference Card */}
        <div className="col-lg-4">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="step-card-header">
                <div className="step-badge step-badge-success">Step 1</div>
                <h4>Prepare</h4>
                <p className="text-muted mb-0">
                  {kind === "student"
                    ? "Review required fields and available departments/levels."
                    : "Review the required CSV fields before uploading."}
                </p>
              </div>

              <div className="mt-4">
                <label className="form-label-lg">Required CSV Columns</label>
                <div className="columns-list">
                  {config.columns.map((col) => (
                    <span key={col} className="column-tag">{col}</span>
                  ))}
                </div>
              </div>

              {kind === "student" && (
                <>
                  <div className="mt-3">
                    <label className="form-label-lg">
                      <i className="fas fa-building mr-2" />
                      Available Departments
                    </label>
                    {loadingAcademic ? (
                      <p className="text-muted small">Loading...</p>
                    ) : departments.length === 0 ? (
                      <p className="text-muted small">No departments found.</p>
                    ) : (
                      <ul className="ref-list">
                        {departments.map((d) => <li key={d.id}>{d.name}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="mt-3">
                    <label className="form-label-lg">
                      <i className="fas fa-layer-group mr-2" />
                      Available Levels
                    </label>
                    {loadingAcademic ? (
                      <p className="text-muted small">Loading...</p>
                    ) : levels.length === 0 ? (
                      <p className="text-muted small">No levels found.</p>
                    ) : (
                      <ul className="ref-list">
                        {levels.map((l) => <li key={l.id}>{l.name}</li>)}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Guide */}
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h4>
                    <i className="fas fa-lightbulb text-warning mr-2" />
                    Quick Guide
                  </h4>
                </div>
              </div>
              <ol className="bulk-upload-steps">
                <li>Review the required columns above.</li>
                <li>Download the CSV template.</li>
                <li>Fill in the {kind === "student" ? "student" : "staff"} details.</li>
                <li>Upload and preview the file.</li>
                <li>Confirm the import.</li>
              </ol>
              <div className="alert alert-info small mb-0">
                <i className="fas fa-info-circle mr-2" />
                {kind === "student"
                  ? "Use exact department and level names from the reference list."
                  : "Staff email is required and must be unique."}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Download & Upload */}
        <div className="col-lg-8">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="step-card-header">
                <div className="step-badge">Step 2</div>
                <h4>Download Template &amp; Upload</h4>
              </div>

              {feedback && (
                <div className={`alert alert-${feedback.type}`} role="alert">
                  {feedback.type === "success" && <i className="fas fa-check-circle mr-2" />}
                  {feedback.type === "danger" && <i className="fas fa-exclamation-circle mr-2" />}
                  {feedback.type === "warning" && <i className="fas fa-exclamation-triangle mr-2" />}
                  {feedback.type === "info" && <i className="fas fa-info-circle mr-2" />}
                  {feedback.message}
                </div>
              )}

              <div className="template-download-section">
                <div className="template-info">
                  <div className="template-icon">
                    <i className="fas fa-file-csv" />
                  </div>
                  <div className="template-details">
                    <h5>{config.kindLabel} Upload Template</h5>
                    <p className="text-muted mb-0">Download, fill in details, then upload below.</p>
                  </div>
                </div>
                <a href={config.templateUrl} download className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark">
                  <i className="fas fa-download mr-2" />
                  Download Template
                </a>
              </div>

              <hr className="my-4" />

              <div
                className={`bulk-upload-dropzone${isDragOver ? " dragover" : ""}`}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                onDrop={handleDrop}
              >
                <div className="dropzone-icon">
                  <i className="fas fa-cloud-upload-alt" />
                </div>
                <p className="lead mb-1">Drag &amp; drop your completed CSV here</p>
                <p className="text-muted small mb-3">Only .csv files are supported. Maximum size 5MB.</p>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-folder-open mr-2" />
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="d-none"
                  onChange={handleFileInputChange}
                />
                {selectedFile && (
                  <div className="selected-file-info mt-3">
                    <i className="fas fa-file-csv mr-2" />
                    <span>{selectedFile.name}</span>
                    <span className="file-size ml-2">({formatBytes(selectedFile.size)})</span>
                  </div>
                )}
              </div>

              <div className="upload-actions mt-4">
                <button
                  type="button"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark mr-3"
                  onClick={() => void handleParseAndPreview()}
                  disabled={!selectedFile}
                >
                  <i className="fas fa-eye mr-2" />
                  Preview File
                </button>
                <button type="button" className="btn-fill-lg btn-light text-dark" onClick={resetAll}>
                  <i className="fas fa-redo mr-2" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Preview & Import */}
      {rows.length > 0 && (
        <div ref={previewRef} className="card height-auto mb-4">
          <div className="card-body">
            <div className="step-card-header d-flex justify-content-between align-items-start flex-wrap" style={{ gap: 12 }}>
              <div>
                <div className="step-badge step-badge-success">Step 3</div>
                <h4>Review &amp; Import</h4>
                <p className="text-muted mb-0">
                  {rows.length} row{rows.length !== 1 ? "s" : ""} from <strong>{fileName}</strong>. Click &quot;Import&quot; to create the records.
                </p>
              </div>
              <button
                type="button"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                disabled={!canManageUsers || importing}
                onClick={() => void importRows()}
              >
                {importing ? (
                  <>
                    <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true" />
                    Importing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-import mr-2" />
                    Import {rows.length} {config.kindLabel}
                  </>
                )}
              </button>
            </div>

            <div className="table-responsive mt-4">
              <table className="table display text-nowrap bulk-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {config.columns.map((col) => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan={config.columns.length + 1} className="text-center text-muted">
                        No rows available.
                      </td>
                    </tr>
                  ) : (
                    previewRows.map((row, i) => (
                      <tr key={`${row.full_name || row.matric_no || row.staff_id}-${i}`}>
                        <td>{i + 1}</td>
                        {config.columns.map((col) => (
                          <td key={col}>{row[col] || "—"}</td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="text-muted small text-center mt-2">
                  Showing first 10 of {rows.length} rows.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Results */}
      {results.length > 0 && (
        <div className="card height-auto mb-4">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h4>Import Results</h4>
              </div>
              <span className="badge badge-info">
                {results.filter((r) => r.status === "success").length} / {results.length} succeeded
              </span>
            </div>
            <div className="table-responsive mt-3">
              <table className="table display">
                <thead>
                  <tr>
                    <th>CSV Row</th>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={`${result.row}-${result.name}`}>
                      <td>{result.row}</td>
                      <td>{result.name}</td>
                      <td>
                        <span className={result.status === "success" ? "badge badge-success" : "badge badge-danger"}>
                          {result.status}
                        </span>
                      </td>
                      <td>{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .bulk-upload-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .step-number {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #e2e8f0;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.1rem;
          transition: all 0.3s ease;
        }
        .progress-step.active .step-number {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }
        .progress-step.completed .step-number {
          background: #22c55e;
          color: white;
        }
        .step-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: #64748b;
        }
        .progress-step.active .step-label {
          color: #1e293b;
        }
        .progress-line {
          width: 80px;
          height: 3px;
          background: #e2e8f0;
          margin: 0 1rem;
          margin-bottom: 1.5rem;
        }
        .step-card-header {
          margin-bottom: 1rem;
        }
        .step-card-header h4 {
          margin: 0.5rem 0 0.25rem;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .step-badge {
          display: inline-block;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
        }
        .step-badge-success {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
        }
        .form-label-lg {
          font-size: 0.9rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }
        .form-label-lg i {
          color: #6366f1;
        }
        .columns-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .column-tag {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 0.78rem;
          font-family: monospace;
          color: #475569;
        }
        .ref-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ref-list li {
          font-size: 0.875rem;
          color: #475569;
          padding: 4px 10px;
          background: #f8fafc;
          border-radius: 6px;
          border-left: 3px solid #6366f1;
        }
        .template-download-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border-radius: 12px;
          padding: 1.25rem;
          border: 1px solid #e2e8f0;
          flex-wrap: wrap;
          gap: 12px;
        }
        .template-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .template-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .template-icon i {
          font-size: 1.4rem;
          color: white;
        }
        .template-details h5 {
          margin: 0 0 0.2rem;
          font-size: 1rem;
          font-weight: 600;
        }
        .bulk-upload-dropzone {
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          padding: 2.5rem;
          text-align: center;
          transition: all 0.2s ease;
          background: #fafafa;
        }
        .bulk-upload-dropzone:hover,
        .bulk-upload-dropzone.dragover {
          border-color: #6366f1;
          background: #f5f3ff;
        }
        .dropzone-icon {
          margin-bottom: 1rem;
        }
        .dropzone-icon i {
          font-size: 3rem;
          color: #94a3b8;
        }
        .bulk-upload-dropzone.dragover .dropzone-icon i {
          color: #6366f1;
        }
        .bulk-upload-dropzone .lead {
          font-size: 1.05rem;
          font-weight: 600;
          color: #1e293b;
        }
        .selected-file-info {
          display: inline-flex;
          align-items: center;
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .selected-file-info .file-size {
          color: #64748b;
        }
        .upload-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .bulk-upload-steps {
          padding-left: 1.25rem;
          margin: 0.75rem 0;
        }
        .bulk-upload-steps li {
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #475569;
        }
        :global(.bulk-preview-table thead th) {
          background: #f1f5f9;
          font-weight: 600;
          font-size: 0.85rem;
        }
        @media (max-width: 768px) {
          .bulk-upload-progress {
            flex-direction: column;
            gap: 1rem;
          }
          .progress-line {
            width: 3px;
            height: 24px;
            margin: 0;
          }
          .template-download-section {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce<ParsedRow>((row, header, index) => {
      row[header] = (values[index] || "").trim();
      return row;
    }, {});
  });
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function findDepartment(departments: Department[], value: string) {
  const key = normalize(value);
  return departments.find((d) => normalize(d.name) === key || normalize(d.code) === key);
}

function findLevel(levels: Level[], value: string) {
  const key = normalize(value);
  return levels.find((l) => normalize(l.name) === key);
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 Bytes";
  const units = ["Bytes", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exp).toFixed(2)} ${units[exp]}`;
}
