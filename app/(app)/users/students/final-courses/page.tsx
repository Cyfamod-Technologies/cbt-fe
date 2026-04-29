import Link from "next/link";

export default function StudentFinalCoursesPage() {
  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Final Courses</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/users/students">Students</Link>
          </li>
          <li>Final Courses</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <h3 className="mb-3">Final Courses</h3>
          <p className="mb-0 text-muted">Final course listing will be added here.</p>
        </div>
      </div>
    </>
  );
}
