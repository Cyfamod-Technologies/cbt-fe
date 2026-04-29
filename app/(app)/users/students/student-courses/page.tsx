import Link from "next/link";

export default function StudentCoursesPage() {
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

      <div className="card height-auto">
        <div className="card-body">
          <h3 className="mb-3">Student Courses</h3>
          <p className="mb-0 text-muted">Student course listing will be added here.</p>
        </div>
      </div>
    </>
  );
}
