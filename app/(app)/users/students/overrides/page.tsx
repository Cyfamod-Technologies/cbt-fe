import Link from "next/link";

export default function StudentOverridesPage() {
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

      <div className="card height-auto">
        <div className="card-body">
          <h3 className="mb-3">Student Dept/Level Overrides</h3>
          <p className="mb-0 text-muted">Use this page to override a student's department or level assignment when the default import is wrong.</p>
        </div>
      </div>
    </>
  );
}
