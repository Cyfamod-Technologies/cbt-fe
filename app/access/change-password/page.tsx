"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { studentChangePassword } from "@/lib/studentAuth";

const styles = `
.change-password-wrap .change-password-box {
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15,23,42,0.08);
  padding: 2.5rem;
  max-width: 480px;
  width: 100%;
}
.change-password-wrap .change-password-box h2 {
  font-weight: 700;
  margin-bottom: 0.25rem;
}
@media (max-width: 576px) {
  .change-password-wrap .change-password-box { padding: 1.5rem; }
}
`;

function ChangePasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/access";

  const [form, setForm] = useState({ password: "", password_confirmation: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await studentChangePassword(form);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="change-password-wrap d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", background: "#f8fafc" }}
    >
      <style>{styles}</style>
      <div className="change-password-box bg-white">
        <div className="text-center mb-3">
          <h2 className="font-weight-bold" style={{ marginBottom: 4 }}>CYFAMOD CBT</h2>
        </div>
        <h2>Set New Password</h2>
        <p className="text-muted mb-4">
          Your account requires a password change before you can continue. Please choose a new password.
        </p>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-group mb-3">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              className="form-control"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group mb-4">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              className="form-control"
              value={form.password_confirmation}
              onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))}
              required
              minLength={6}
              placeholder="Repeat your new password"
            />
          </div>
          <button
            type="submit"
            className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark btn-block"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="d-flex align-items-center justify-content-center min-vh-100"><div className="spinner-border" /></div>}>
      <ChangePasswordInner />
    </Suspense>
  );
}
