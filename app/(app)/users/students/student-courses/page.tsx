"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSchoolSettings, listCourses, listUsers, type Course, type SchoolSettings, type SchoolUser } from "@/lib/academic";

export default function StudentCoursesPage() {
  const [students, setStudents] = useState<SchoolUser[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const [studentList, courseList, schoolSettings] = await Promise.all([
          listUsers("student"),
          listCourses(),
          getSchoolSettings(),
        ]);

        if (!active) {
          return;
        }

        setStudents(studentList);
        setCourses(courseList);
        setSettings(schoolSettings);
        setSelectedStudentId((current) => current || (studentList[0]?.id ? String(studentList[0].id) : ""));
      } catch (error) {
        if (active) {
          setFeedback(toDanger(error, "Unable to load student courses."));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );

  const eligibleCourses = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    return courses.filter((course) => {
      const departmentMatches = course.department_id === selectedStudent.department_id;
      const levelMatches = course.level_id === null || course.level_id === selectedStudent.level_id;
      const semesterMatches = !settings?.current_semester_id || course.semester_id === null || course.semester_id === settings.current_semester_id;

      return departmentMatches && levelMatches && semesterMatches;
    });
  }, [courses, selectedStudent, settings?.current_semester_id]);

  const excludedCourses = useMemo(() => {
    if (!selectedStudent) {
      return [];
    }

    return courses.filter((course) => !eligibleCourses.some((eligible) => eligible.id === course.id));
  }, [courses, eligibleCourses, selectedStudent]);

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Student Courses</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/users/students">Students</Link>
          </li>
          <li>Student Courses</li>
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
              <h3>Student Course Eligibility</h3>
              <p className="mb-0 text-muted">
                Pick a student to see the courses that match their department, level, and current semester.
              </p>
            </div>
          </div>
          <div className="row mt-4">
            <div className="col-12 col-lg-4">
              <label>Select Student</label>
              <select
                className="form-control"
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                disabled={loading || students.length === 0}
              >
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} {student.matric_no ? `(${student.matric_no})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-lg-8 mt-3 mt-lg-0">
              <div className="row">
                <StatCard label="Students" value={students.length} />
                <StatCard label="Courses" value={courses.length} />
                <StatCard label="Eligible" value={eligibleCourses.length} />
                <StatCard label="Excluded" value={excludedCourses.length} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card height-auto">
          <div className="card-body text-muted">Loading student courses...</div>
        </div>
      ) : selectedStudent ? (
        <>
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 mb-0">
                <div className="item-title">
                  <h3>{selectedStudent.name}</h3>
                  <p className="mb-0 text-muted">
                    {selectedStudent.matric_no ? `Matric No: ${selectedStudent.matric_no}` : "Matric No not set"}
                    {selectedStudent.department?.name ? ` | Department: ${selectedStudent.department.name}` : ""}
                    {selectedStudent.level?.name ? ` | Level: ${selectedStudent.level.name}` : ""}
                    {settings?.current_semester?.name ? ` | Semester: ${settings.current_semester.name}` : ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Eligible Courses</h3>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Level</th>
                      <th>Semester</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eligibleCourses.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-muted">
                          No matching courses found for this student.
                        </td>
                      </tr>
                    ) : (
                      eligibleCourses.map((course) => (
                        <tr key={course.id}>
                          <td>{course.code}</td>
                          <td>{course.title}</td>
                          <td>{course.department?.name || "-"}</td>
                          <td>{course.level?.name || "Any"}</td>
                          <td>{course.semester?.name || "Any"}</td>
                          <td>{course.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Other Courses</h3>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Title</th>
                      <th>Why Excluded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excludedCourses.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-muted">
                          All loaded courses are eligible for this student.
                        </td>
                      </tr>
                    ) : (
                      excludedCourses.map((course) => {
                        const reasons = [];

                        if (course.department_id !== selectedStudent.department_id) {
                          reasons.push("Department mismatch");
                        }

                        if (course.level_id !== null && course.level_id !== selectedStudent.level_id) {
                          reasons.push("Level mismatch");
                        }

                        if (settings?.current_semester_id && course.semester_id !== null && course.semester_id !== settings.current_semester_id) {
                          reasons.push("Semester mismatch");
                        }

                        return (
                          <tr key={course.id}>
                            <td>{course.code}</td>
                            <td>{course.title}</td>
                            <td>{reasons.length ? reasons.join(", ") : "Not eligible"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card height-auto">
          <div className="card-body text-muted">No student selected.</div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="col-6 col-xl-3 mb-3 mb-xl-0">
      <div className="bg-white border rounded p-3 h-100">
        <div className="text-muted small">{label}</div>
        <div className="h4 mb-0">{value}</div>
      </div>
    </div>
  );
}

type Feedback = { type: "success" | "danger"; message: string } | null;

function toDanger(error: unknown, fallback: string): Exclude<Feedback, null> {
  return {
    type: "danger",
    message: error instanceof Error ? error.message : fallback,
  };
}
