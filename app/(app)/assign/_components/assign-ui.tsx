"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Pagination } from "@/app/_components/Pagination";
import {
  updateCourse,
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
    courseId: "", // used only when editing a single assignment
  });
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(new Set());
  const [coursePickerSearch, setCoursePickerSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staff, sessions, semesters, departments, courses, assignmentData] = await Promise.all([
        listStaff(),
        listSessions(),
        listSemesters(),
        listDepartments(),
        listCourses(),
        listStaffCourseAssignments(),
      ]);
      setOptions({ staff, sessions, semesters, departments, levels: [], courses });
      setAssignments(assignmentData);
      setForm((current) => ({
        staffId: current.staffId || String(staff[0]?.id || ""),
        sessionId: current.sessionId || String(sessions[0]?.id || ""),
        semesterId: current.semesterId || String(semesters[0]?.id || ""),
        departmentId: current.departmentId || "",
        levelId: current.levelId || "",
        courseId: current.courseId || "",
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

  const availableLevels = useMemo(() => {
    const dept = options.departments.find((d) => String(d.id) === form.departmentId);
    return dept?.levels ?? [];
  }, [options.departments, form.departmentId]);

  const pickerCourses = useMemo(() => {
    const q = coursePickerSearch.trim().toLowerCase();
    const deptFiltered = form.departmentId
      ? options.courses.filter((c) => c.department_id === Number(form.departmentId))
      : options.courses;
    if (!q) return deptFiltered;
    return deptFiltered.filter((c) =>
      [c.code, c.title, c.department?.name].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [options.courses, form.departmentId, coursePickerSearch]);

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

  const handleDeptChange = (value: string) => {
    setForm((prev) => ({ ...prev, departmentId: value, levelId: "" }));
    setSelectedCourseIds(new Set());
  };

  const toggleCoursePick = (id: number) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!form.staffId || !form.sessionId || !form.semesterId || !form.departmentId || selectedCourseIds.size === 0) return;
    setAssigning(true);
    setFeedback(null);
    try {
      await Promise.all(
        [...selectedCourseIds].map((courseId) =>
          createStaffCourseAssignment({
            staff_id: Number(form.staffId),
            session_id: Number(form.sessionId),
            semester_id: Number(form.semesterId),
            department_id: Number(form.departmentId),
            level_id: form.levelId ? Number(form.levelId) : 0,
            course_id: courseId,
          }),
        ),
      );
      setSelectedCourseIds(new Set());
      setFeedback({ type: "success", message: `${selectedCourseIds.size} course${selectedCourseIds.size > 1 ? "s" : ""} assigned.` });
      await load();
    } catch (err) {
      setFeedback(toDanger(err, "Failed to assign courses."));
    } finally {
      setAssigning(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId) return;
    await runAction(
      async () => {
        await updateStaffCourseAssignment(editingId, {
          staff_id: Number(form.staffId),
          session_id: Number(form.sessionId),
          semester_id: Number(form.semesterId),
          department_id: Number(form.departmentId),
          level_id: Number(form.levelId),
          course_id: Number(form.courseId),
        });
        setEditingId(null);
      },
      "Lecturer course assignment updated.",
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
    setSelectedCourseIds(new Set());
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
          {editingId ? (
            <FormCard title="Edit Lecturer to Course" disabled={!canManageUsers} onSubmit={submit}>
              <SelectField label="Staff" value={form.staffId} onChange={(value) => setFormField(setForm, "staffId", value)}>
                <option value="">Select Staff</option>
                {options.staff.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.full_name} ({staff.staff_id})</option>
                ))}
              </SelectField>
              <SelectField label="Session" value={form.sessionId} onChange={(value) => setFormField(setForm, "sessionId", value)}>
                <option value="">Select Session</option>
                {options.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
              <SelectField label="Semester" value={form.semesterId} onChange={(value) => setFormField(setForm, "semesterId", value)}>
                <option value="">Select Semester</option>
                {options.semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </SelectField>
              <SelectField label="Department" value={form.departmentId} onChange={handleDeptChange}>
                <option value="">Select Department</option>
                {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </SelectField>
              <SelectField label="Level" value={form.levelId} onChange={(value) => setFormField(setForm, "levelId", value)}>
                <option value="">Select Level</option>
                {availableLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </SelectField>
              <SelectField label="Course" value={form.courseId} onChange={(value) => setFormField(setForm, "courseId", value)}>
                <option value="">Select Course</option>
                {options.courses
                  .filter((c) => !form.departmentId || c.department_id === Number(form.departmentId))
                  .map((c) => <option key={c.id} value={c.id}>{c.code} - {c.title}</option>)}
              </SelectField>
              <button type="submit" className="btn btn-primary mt-3">Update Assignment</button>
              <button type="button" className="btn btn-outline-secondary mt-3 ml-2" onClick={cancelEdit}>Cancel</button>
            </FormCard>
          ) : (
            <>
              {/* Assign panel */}
              <div className="card height-auto mb-4">
                <div className="card-body">
                  <div className="heading-layout1 mb-0">
                    <div className="item-title"><h3>Assign Lecturer to Course</h3></div>
                  </div>
                  <SelectField label="Staff *" value={form.staffId} onChange={(value) => setFormField(setForm, "staffId", value)}>
                    <option value="">Select Staff</option>
                    {options.staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.staff_id})</option>)}
                  </SelectField>
                  <SelectField label="Session *" value={form.sessionId} onChange={(value) => setFormField(setForm, "sessionId", value)}>
                    <option value="">Select Session</option>
                    {options.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </SelectField>
                  <SelectField label="Semester *" value={form.semesterId} onChange={(value) => setFormField(setForm, "semesterId", value)}>
                    <option value="">Select Semester</option>
                    {options.semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </SelectField>
                  <SelectField label="Department *" value={form.departmentId} onChange={handleDeptChange}>
                    <option value="">Select Department</option>
                    {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </SelectField>
                  <label className="mt-3">Level</label>
                  <select
                    className="form-control"
                    value={form.levelId}
                    onChange={(e) => setFormField(setForm, "levelId", e.target.value)}
                    disabled={!form.departmentId || availableLevels.length === 0}
                  >
                    <option value="">
                      {form.departmentId && availableLevels.length === 0 ? "No levels in this dept" : "Select Level"}
                    </option>
                    {availableLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Course picker */}
              <div className="card height-auto mb-4">
                <div className="card-body">
                  <div className="heading-layout1 mb-0">
                    <div className="item-title">
                      <h3>Select Courses</h3>
                      <p className="mb-0 text-muted small">Pick one or more courses to assign.</p>
                    </div>
                    {selectedCourseIds.size > 0 && (
                      <span className="badge badge-primary">{selectedCourseIds.size} selected</span>
                    )}
                  </div>
                  <input
                    className="form-control mt-3"
                    placeholder="Search courses..."
                    value={coursePickerSearch}
                    onChange={(e) => setCoursePickerSearch(e.target.value)}
                  />
                  <div className="mt-2" style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                    {loading ? (
                      <div className="p-3 text-muted small">Loading...</div>
                    ) : pickerCourses.length === 0 ? (
                      <div className="p-3 text-muted small">No courses found.</div>
                    ) : (
                      pickerCourses.map((c) => (
                        <label key={c.id} className="d-flex align-items-start p-2 mb-0" style={{ cursor: "pointer", borderBottom: "1px solid #f0f0f0", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={selectedCourseIds.has(c.id)}
                            onChange={() => toggleCoursePick(c.id)}
                            style={{ marginTop: 3, flexShrink: 0 }}
                          />
                          <span>
                            <span className="font-weight-bold">{c.code}</span>
                            <span className="text-muted"> — {c.title}</span>
                            {c.department && (
                              <span className="d-block text-muted" style={{ fontSize: "0.75rem" }}>
                                {c.department.name}{c.level ? ` / ${c.level.name}` : ""}
                              </span>
                            )}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="d-flex gap-2 mt-3">
                    {selectedCourseIds.size > 0 && (
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedCourseIds(new Set())}>
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                      disabled={!canManageUsers || assigning || !form.staffId || !form.sessionId || !form.semesterId || !form.departmentId || selectedCourseIds.size === 0}
                      onClick={() => void handleAssign()}
                    >
                      {assigning ? "Assigning..." : `Assign${selectedCourseIds.size > 0 ? ` (${selectedCourseIds.size})` : ""} →`}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="col-lg-8 col-12">
          <AssignmentSummary
            cards={[
              ["Assignments", assignments.length],
              ["Filtered", filteredAssignments.length],
              ["Courses", options.courses.length],
            ]}
          />
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
          <AssignmentSummary
            cards={[
              ["Assignments", assignments.length],
              ["Filtered", filteredAssignments.length],
              ["Departments", options.departments.length],
            ]}
          />
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

export function DeptLevelCoursesPage() {
  const { user } = useAuth();
  const canManage = Boolean(user?.capabilities?.manage_catalog);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Target dept/level for assigning
  const [assignDeptId, setAssignDeptId] = useState("");
  const [assignLevelId, setAssignLevelId] = useState("");

  // Course picker
  const [pickerSearch, setPickerSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [assigning, setAssigning] = useState(false);

  // Right-panel filter state
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDeptId, setFilterDeptId] = useState("");
  const [filterLevelId, setFilterLevelId] = useState("");

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ code: "", title: "", level_id: "" });
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [depts, lvls, courseList] = await Promise.all([listDepartments(), listLevels(), listCourses()]);
      setDepartments(depts);
      setLevels(lvls);
      setCourses(courseList);
    } catch (err) {
      setFeedback(toDanger(err, "Unable to load courses."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Courses shown in the picker (all courses, filtered by search)
  const pickerCourses = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const hay = [c.code, c.title, c.department?.name].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [courses, pickerSearch]);

  // Right-panel filtered view
  const filteredCourses = useMemo(() => {
    const search = filterSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (filterDeptId && c.department_id !== Number(filterDeptId)) return false;
      if (filterLevelId && c.level_id !== null && c.level_id !== Number(filterLevelId)) return false;
      if (search) {
        const hay = [c.code, c.title, c.department?.name, c.level?.name].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [courses, filterDeptId, filterLevelId, filterSearch]);

  const togglePick = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!assignDeptId || selectedIds.size === 0) return;
    setAssigning(true);
    try {
      const updated = await Promise.all(
        [...selectedIds].map((id) =>
          updateCourse(id, {
            department_id: Number(assignDeptId),
            level_id: assignLevelId ? Number(assignLevelId) : null,
          }),
        ),
      );
      setCourses((prev) => prev.map((c) => updated.find((u) => u.id === c.id) ?? c));
      setSelectedIds(new Set());
      setFeedback({ type: "success", message: `${updated.length} course${updated.length > 1 ? "s" : ""} assigned.` });
    } catch (err) {
      setFeedback(toDanger(err, "Failed to assign courses."));
    } finally {
      setAssigning(false);
    }
  };

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditDraft({
      code: course.code,
      title: course.title,
      level_id: course.level_id ? String(course.level_id) : "",
    });
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async (courseId: number) => {
    setEditSaving(true);
    try {
      const updated = await updateCourse(courseId, {
        code: editDraft.code.trim(),
        title: editDraft.title.trim(),
        level_id: editDraft.level_id ? Number(editDraft.level_id) : null,
      });
      setCourses((prev) => prev.map((c) => c.id === courseId ? updated : c));
      setEditingId(null);
      setFeedback({ type: "success", message: "Course updated." });
    } catch (err) {
      setFeedback(toDanger(err, "Failed to update course."));
    } finally {
      setEditSaving(false);
    }
  };

  const assignDept = departments.find((d) => String(d.id) === assignDeptId);
  const assignAvailableLevels = useMemo(() => assignDept?.levels ?? [], [assignDept]);
  const assignLevel = assignAvailableLevels.find((l) => String(l.id) === assignLevelId);

  return (
    <AssignShell title="Courses to Dept/Level" current="Courses to Dept/Level">
      <FeedbackAlert feedback={feedback} />

      <div className="row">
        {/* Left: Assign dept/level + course picker */}
        <div className="col-lg-4 col-12">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 mb-0">
                <div className="item-title">
                  <h3>Target Dept / Level</h3>
                </div>
              </div>

              <label className="mt-3">Department *</label>
              <select
                className="form-control"
                value={assignDeptId}
                onChange={(e) => { setAssignDeptId(e.target.value); setAssignLevelId(""); setSelectedIds(new Set()); }}
                disabled={loading}
              >
                <option value="">— Select Department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <label className="mt-3">Level (optional)</label>
              <select
                className="form-control"
                value={assignLevelId}
                onChange={(e) => setAssignLevelId(e.target.value)}
                disabled={loading || !assignDeptId || assignAvailableLevels.length === 0}
              >
                <option value="">
                  {assignDeptId && assignAvailableLevels.length === 0 ? "No levels in this dept" : "— All Levels —"}
                </option>
                {assignAvailableLevels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              {assignDept && (
                <div className="mt-3 p-2" style={{ background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <small className="text-success font-weight-bold">
                    {assignDept.name}{assignLevel ? ` — ${assignLevel.name}` : " — All Levels"}
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Course picker */}
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 mb-0">
                <div className="item-title">
                  <h3>Select Courses</h3>
                  <p className="mb-0 text-muted small">Pick courses to assign to the selected dept/level.</p>
                </div>
                {selectedIds.size > 0 && (
                  <span className="badge badge-primary">{selectedIds.size} selected</span>
                )}
              </div>

              <input
                className="form-control mt-3"
                placeholder="Search courses..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
              />

              <div
                className="mt-2"
                style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}
              >
                {loading ? (
                  <div className="p-3 text-muted small">Loading...</div>
                ) : pickerCourses.length === 0 ? (
                  <div className="p-3 text-muted small">No courses found.</div>
                ) : (
                  pickerCourses.map((c) => (
                    <label
                      key={c.id}
                      className="d-flex align-items-start p-2 mb-0"
                      style={{ cursor: "pointer", borderBottom: "1px solid #f0f0f0", gap: 8 }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => togglePick(c.id)}
                        style={{ marginTop: 3, flexShrink: 0 }}
                      />
                      <span>
                        <span className="font-weight-bold">{c.code}</span>
                        <span className="text-muted"> — {c.title}</span>
                        {c.department && (
                          <span className="d-block text-muted" style={{ fontSize: "0.75rem" }}>
                            {c.department.name}{c.level ? ` / ${c.level.name}` : ""}
                          </span>
                        )}
                      </span>
                    </label>
                  ))
                )}
              </div>

              <div className="d-flex gap-2 mt-3">
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={!canManage || assigning || !assignDeptId || selectedIds.size === 0}
                  onClick={() => void handleAssign()}
                >
                  {assigning ? "Assigning..." : `Assign${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""} →`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Filter + Course list */}
        <div className="col-lg-8 col-12">
          <AssignmentSummary
            cards={[
              ["Total Courses", courses.length],
              ["Showing", filteredCourses.length],
              ["Departments", departments.length],
              ["Levels", levels.length],
            ]}
          />

          {/* Filter bar */}
          <div className="card height-auto mb-3">
            <div className="card-body">
              <div className="row gutters-8 align-items-end">
                <div className="col-lg-4 col-12 form-group mb-0">
                  <label>Search</label>
                  <input
                    className="form-control"
                    placeholder="Code, title, dept..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
                <div className="col-lg-3 col-12 form-group mb-0">
                  <label>Department</label>
                  <select className="form-control" value={filterDeptId} onChange={(e) => setFilterDeptId(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-lg-3 col-12 form-group mb-0">
                  <label>Level</label>
                  <select className="form-control" value={filterLevelId} onChange={(e) => setFilterLevelId(e.target.value)}>
                    <option value="">All Levels</option>
                    {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="col-lg-2 col-12 form-group mb-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => { setFilterSearch(""); setFilterDeptId(""); setFilterLevelId(""); }}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1 mb-0">
                <div className="item-title">
                  <h3>Courses</h3>
                </div>
                <span className="badge badge-info">{filteredCourses.length}</span>
              </div>
              {loading ? (
                <div className="text-muted mt-3">Loading...</div>
              ) : (
                <div className="table-responsive mt-3">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Title</th>
                        <th>Department</th>
                        <th>Level</th>
                        <th>Semester</th>
                        <th>Status</th>
                        {canManage && <th>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourses.length === 0 ? (
                        <tr>
                          <td colSpan={canManage ? 7 : 6} className="text-muted">
                            No courses found.
                          </td>
                        </tr>
                      ) : (
                        filteredCourses.map((course) =>
                          editingId === course.id ? (
                            <tr key={course.id}>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  value={editDraft.code}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, code: e.target.value }))}
                                />
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm"
                                  value={editDraft.title}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                                />
                              </td>
                              <td>{course.department?.name || "—"}</td>
                              <td>
                                <select
                                  className="form-control form-control-sm"
                                  value={editDraft.level_id}
                                  onChange={(e) => setEditDraft((d) => ({ ...d, level_id: e.target.value }))}
                                >
                                  <option value="">Any Level</option>
                                  {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                              </td>
                              <td>{course.semester?.name || "Any"}</td>
                              <td>
                                <span className={`badge ${course.status === "active" ? "badge-success" : "badge-secondary"}`}>
                                  {course.status}
                                </span>
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-success"
                                    disabled={editSaving}
                                    onClick={() => void saveEdit(course.id)}
                                  >
                                    {editSaving ? "..." : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={course.id}>
                              <td><code>{course.code}</code></td>
                              <td>{course.title}</td>
                              <td>{course.department?.name || "—"}</td>
                              <td>{course.level?.name || "Any"}</td>
                              <td>{course.semester?.name || "Any"}</td>
                              <td>
                                <span className={`badge ${course.status === "active" ? "badge-success" : "badge-secondary"}`}>
                                  {course.status}
                                </span>
                              </td>
                              {canManage && (
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => startEdit(course)}
                                  >
                                    Edit
                                  </button>
                                </td>
                              )}
                            </tr>
                          )
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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

function AssignmentSummary({ cards }: { cards: Array<[string, number]> }) {
  return (
    <div className="assignment-summary-grid mb-3">
      {cards.map(([label, value]) => (
        <div className="assignment-summary-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
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
  pageSize = 15,
}: {
  title: string;
  loading: boolean;
  headers: string[];
  rows: ReactNode[][];
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  const totalItems = rows.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [totalItems]);

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
          <>
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
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length} className="text-muted">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, rowIndex) => (
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
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
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
