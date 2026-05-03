"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/lib/academic";

type Feedback = { type: "success" | "danger"; message: string } | null;

export default function ProfilePage() {
  const { user, refreshAuth } = useAuth();

  const [infoForm, setInfoForm] = useState({
    name: user?.name ?? "",
    email: (user?.email as string) ?? "",
    phone: (user?.phone as string) ?? "",
  });
  const [pwForm, setPwForm] = useState({ password: "", password_confirmation: "" });

  const [infoSaving, setInfoSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [infoFeedback, setInfoFeedback] = useState<Feedback>(null);
  const [pwFeedback, setPwFeedback] = useState<Feedback>(null);

  const handleInfoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInfoSaving(true);
    setInfoFeedback(null);
    try {
      await updateProfile({ name: infoForm.name, email: infoForm.email || undefined, phone: infoForm.phone || undefined });
      await refreshAuth();
      setInfoFeedback({ type: "success", message: "Profile updated successfully." });
    } catch (err) {
      setInfoFeedback({ type: "danger", message: err instanceof Error ? err.message : "Failed to update profile." });
    } finally {
      setInfoSaving(false);
    }
  };

  const handlePwSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.password_confirmation) {
      setPwFeedback({ type: "danger", message: "Passwords do not match." });
      return;
    }
    setPwSaving(true);
    setPwFeedback(null);
    try {
      await updateProfile({ password: pwForm.password, password_confirmation: pwForm.password_confirmation });
      setPwForm({ password: "", password_confirmation: "" });
      setPwFeedback({ type: "success", message: "Password changed successfully." });
    } catch (err) {
      setPwFeedback({ type: "danger", message: err instanceof Error ? err.message : "Failed to change password." });
    } finally {
      setPwSaving(false);
    }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() ?? "U";
  const roleLabel = (user?.role ?? "").replaceAll("_", " ");

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>My Profile</h3>
        <ul>
          <li>Account</li>
          <li>Profile</li>
        </ul>
      </div>

      <div className="row gutters-20">
        {/* Avatar / identity card */}
        <div className="col-lg-4 col-12">
          <div className="card height-auto mb-4">
            <div className="card-body text-center" style={{ padding: "2rem 1.5rem" }}>
              <div
                style={{
                  width: 90, height: 90, borderRadius: "50%",
                  background: "#4f46e5", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 34, fontWeight: 700, margin: "0 auto 1rem",
                }}
              >
                {initial}
              </div>
              <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{user?.name}</h4>
              <p className="text-muted mb-1" style={{ textTransform: "capitalize", fontSize: 14 }}>{roleLabel}</p>
              <p className="text-muted mb-0" style={{ fontSize: 13 }}>{user?.email as string || "—"}</p>
            </div>
          </div>
        </div>

        <div className="col-lg-8 col-12">
          {/* Info update */}
          <div className="card height-auto mb-4">
            <div className="card-body">
              <h5 style={{ fontWeight: 700, marginBottom: "1.25rem" }}>Personal Information</h5>
              {infoFeedback && (
                <div className={`alert alert-${infoFeedback.type}`}>
                  {infoFeedback.message}
                  <button type="button" className="close ml-2" onClick={() => setInfoFeedback(null)}><span>&times;</span></button>
                </div>
              )}
              <form onSubmit={(e) => void handleInfoSubmit(e)}>
                <div className="form-group mb-3">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={infoForm.name}
                    onChange={(e) => setInfoForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={infoForm.email}
                    onChange={(e) => setInfoForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="—"
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="—"
                  />
                </div>
                <button type="submit" className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark" disabled={infoSaving}>
                  {infoSaving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>

          {/* Password change */}
          <div className="card height-auto">
            <div className="card-body">
              <h5 style={{ fontWeight: 700, marginBottom: "1.25rem" }}>Change Password</h5>
              {pwFeedback && (
                <div className={`alert alert-${pwFeedback.type}`}>
                  {pwFeedback.message}
                  <button type="button" className="close ml-2" onClick={() => setPwFeedback(null)}><span>&times;</span></button>
                </div>
              )}
              <form onSubmit={(e) => void handlePwSubmit(e)}>
                <div className="form-group mb-3">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={pwForm.password}
                    onChange={(e) => setPwForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div className="form-group mb-4">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={pwForm.password_confirmation}
                    onChange={(e) => setPwForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                    required
                    minLength={6}
                    placeholder="Repeat new password"
                  />
                </div>
                <button type="submit" className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark" disabled={pwSaving}>
                  {pwSaving ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
