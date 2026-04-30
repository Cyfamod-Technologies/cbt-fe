"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
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
type Feedback = { type: "success" | "danger" | "warning"; message: string } | null;

const studentColumns = ["matric_no", "student_id_no", "full_name", "department", "level", "email", "phone", "status"];
const staffColumns = ["staff_id", "full_name", "email", "phone", "status"];

export function BulkUploadPage({ kind }: { kind: ImportKind }) {
  const { user } = useAuth();
  const canManageUsers = Boolean(user?.capabilities?.manage_users);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [importing, setImporting] = useState(false);

  const config = kind === "student"
    ? {
        title: "Student Bulk Upload",
        parentHref: "/users/students",
        parentLabel: "Students",
        columns: studentColumns,
        sample: "matric_no,student_id_no,full_name,department,level,email,phone,status\nCYF/CSC/002,STU002,Ada Johnson,Computer Science,ND I,ada@example.com,08030000002,active",
      }
    : {
        title: "Staff Bulk Upload",
        parentHref: "/users/staff",
        parentLabel: "Staff",
        columns: staffColumns,
        sample: "staff_id,full_name,email,phone,status\nSTF-002,Grace Musa,grace@example.com,08030000003,active",
      };

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setResults([]);
    setFeedback(null);

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setRows(parsed);
      setFileName(file.name);
      setFeedback({ type: "success", message: `${parsed.length} row${parsed.length === 1 ? "" : "s"} ready for review.` });

      if (kind === "student") {
        const [departmentList, levelList] = await Promise.all([listDepartments(), listLevels()]);
        setDepartments(departmentList);
        setLevels(levelList);
      }
    } catch (error) {
      setRows([]);
      setFileName("");
      setFeedback({
        type: "danger",
        message: error instanceof Error ? error.message : "Unable to read CSV file.",
      });
    }
  };

  const importRows = async () => {
    if (!canManageUsers || rows.length === 0) {
      return;
    }

    setImporting(true);
    setResults([]);

    const nextResults: ImportResult[] = [];
    for (const [index, row] of rows.entries()) {
      try {
        if (kind === "student") {
          const department = findDepartment(departments, row.department);
          const level = findLevel(levels, row.level);

          if (!department) {
            throw new Error(`Department "${row.department}" was not found.`);
          }
          if (!level) {
            throw new Error(`Level "${row.level}" was not found.`);
          }

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
      } catch (error) {
        nextResults.push({
          row: index + 2,
          name: row.full_name || row.matric_no || row.staff_id || "Unknown",
          status: "error",
          message: error instanceof Error ? error.message : "Import failed.",
        });
      }
      setResults([...nextResults]);
    }

    setImporting(false);
    setFeedback({
      type: nextResults.some((result) => result.status === "error") ? "warning" : "success",
      message: `${nextResults.filter((result) => result.status === "success").length} of ${nextResults.length} rows imported.`,
    });
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{config.title}</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>
            <Link href={config.parentHref}>{config.parentLabel}</Link>
          </li>
          <li>Bulk Upload</li>
        </ul>
      </div>

      {feedback ? (
        <div className={`alert alert-${feedback.type}`} role="alert">
          {feedback.message}
        </div>
      ) : null}

      <div className="bulk-upload-grid">
        <div className="card height-auto">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h3>Upload CSV</h3>
              </div>
            </div>
            <label htmlFor={`${kind}-csv`}>CSV File</label>
            <input id={`${kind}-csv`} className="form-control" type="file" accept=".csv,text/csv" onChange={handleFile} />
            <p className="text-muted mt-3 mb-0">
              {fileName ? `Selected: ${fileName}` : `Required columns: ${config.columns.join(", ")}`}
            </p>
            <div className="cbt-actions mt-3">
              <button type="button" className="btn btn-primary" disabled={!canManageUsers || rows.length === 0 || importing} onClick={() => void importRows()}>
                {importing ? "Importing..." : `Import ${rows.length || ""} ${kind === "student" ? "Students" : "Staff"}`}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setRows([]);
                  setResults([]);
                  setFileName("");
                  setFeedback(null);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        <div className="card height-auto">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h3>Sample Format</h3>
              </div>
            </div>
            <pre className="csv-sample">{config.sample}</pre>
          </div>
        </div>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Preview</h3>
            </div>
            <span className="badge badge-info">{rows.length} rows</span>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length}>Upload a CSV file to preview rows before import.</td>
                  </tr>
                ) : (
                  previewRows.map((row, index) => (
                    <tr key={`${row.full_name || row.matric_no || row.staff_id}-${index}`}>
                      {config.columns.map((column) => (
                        <td key={column}>{row[column] || "-"}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="card height-auto">
          <div className="card-body">
            <div className="heading-layout1">
              <div className="item-title">
                <h3>Import Result</h3>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table">
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
                        <span className={result.status === "success" ? "badge badge-success" : "badge badge-danger"}>{result.status}</span>
                      </td>
                      <td>{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

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
  return departments.find((department) => normalize(department.name) === key || normalize(department.code) === key);
}

function findLevel(levels: Level[], value: string) {
  const key = normalize(value);
  return levels.find((level) => normalize(level.name) === key);
}
