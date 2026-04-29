import Link from "next/link";

export default function Page() {
  return (
    <div className="breadcrumbs-area">
      <h3>Students</h3>
      <ul>
        <li>
          <Link href="/dashboard">Home</Link>
        </li>
        <li>Management</li>
        <li>Users</li>
        <li>Students</li>
      </ul>
      <div className="card height-auto">
        <div className="card-body">
          <div className="alert alert-info mb-0">Student upload and course inheritance will be connected in the next V1.2 step.</div>
        </div>
      </div>
    </div>
  );
}