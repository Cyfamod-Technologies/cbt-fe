"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCHOOL_CODE = process.env.NEXT_PUBLIC_SCHOOL_CODE ?? "";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = searchParams?.get("next") || "/dashboard";

  useEffect(() => {
    if (loading || !user) {
      return;
    }
    router.replace(nextPath);
  }, [loading, nextPath, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setEmailError(null);

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!emailPattern.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    try {
      setSubmitting(true);
      await login({ school_code: SCHOOL_CODE, email, password });
      router.push(nextPath);
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="login-form" className="login-form" onSubmit={handleSubmit}>
      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          placeholder="Enter email"
          className={`form-control${emailError ? " is-invalid" : ""}`}
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            const value = event.target.value;
            setEmail(value);
            if (emailError && emailPattern.test(value)) {
              setEmailError(null);
            }
          }}
          aria-invalid={emailError ? "true" : undefined}
          aria-describedby={emailError ? "login-email-error" : undefined}
        />
        <span className="field-icon" aria-hidden="true">
          @
        </span>
        {emailError ? (
          <div id="login-email-error" className="invalid-feedback">
            {emailError}
          </div>
        ) : null}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter password"
          className="form-control"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>

      <div
        className="form-group"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="remember-me" />
          <label htmlFor="remember-me" className="form-check-label">
            Remember Me
          </label>
        </div>
        <span className="text-muted small">Contact admin for help</span>
      </div>

      <div className="form-group">
        <button type="submit" className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark btn-block" disabled={submitting || loading}>
          {submitting ? "Signing in..." : "Login"}
        </button>
      </div>
{/* 
      <div className="demo-login-panel">
        <label className="text-muted small" style={{ marginBottom: 8 }}>
          Demo logins
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {demoCredentials.map((demo) => (
            <button
              key={demo.label}
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => fillDemoCredentials(demo.schoolCode, demo.email)}
            >
              {demo.label}
            </button>
          ))}
        </div>
        <p className="text-muted small" style={{ margin: "10px 0 0" }}>
          Password for all demo accounts is <strong>password</strong>.
        </p>
      </div> */}
    </form>
  );
}
