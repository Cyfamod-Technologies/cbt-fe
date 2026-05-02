"use client";

// import Image from "next/image";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { studentAccess } from "@/lib/studentAuth";

const SCHOOL_CODE = process.env.NEXT_PUBLIC_SCHOOL_CODE ?? "";

const styles = `
.student-login .student-cta {
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  border-radius: 18px;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 1.5rem;
  gap: 1rem;
  box-shadow: 0 18px 40px rgba(37, 99, 235, 0.25);
}
.student-login .student-cta .cta-icon {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-right: 1rem;
}
.student-login .login-box {
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15,23,42,0.08);
  padding: 2.5rem;
}
.student-login .login-box h2 {
  font-weight: 700;
  margin-bottom: 0.25rem;
}
@media (max-width: 576px) {
  .student-login .login-box { padding: 1.5rem; }
}
`;

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/access";

  const [form, setForm] = useState({ matric_no: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await studentAccess({ school_code: SCHOOL_CODE, ...form });
      if (user.force_password_change) {
        router.push(`/access/change-password?next=${encodeURIComponent("/access/courses")}`);
      } else {
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrap student-login">
      <style>{styles}</style>
      <div className="login-page-content">
        <div className="student-cta mb-4">
          <div className="d-flex align-items-center">
            <span className="cta-icon">
              <i className="fas fa-pen-alt" aria-hidden="true" />
            </span>
            <div>
              <div className="font-weight-bold mb-1">Student Assessment Portal</div>
              <small className="text-white-50">
                Sign in to see assessments available for your class.
              </small>
            </div>
          </div>
        </div>

        <div className="login-box">
          {/* <div className="item-logo mb-4" style={{ textAlign: "center" }}>
            <Image src="/assets/img/logo2.png" alt="Cyfamod CBT" width={160} height={60} style={{ width: "auto", height: "auto" }} />
          </div> */}
          <div className="text-center mb-3">
            <h2 className="font-weight-bold" style={{ marginBottom: 4 }}>CYFAMOD CBT</h2>
          </div>
          <h2>Student Access</h2>
          <p className="text-muted mb-4">
            Enter your matric number and password to continue.
          </p>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="form-group mb-3">
              <label htmlFor="matric-no">Matric Number</label>
              <input
                id="matric-no"
                type="text"
                className="form-control"
                value={form.matric_no}
                onChange={(e) => setForm((f) => ({ ...f, matric_no: e.target.value }))}
                required
                placeholder="e.g. CYF/CSC/001"
              />
            </div>
            <div className="form-group mb-4">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                placeholder="Enter your password"
              />
            </div>
            <button
              type="submit"
              className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark btn-block"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function StudentLoginPage() {
  return (
    <Suspense fallback={<div className="d-flex align-items-center justify-content-center min-vh-100"><div className="spinner-border" /></div>}>
      <LoginInner />
    </Suspense>
  );
}
