import Link from "next/link";

export default function StudentBulkUploadPage() {
  const requiredFields = ["matric_no", "student_id_no", "full_name", "department", "level"];
  const optionalFields = ["email", "phone", "status"];

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Bulk Upload</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/users/students">Students</Link>
          </li>
          <li>Bulk Upload</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <h3 className="mb-3">Student Import Fields</h3>
          <div className="row">
            <div className="col-12 col-lg-6 mb-4">
              <h4 className="mb-3">Required</h4>
              <ul className="mb-0">
                {requiredFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
            <div className="col-12 col-lg-6 mb-4">
              <h4 className="mb-3">Optional</h4>
              <ul className="mb-0">
                {optionalFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="alert alert-info mb-0" role="alert">
            CSV columns should follow this order: matric_no, student_id_no, full_name, department, level, email, phone, status.
          </div>
        </div>
      </div>
    </>
  );
}
