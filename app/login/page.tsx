import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "./login-form";

const showRegistration = process.env.NEXT_PUBLIC_SHOW_REGISTRATION !== "false";

export default function LoginPage() {
  return (
    <div className="login-page-wrap">
      <div className="login-page-content">
        {showRegistration && (
          <div className="sign-up-cta mb-4 p-3 d-flex align-items-center justify-content-between flex-wrap">
            <div className="d-flex align-items-center">
              <span className="sign-up-icon d-inline-flex align-items-center justify-content-center mr-3">
                <i className="fas fa-user-plus" aria-hidden="true" />
              </span>
              <div>
                <div className="font-weight-bold mb-1">First time here?</div>
                <small className="text-muted">
                  Create a school account in a few simple steps.
                </small>
              </div>
            </div>
            <Link href="/register" className="cta-action">
              Create an Account
            </Link>
          </div>
        )}
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
          <div className="text-center" style={{ marginBottom: 26 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
              Login to your account
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
              Use your school account to access the CBT workspace.
            </p>
          </div>
          <Suspense fallback={<div className="text-center py-4">Loading...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
