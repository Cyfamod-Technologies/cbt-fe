"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createStudentCourseEnrollment,
  deleteStudentCourseEnrollment,
  getSchoolSettings,
  getUser,
  listCourses,
  listStudentCourseEnrollments,
  listUsers,
  type Course,
  type SchoolSettings,
  type SchoolUser,
  type StudentCourseEnrollment,
} from "@/lib/academic";
import { useAuth } from "@/contexts/AuthContext";

type Feedback = { type: "success" | "danger" | "warning"; message: string } | null;

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const studentId = Number(params.id);
  const canManage = Boolean(authUser?.capabilities?.manage_users);

  const [student, setStudent] = useState<SchoolUser | null>(null);
  const [allStudents, setAllStudents] = useState<SchoolUser[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<StudentCourseEnrollment[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [addingCourse, setAddingCourse] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedType, setSelectedType] = useState("carryover");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studentData, students, courses, enrollmentData, schoolSettings] = await Promise.all([
        getUser(studentId),
        listUsers("student"),
        listCourses(),
        listStudentCourseEnrollments(studentId),
        getSchoolSettings(),
      ]);
      setStudent(studentData);
      setAllStudents(students);
      setAllCourses(courses);
      setEnrollments(enrollmentData);
      setSettings(schoolSettings);
    } catch (err) {
      setFeedback({ type: "danger", message: err instanceof Error ? err.message : "Failed to load student." });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void load(); }, [load]);

  const { previousStudent, nextStudent } = useMemo(() => {
    const idx = allStudents.findIndex((s) => s.id === studentId);
    return {
      previousStudent: idx > 0 ? allStudents[idx - 1] : null,
      nextStudent: idx >= 0 && idx < allStudents.length - 1 ? allStudents[idx + 1] : null,
    };
  }, [allStudents, studentId]);

  const standardCourses = useMemo(() => {
    if (!student) return [];
    return allCourses.filter((c) => {
      const deptMatch = c.department_id === student.department_id;
      const levelMatch = c.level_id === null || c.level_id === student.level_id;
      const semMatch = !settings?.current_semester_id || c.semester_id === null || c.semester_id === settings.current_semester_id;
      return deptMatch && levelMatch && semMatch;
    });
  }, [allCourses, student, settings]);

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((e) => e.course_id)), [enrollments]);
  const standardCourseIds = useMemo(() => new Set(standardCourses.map((c) => c.id)), [standardCourses]);
  const addableCourses = useMemo(() => {
    return allCourses.filter((c) => !standardCourseIds.has(c.id) && !enrolledCourseIds.has(c.id));
  }, [allCourses, standardCourseIds, enrolledCourseIds]);

  const handleAddCourse = async () => {
    if (!selectedCourseId) return;
    setSubmitting(true);
    try {
      const enrollment = await createStudentCourseEnrollment(studentId, {
        course_id: Number(selectedCourseId),
        type: selectedType,
      });
      setEnrollments((prev) => [...prev, enrollment]);
      setFeedback({ type: "success", message: "Course added successfully." });
      setAddingCourse(false);
      setSelectedCourseId("");
      setSelectedType("carryover");
    } catch (err) {
      setFeedback({ type: "danger", message: err instanceof Error ? err.message : "Failed to add course." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveEnrollment = async (enrollment: StudentCourseEnrollment) => {
    const courseName = enrollment.course?.title ?? "this course";
    if (!window.confirm(`Remove ${courseName} from ${student?.name ?? "student"}?`)) return;
    try {
      await deleteStudentCourseEnrollment(studentId, enrollment.id);
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollment.id));
      setFeedback({ type: "success", message: "Course removed." });
    } catch (err) {
      setFeedback({ type: "danger", message: err instanceof Error ? err.message : "Failed to remove course." });
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 200 }}>
        <div className="spinner-border" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="card height-auto">
        <div className="card-body text-muted">Student not found.</div>
      </div>
    );
  }

  const initial = student.name?.charAt(0)?.toUpperCase() ?? "S";

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Student Management</h3>
        <ul>
          <li><Link href="/dashboard">Home</Link></li>
          <li><Link href="/users/students">Students</Link></li>
          <li>Student Details</li>
        </ul>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`} role="alert">
          {feedback.message}
          <button type="button" className="close ml-2" onClick={() => setFeedback(null)}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Student Navigation */}
      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Student Navigation</h3>
              <p className="mb-0 text-muted small">Move through the student list without going back to the directory.</p>
            </div>
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => previousStudent && router.push(`/users/students/${previousStudent.id}`)}
              disabled={!previousStudent}
            >
              ← {previousStudent ? previousStudent.name : "Previous Student"}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => nextStudent && router.push(`/users/students/${nextStudent.id}`)}
              disabled={!nextStudent}
            >
              {nextStudent ? nextStudent.name : "Next Student"} →
            </button>
          </div>
        </div>
      </div>

      {/* Main profile card */}
      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div className="d-flex align-items-center">
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  background: "#4f46e5",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  fontWeight: 700,
                  marginRight: "1rem",
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
              <div>
                <h3 className="mb-1">{student.name}</h3>
                <p className="mb-0 text-muted">Matric No: {student.matric_no ?? "—"}</p>
                <p className="mb-0">
                  <span className={`badge ${student.status === "active" ? "badge-success" : "badge-secondary"}`}>
                    {student.status}
                  </span>
                </p>
              </div>
            </div>
            {canManage && (
              <Link href={`/users/students/${student.id}/edit`} className="btn btn-outline-primary">
                Edit
              </Link>
            )}
          </div>

          <div className="row">
            <div className="col-lg-6 col-12">
              <h5 className="mb-3">Personal Information</h5>
              <ul className="list-unstyled">
                <li><strong>Full Name:</strong> {student.name}</li>
                <li><strong>Email:</strong> {student.email ?? "—"}</li>
                <li><strong>Phone:</strong> {student.phone ?? "—"}</li>
                <li><strong>Gender:</strong> {student.gender ?? "—"}</li>
              </ul>
            </div>
            <div className="col-lg-6 col-12">
              <h5 className="mb-3">Academic Information</h5>
              <ul className="list-unstyled">
                <li><strong>Matric No:</strong> {student.matric_no ?? "—"}</li>
                <li><strong>Student ID No:</strong> {student.student_id_no ?? "—"}</li>
                <li><strong>Department:</strong> {student.department?.name ?? "—"}</li>
                <li><strong>Level:</strong> {student.level?.name ?? "—"}</li>
                <li><strong>Current Semester:</strong> {settings?.current_semester?.name ?? "Any"}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Standard dept/level courses */}
      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1 mb-0">
            <div className="item-title">
              <h3>Dept/Level Courses</h3>
              <p className="mb-0 text-muted small">
                Courses assigned to {student.department?.name || "this department"} – {student.level?.name || "this level"}.
              </p>
            </div>
            <span className="badge badge-info">{standardCourses.length} courses</span>
          </div>
          <div className="table-responsive mt-3">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Level</th>
                  <th>Semester</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {standardCourses.length === 0 ? (
                  <tr><td colSpan={5} className="text-muted">No courses assigned to this department/level yet.</td></tr>
                ) : (
                  standardCourses.map((course) => (
                    <tr key={course.id}>
                      <td><code>{course.code}</code></td>
                      <td>{course.title}</td>
                      <td>{course.level?.name || "Any"}</td>
                      <td>{course.semester?.name || "Any"}</td>
                      <td>
                        <span className={`badge ${course.status === "active" ? "badge-success" : "badge-secondary"}`}>
                          {course.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Additional / carryover courses */}
      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1 mb-0">
            <div className="item-title">
              <h3>Additional Courses</h3>
              <p className="mb-0 text-muted small">
                Carryover or elective courses added specifically for this student.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                onClick={() => setAddingCourse((v) => !v)}
              >
                {addingCourse ? "Cancel" : "+ Add Course"}
              </button>
            )}
          </div>

          {addingCourse && (
            <div className="card mt-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="card-body">
                <h5 className="mb-3">Add Course to {student.name}</h5>
                <div className="row">
                  <div className="col-lg-5 mb-3">
                    <label className="form-label">Course</label>
                    <select
                      className="form-control"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                    >
                      <option value="">— Select course —</option>
                      {addableCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} – {c.title} ({c.department?.name}, {c.level?.name || "Any level"})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-lg-3 mb-3">
                    <label className="form-label">Type</label>
                    <select
                      className="form-control"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                    >
                      <option value="carryover">Carryover</option>
                      <option value="elective">Elective</option>
                      <option value="extra">Extra</option>
                    </select>
                  </div>
                  <div className="col-lg-4 mb-3 d-flex align-items-end">
                    <button
                      type="button"
                      className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                      disabled={!selectedCourseId || submitting}
                      onClick={() => void handleAddCourse()}
                    >
                      {submitting ? "Adding..." : "Add Course"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="table-responsive mt-3">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Level</th>
                  <th>Type</th>
                  {canManage && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="text-muted">
                      No additional courses enrolled. Use &quot;+ Add Course&quot; to add carryover or elective courses.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td><code>{enrollment.course?.code || "—"}</code></td>
                      <td>{enrollment.course?.title || "—"}</td>
                      <td>{enrollment.course?.department?.name || "—"}</td>
                      <td>{enrollment.course?.level?.name || "Any"}</td>
                      <td><span className="badge badge-warning">{enrollment.type}</span></td>
                      {canManage && (
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => void handleRemoveEnrollment(enrollment)}
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
