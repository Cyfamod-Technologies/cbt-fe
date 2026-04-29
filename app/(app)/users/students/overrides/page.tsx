"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  listDepartments,
  listLevels,
  listUsers,
  updateUser,
  type Department,
  type Level,
  type SchoolUser,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

type OverrideDrafts = Record<
  number,
  {
    department_id: string;
    level_id: string;
  }
>;

type Feedback = { type: "success" | "danger"; message: string } | null;

export default function StudentOverridesPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<SchoolUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [drafts, setDrafts] = useState<OverrideDrafts>({});
  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const canManageUsers = Boolean(user?.capabilities?.manage_users);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [studentList, departmentList, levelList] = await Promise.all([
        listUsers("student"),
        listDepartments(),
        listLevels(),
      ]);

      setStudents(studentList);
      setDepartments(departmentList);
      setLevels(levelList);
      setDrafts(buildDrafts(studentList));
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load student overrides."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = (studentId: number, field: "department_id" | "level_id", value: string) => {
    setDrafts((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? { department_id: "", level_id: "" }),
        [field]: value,
      },
    }));
  };

  const saveOverride = async (student: SchoolUser) => {
    const draft = drafts[student.id] ?? { department_id: "", level_id: "" };

    setSavingStudentId(student.id);
    setFeedback(null);

    try {
      const updatedStudent = await updateUser(student.id, {
        department_id: draft.department_id ? Number(draft.department_id) : null,
        level_id: draft.level_id ? Number(draft.level_id) : null,
      });

      setStudents((current) => current.map((item) => (item.id === updatedStudent.id ? updatedStudent : item)));
      setDrafts((current) => ({
        ...current,
        [updatedStudent.id]: {
          department_id: updatedStudent.department_id ? String(updatedStudent.department_id) : "",
          level_id: updatedStudent.level_id ? String(updatedStudent.level_id) : "",
        },
      }));

      setFeedback({
        type: "success",
        message: `Updated ${student.name}'s department/level override.`,
      });
    } catch (error) {
      setFeedback(toDanger(error, "Unable to save override."));
    } finally {
      setSavingStudentId(null);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Overrides</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/users/students">Students</Link>
          </li>
          <li>Overrides</li>
        </ul>
      </div>

      {feedback ? (
        <div className={`alert alert-${feedback.type}`} role="alert">
          {feedback.message}
        </div>
      ) : null}

      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1 mb-0">
            <div className="item-title">
              <h3>Student Dept/Level Overrides</h3>
              <p className="mb-0 text-muted">
                Correct a student's department or level here when the imported assignment is wrong.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          {loading ? (
            <div className="text-muted">Loading overrides...</div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Matric No</th>
                    <th>Student ID No</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Level</th>
                    <th>Override Department</th>
                    <th>Override Level</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-muted">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const draft = drafts[student.id] ?? {
                        department_id: student.department_id ? String(student.department_id) : "",
                        level_id: student.level_id ? String(student.level_id) : "",
                      };
                      const hasChanges =
                        draft.department_id !== (student.department_id ? String(student.department_id) : "") ||
                        draft.level_id !== (student.level_id ? String(student.level_id) : "");

                      return (
                        <tr key={student.id}>
                          <td>{student.matric_no || "-"}</td>
                          <td>{student.student_id_no || "-"}</td>
                          <td>{student.name}</td>
                          <td>{student.department?.name || "-"}</td>
                          <td>{student.level?.name || "-"}</td>
                          <td>
                            <select
                              className="form-control"
                              value={draft.department_id}
                              onChange={(event) => updateDraft(student.id, "department_id", event.target.value)}
                              disabled={!canManageUsers}
                            >
                              <option value="">Unset department</option>
                              {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                  {department.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="form-control"
                              value={draft.level_id}
                              onChange={(event) => updateDraft(student.id, "level_id", event.target.value)}
                              disabled={!canManageUsers}
                            >
                              <option value="">Unset level</option>
                              {levels.map((level) => (
                                <option key={level.id} value={level.id}>
                                  {level.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-lg btn-gradient-yellow btn-hover-bluedark"
                              onClick={() => saveOverride(student)}
                              disabled={!canManageUsers || savingStudentId === student.id || !hasChanges}
                            >
                              {savingStudentId === student.id ? "Saving..." : "Save Override"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function buildDrafts(students: SchoolUser[]): OverrideDrafts {
  return students.reduce<OverrideDrafts>((accumulator, student) => {
    accumulator[student.id] = {
      department_id: student.department_id ? String(student.department_id) : "",
      level_id: student.level_id ? String(student.level_id) : "",
    };

    return accumulator;
  }, {});
}

function toDanger(error: unknown, fallback: string): Exclude<Feedback, null> {
  return {
    type: "danger",
    message: error instanceof Error ? error.message : fallback,
  };
}
