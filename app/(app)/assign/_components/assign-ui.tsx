"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  createStaffCourseAssignment,
  createStaffExamOfficer,
  deleteStaffCourseAssignment,
  deleteStaffExamOfficer,
  listCourses,
  listDepartments,
  listLevels,
  listSemesters,
  listSessions,
  listStaff,
  listStaffCourseAssignments,
  listStaffExamOfficers,
  updateStaffCourseAssignment,
  updateStaffExamOfficer,
  type AcademicSession,
  type Course,
  type Department,
  type Level,
  type Semester,
  type Staff,
  type StaffCourseAssignment,
  type StaffExamOfficer,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

type Feedback = { type: "success" | "danger"; message: string } | null;

type AssignmentFilters = {
  search: string;
  staffId: string;
  sessionId: string;
  departmentId: string;
};

type FilterState = AssignmentFilters & { scope?: string };

const emptyFilters: AssignmentFilters = {
  search: "",
  staffId: "",
  sessionId: "",
  departmentId: "",
};

type AssignmentOptions = {
  staff: Staff[];
  sessions: AcademicSession[];
  semesters: Semester[];
  departments: Department[];
  levels: Level[];
  courses: Course[];
};

const emptyOptions: AssignmentOptions = {
  staff: [],
  sessions: [],
  semesters: [],
  departments: [],
  levels: [],
  courses: [],
};

export function LecturerCourseAssignmentsPage() {
  const { user } = useAuth();
  const canManageUsers = Boolean(user?.capabilities?.manage_users);
  const [options, setOptions] = useState<AssignmentOptions>(emptyOptions);
  const [assignments, setAssignments] = useState<StaffCourseAssignment[]>([]);
  const [form, setForm] = useState({
    staffId: "",
    sessionId: "",
    semesterId: "",
    departmentId: "",
    levelId: "",
    courseId: "",
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, sessions, semesters, departments, levels, courses, assignmentData] = await Promise.all([
        listStaff(),
        listSessions(),
        listSemesters(),
        listDepartments(),
        listLevels(),
        listCourses(),
        listStaffCourseAssignments(),
      ]);
      setOptions({ staff, sessions, semesters, departments, levels, courses });
      setAssignments(assignmentData);
      setForm((current) => ({
        staffId: current.staffId || String(staff[0]?.id || ""),
        sessionId: current.sessionId || String(sessions[0]?.id || ""),
        semesterId: current.semesterId || String(semesters[0]?.id || ""),
        departmentId: current.departmentId || String(departments[0]?.id || ""),
        levelId: current.levelId || String(levels[0]?.id || ""),
        courseId: current.courseId || String(courses[0]?.id || ""),
      }));
      setFeedback(null);
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load lecturer assignments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const coursesForDepartment = useMemo(
    () => options.courses.filter((course) => !form.departmentId || course.department_id === Number(form.departmentId)),
    [form.departmentId, options.courses],
  );

  const filteredAssignments = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch = query
        ? [
            assignment.staff?.full_name,
            assignment.staff?.staff_id,
            assignment.course?.code,
            assignment.course?.title,
            assignment.session?.name,
            assignment.semester?.name,
            assignment.department?.name,
            assignment.level?.name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;

      return (
        matchesSearch &&
        (!filters.staffId || assignment.staff_id === Number(filters.staffId)) &&
        (!filters.sessionId || assignment.session_id === Number(filters.sessionId)) &&
        (!filters.departmentId || assignment.department_id === Number(filters.departmentId))
      );
    });
  }, [assignments, filters]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        const payload = {
          staff_id: Number(form.staffId),
          session_id: Number(form.sessionId),
          semester_id: Number(form.semesterId),
          department_id: Number(form.departmentId),
          level_id: Number(form.levelId),
          course_id: Number(form.courseId),
        };

        if (editingId) {
          await updateStaffCourseAssignment(editingId, payload);
          setEditingId(null);
        } else {
          await createStaffCourseAssignment(payload);
        }
      },
      editingId ? "Lecturer course assignment updated." : "Lecturer course assignment created.",
      load,
      setFeedback,
    );
  };

  const startEdit = (assignment: StaffCourseAssignment) => {
    setEditingId(assignment.id);
    setForm({
      staffId: String(assignment.staff_id),
      sessionId: String(assignment.session_id),
      semesterId: String(assignment.semester_id),
      departmentId: String(assignment.department_id),
      levelId: String(assignment.level_id),
      courseId: String(assignment.course_id),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const removeAssignment = async (assignment: StaffCourseAssignment) => {
    if (!window.confirm(`Remove ${assignment.staff?.full_name || "this staff"} from ${assignment.course?.code || "this course"}?`)) {
      return;
    }

    await runAction(
      async () => {
        await deleteStaffCourseAssignment(assignment.id);
      },
      "Lecturer course assignment removed.",
      load,
      setFeedback,
    );
  };

  return (
    <AssignShell title="Lecturer to Course" current="Lecturer to Course">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard title={editingId ? "Edit Lecturer to Course" : "Assign Lecturer to Course"} disabled={!canManageUsers} onSubmit={submit}>
            <SelectField label="Staff" value={form.staffId} onChange={(value) => setFormField(setForm, "staffId", value)}>
              <option value="">Select Staff</option>
              {options.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name} ({staff.staff_id})
                </option>
              ))}
            </SelectField>
            <SelectField label="Session" value={form.sessionId} onChange={(value) => setFormField(setForm, "sessionId", value)}>
              <option value="">Select Session</option>
              {options.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Semester" value={form.semesterId} onChange={(value) => setFormField(setForm, "semesterId", value)}>
              <option value="">Select Semester</option>
              {options.semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Department" value={form.departmentId} onChange={(value) => setFormField(setForm, "departmentId", value)}>
              <option value="">Select Department</option>
              {options.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Level" value={form.levelId} onChange={(value) => setFormField(setForm, "levelId", value)}>
              <option value="">Select Level</option>
              {options.levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Course" value={form.courseId} onChange={(value) => setFormField(setForm, "courseId", value)}>
              <option value="">Select Course</option>
              {coursesForDepartment.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.title}
                </option>
              ))}
            </SelectField>
            <button type="submit" className="btn btn-primary mt-3">
              {editingId ? "Update Assignment" : "Assign Course"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <FilterCard
            filters={filters}
            setFilters={setFilters}
            options={options}
            searchPlaceholder="Search staff, course, session, semester, department or level"
          />
          <TableCard
            title="Assigned Lecturers to Courses"
            loading={loading}
            headers={["Staff", "Course", "Session", "Semester", "Department", "Level", "Actions"]}
            rows={filteredAssignments.map((assignment) => [
              assignment.staff?.full_name || "",
              `${assignment.course?.code || ""} ${assignment.course?.title || ""}`.trim(),
              assignment.session?.name || "",
              assignment.semester?.name || "",
              assignment.department?.name || "",
              assignment.level?.name || "",
              <div key={`actions-${assignment.id}`} className="d-flex">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary mr-1"
                  disabled={!canManageUsers}
                  onClick={() => startEdit(assignment)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  disabled={!canManageUsers}
                  onClick={() => void removeAssignment(assignment)}
                >
                  Remove
                </button>
              </div>,
            ])}
          />
        </div>
      </div>
    </AssignShell>
  );
}

export function ExamOfficerAssignmentsPage() {
  const { user } = useAuth();
  const canManageUsers = Boolean(user?.capabilities?.manage_users);
  const [options, setOptions] = useState<AssignmentOptions>(emptyOptions);
  const [assignments, setAssignments] = useState<StaffExamOfficer[]>([]);
  const [form, setForm] = useState({
    staffId: "",
    sessionId: "",
    semesterId: "",
    departmentId: "",
    levelId: "",
    scope: "department",
  });
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>({ ...emptyFilters, scope: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, sessions, semesters, departments, levels, courses, assignmentData] = await Promise.all([
        listStaff(),
        listSessions(),
        listSemesters(),
        listDepartments(),
        listLevels(),
        listCourses(),
        listStaffExamOfficers(),
      ]);
      setOptions({ staff, sessions, semesters, departments, levels, courses });
      setAssignments(assignmentData);
      setForm((current) => ({
        ...current,
        staffId: current.staffId || String(staff[0]?.id || ""),
        sessionId: current.sessionId || String(sessions[0]?.id || ""),
        semesterId: current.semesterId || String(semesters[0]?.id || ""),
        departmentId: current.departmentId || String(departments[0]?.id || ""),
        levelId: current.levelId || String(levels[0]?.id || ""),
      }));
      setFeedback(null);
    } catch (error) {
      setFeedback(toDanger(error, "Unable to load exam officer assignments."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredAssignments = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const scopeLabel = assignment.scope === "department" ? "Department-wide" : "Department + Level";
      const matchesSearch = query
        ? [
            assignment.staff?.full_name,
            assignment.staff?.staff_id,
            assignment.session?.name,
            assignment.semester?.name,
            assignment.department?.name,
            assignment.level?.name,
            scopeLabel,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true;

      return (
        matchesSearch &&
        (!filters.staffId || assignment.staff_id === Number(filters.staffId)) &&
        (!filters.sessionId || assignment.session_id === Number(filters.sessionId)) &&
        (!filters.departmentId || assignment.department_id === Number(filters.departmentId)) &&
        (!filters.scope || assignment.scope === filters.scope)
      );
    });
  }, [assignments, filters]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await runAction(
      async () => {
        const payload = {
          staff_id: Number(form.staffId),
          session_id: Number(form.sessionId),
          semester_id: Number(form.semesterId),
          department_id: Number(form.departmentId),
          scope: form.scope as "department" | "department_level",
          level_id: form.scope === "department_level" ? Number(form.levelId) : null,
        };

        if (editingId) {
          await updateStaffExamOfficer(editingId, payload);
          setEditingId(null);
        } else {
          await createStaffExamOfficer(payload);
        }
      },
      editingId ? "Exam officer assignment updated." : "Exam officer assignment created.",
      load,
      setFeedback,
    );
  };

  const startEdit = (assignment: StaffExamOfficer) => {
    setEditingId(assignment.id);
    setForm({
      staffId: String(assignment.staff_id),
      sessionId: String(assignment.session_id),
      semesterId: String(assignment.semester_id),
      departmentId: String(assignment.department_id),
      levelId: assignment.level_id ? String(assignment.level_id) : "",
      scope: assignment.scope,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const removeAssignment = async (assignment: StaffExamOfficer) => {
    if (!window.confirm(`Remove exam officer assignment for ${assignment.staff?.full_name || "this staff"}?`)) {
      return;
    }

    await runAction(
      async () => {
        await deleteStaffExamOfficer(assignment.id);
      },
      "Exam officer assignment removed.",
      load,
      setFeedback,
    );
  };

  return (
    <AssignShell title="Exam-Officer to Dept/Level" current="Exam-Officer to Dept/Level">
      <FeedbackAlert feedback={feedback} />
      <div className="row">
        <div className="col-lg-4 col-12">
          <FormCard
            title={editingId ? "Edit Exam-Officer to Dept/Level" : "Assign Exam-Officer to Dept/Level"}
            disabled={!canManageUsers}
            onSubmit={submit}
          >
            <SelectField label="Staff" value={form.staffId} onChange={(value) => setFormField(setForm, "staffId", value)}>
              <option value="">Select Staff</option>
              {options.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name} ({staff.staff_id})
                </option>
              ))}
            </SelectField>
            <SelectField label="Session" value={form.sessionId} onChange={(value) => setFormField(setForm, "sessionId", value)}>
              <option value="">Select Session</option>
              {options.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Semester" value={form.semesterId} onChange={(value) => setFormField(setForm, "semesterId", value)}>
              <option value="">Select Semester</option>
              {options.semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.name}
                </option>
              ))}
            </SelectField>
            <SelectField label="Department" value={form.departmentId} onChange={(value) => setFormField(setForm, "departmentId", value)}>
              <option value="">Select Department</option>
              {options.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Scope"
              value={form.scope}
              onChange={(value) => setForm((current) => ({ ...current, scope: value }))}
            >
              <option value="department">Department-wide</option>
              <option value="department_level">Department + Level</option>
            </SelectField>
            {form.scope === "department_level" ? (
              <SelectField label="Level" value={form.levelId} onChange={(value) => setFormField(setForm, "levelId", value)}>
                <option value="">Select Level</option>
                {options.levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </SelectField>
            ) : null}
            <button type="submit" className="btn btn-primary mt-3">
              {editingId ? "Update Assignment" : "Assign Officer"}
            </button>
            {editingId ? (
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>
                Cancel Edit
              </button>
            ) : null}
          </FormCard>
        </div>
        <div className="col-lg-8 col-12">
          <FilterCard
            filters={filters}
            setFilters={setFilters}
            options={options}
            searchPlaceholder="Search staff, session, semester, department, scope or level"
            includeScope
          />
          <TableCard
            title="Assigned Exam-Officers to Dept/Level"
            loading={loading}
            headers={["Staff", "Session", "Semester", "Department", "Scope", "Level", "Actions"]}
            rows={filteredAssignments.map((assignment) => [
              assignment.staff?.full_name || "",
              assignment.session?.name || "",
              assignment.semester?.name || "",
              assignment.department?.name || "",
              assignment.scope === "department" ? "Department-wide" : "Department + Level",
              assignment.level?.name || "All Levels",
              <div key={`actions-${assignment.id}`} className="d-flex">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary mr-1"
                  disabled={!canManageUsers}
                  onClick={() => startEdit(assignment)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  disabled={!canManageUsers}
                  onClick={() => void removeAssignment(assignment)}
                >
                  Remove
                </button>
              </div>,
            ])}
          />
        </div>
      </div>
    </AssignShell>
  );
}

function AssignShell({ title, current, children }: { title: string; current: string; children: ReactNode }) {
  return (
    <>
      <div className="breadcrumbs-area">
        <h3>{title}</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>Assign</li>
          <li>{current}</li>
        </ul>
      </div>
      {children}
    </>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <>
      <label className="mt-3">{label}</label>
      <select className="form-control" value={value} onChange={(event) => onChange(event.target.value)} required>
        {children}
      </select>
    </>
  );
}

function FilterCard({
  filters,
  setFilters,
  options,
  searchPlaceholder,
  includeScope = false,
}: {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  options: AssignmentOptions;
  searchPlaceholder: string;
  includeScope?: boolean;
}) {
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters((current) => ({
      search: "",
      staffId: "",
      sessionId: "",
      departmentId: "",
      ...(Object.prototype.hasOwnProperty.call(current, "scope") ? { scope: "" } : {}),
    }));
  };

  return (
    <div className="card height-auto">
      <div className="card-body">
        <div className="heading-layout1">
          <div className="item-title">
            <h3>Search / Filter</h3>
          </div>
        </div>
        <form className="row gutters-8 align-items-end" onSubmit={(event) => event.preventDefault()}>
          <div className="col-lg-4 col-md-6 col-12 form-group">
            <label>Search</label>
            <input
              className="form-control"
              placeholder={searchPlaceholder}
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </div>
          <div className="col-lg-2 col-md-6 col-12 form-group">
            <label>Staff</label>
            <select className="form-control" value={filters.staffId} onChange={(event) => updateFilter("staffId", event.target.value)}>
              <option value="">All Staff</option>
              {options.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-lg-2 col-md-6 col-12 form-group">
            <label>Session</label>
            <select className="form-control" value={filters.sessionId} onChange={(event) => updateFilter("sessionId", event.target.value)}>
              <option value="">All Sessions</option>
              {options.sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-lg-2 col-md-6 col-12 form-group">
            <label>Department</label>
            <select
              className="form-control"
              value={filters.departmentId}
              onChange={(event) => updateFilter("departmentId", event.target.value)}
            >
              <option value="">All Departments</option>
              {options.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          {includeScope ? (
            <div className="col-lg-2 col-md-6 col-12 form-group">
              <label>Scope</label>
              <select className="form-control" value={filters.scope || ""} onChange={(event) => updateFilter("scope", event.target.value)}>
                <option value="">All Scopes</option>
                <option value="department">Department-wide</option>
                <option value="department_level">Department + Level</option>
              </select>
            </div>
          ) : null}
          <div className="col-lg-2 col-md-6 col-12 form-group">
            <button type="button" className="btn btn-outline-secondary" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormCard({
  title,
  disabled,
  onSubmit,
  children,
}: {
  title: string;
  disabled: boolean;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <div className="card height-auto">
      <div className="card-body">
        <div className="heading-layout1">
          <div className="item-title">
            <h3>{title}</h3>
          </div>
        </div>
        <form className="new-added-form" onSubmit={onSubmit}>
          <fieldset disabled={disabled}>{children}</fieldset>
        </form>
      </div>
    </div>
  );
}

function TableCard({
  title,
  loading,
  headers,
  rows,
}: {
  title: string;
  loading: boolean;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="card height-auto">
      <div className="card-body">
        <div className="heading-layout1">
          <div className="item-title">
            <h3>{title}</h3>
          </div>
        </div>
        {loading ? (
          <div className="text-muted">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length} className="text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackAlert({ feedback }: { feedback: Feedback }) {
  if (!feedback) {
    return null;
  }

  return (
    <div className={`alert alert-${feedback.type}`} role="alert">
      {feedback.message}
    </div>
  );
}

function setFormField<T extends Record<string, string>>(
  setForm: React.Dispatch<React.SetStateAction<T>>,
  key: keyof T,
  value: string,
) {
  setForm((current) => ({ ...current, [key]: value }));
}

async function runAction(
  action: () => Promise<void>,
  successMessage: string,
  reload: () => Promise<void>,
  setFeedback: (feedback: Feedback) => void,
) {
  try {
    await action();
    setFeedback({ type: "success", message: successMessage });
    await reload();
  } catch (error) {
    setFeedback(toDanger(error, "Action failed."));
  }
}

function toDanger(error: unknown, fallback: string): Exclude<Feedback, null> {
  return {
    type: "danger",
    message: error instanceof Error ? error.message : fallback,
  };
}
