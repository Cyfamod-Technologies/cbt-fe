"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    schoolName: "",
    schoolCode: "",
    schoolEmail: "",
    schoolPhone: "",
    schoolAddress: "",
    adminName: "",
    adminEmail: "",
    password: "",
    passwordConfirmation: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (key: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));

    if (
      (key === "schoolEmail" || key === "adminEmail") &&
      emailError &&
      emailPattern.test(value)
    ) {
      setEmailError(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setEmailError(null);

    if (!emailPattern.test(formData.schoolEmail)) {
      setEmailError("Please enter a valid school email address.");
      return;
    }

    if (!emailPattern.test(formData.adminEmail)) {
      setEmailError("Please enter a valid admin email address.");
      return;
    }

    if (formData.password !== formData.passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch("/api/v1/auth/register-school", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({
          school: {
            name: formData.schoolName,
            code: formData.schoolCode,
            email: formData.schoolEmail,
            phone: formData.schoolPhone || null,
            address: formData.schoolAddress || null,
          },
          admin: {
            name: formData.adminName,
            email: formData.adminEmail,
            password: formData.password,
          },
        }),
      });

      router.push("/login?status=registration-success");
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "Unable to register. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-wrap">
      <div className="login-page-content register-page-content">
        <div className="register-login-cta mb-4 p-3 d-flex align-items-center justify-content-between flex-wrap">
          <div className="d-flex align-items-center">
            <span className="register-login-icon d-inline-flex align-items-center justify-content-center mr-3">
              <i className="fas fa-sign-in-alt" aria-hidden="true" />
            </span>
            <div>
              <div className="font-weight-bold mb-1 text-dark">
                Already have an account?
              </div>
              <small className="text-muted">
                Continue where you left off by signing into your dashboard.
              </small>
            </div>
          </div>
          <Link href="/login" className="register-login-action">
            Go to Login
          </Link>
        </div>

        <div className="login-box">
          <div className="item-logo">
            <Image
              src="/assets/img/logo2.png"
              alt="Cyfamod CBT"
              width={160}
              height={60}
              priority
              style={{ width: "auto", height: "auto" }}
            />
          </div>

          <form id="register-form" className="login-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}

            <div className="row">
              <div className="col-12">
                <h4>Register Your School</h4>
                <p className="text-muted small mb-3">
                  Create the school profile and first admin account.
                </p>
              </div>

              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="schoolName">School Name *</label>
                <input
                  id="schoolName"
                  type="text"
                  placeholder="Enter school name"
                  className="form-control"
                  required
                  value={formData.schoolName}
                  onChange={(event) => updateField("schoolName", event.target.value)}
                />
              </div>

              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="schoolCode">School Code *</label>
                <input
                  id="schoolCode"
                  type="text"
                  placeholder="e.g. benpoly"
                  className="form-control"
                  required
                  value={formData.schoolCode}
                  onChange={(event) => updateField("schoolCode", event.target.value)}
                />
              </div>

              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="schoolEmail">School Email *</label>
                <input
                  id="schoolEmail"
                  type="email"
                  placeholder="Enter school email"
                  className={`form-control${emailError ? " is-invalid" : ""}`}
                  required
                  value={formData.schoolEmail}
                  onChange={(event) => updateField("schoolEmail", event.target.value)}
                  aria-invalid={emailError ? "true" : undefined}
                />
              </div>

              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="schoolPhone">Phone</label>
                <input
                  id="schoolPhone"
                  type="tel"
                  placeholder="Enter phone number"
                  className="form-control"
                  value={formData.schoolPhone}
                  onChange={(event) => updateField("schoolPhone", event.target.value)}
                />
              </div>

              <div className="col-12 form-group">
                <label htmlFor="schoolAddress">Address</label>
                <input
                  id="schoolAddress"
                  type="text"
                  placeholder="Enter school address"
                  className="form-control"
                  value={formData.schoolAddress}
                  onChange={(event) => updateField("schoolAddress", event.target.value)}
                />
              </div>

              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="adminName">Admin Name *</label>
                <input
                  id="adminName"
                  type="text"
                  placeholder="Enter admin name"
                  className="form-control"
                  required
                  value={formData.adminName}
                  onChange={(event) => updateField("adminName", event.target.value)}
                />
              </div>

              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="adminEmail">Admin Email *</label>
                <input
                  id="adminEmail"
                  type="email"
                  placeholder="Enter admin email"
                  className={`form-control${emailError ? " is-invalid" : ""}`}
                  required
                  value={formData.adminEmail}
                  onChange={(event) => updateField("adminEmail", event.target.value)}
                  aria-invalid={emailError ? "true" : undefined}
                />
                {emailError ? (
                  <div className="invalid-feedback">{emailError}</div>
                ) : null}
              </div>

              <div className="col-lg-6 col-12 form-group position-relative">
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="form-control"
                  required
                  value={formData.password}
                  onChange={(event) => updateField("password", event.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <i
                    className={`fas ${showPassword ? "fa-unlock" : "fa-lock"}`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="col-lg-6 col-12 form-group position-relative">
                <label htmlFor="passwordConfirmation">Confirm Password *</label>
                <input
                  id="passwordConfirmation"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  className="form-control"
                  required
                  value={formData.passwordConfirmation}
                  onChange={(event) =>
                    updateField("passwordConfirmation", event.target.value)
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={showConfirmPassword}
                >
                  <i
                    className={`fas ${showConfirmPassword ? "fa-unlock" : "fa-lock"}`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              <div className="col-12 form-group mg-t-8">
                <button type="submit" className="login-btn" disabled={submitting}>
                  {submitting ? "Registering..." : "Register"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="sign-up register-login-footer">
          Already have a School?{" "}
          <Link href="/login" className="register-login-footer-link">
            Login now!
          </Link>
        </div>
      </div>
    </div>
  );
}
