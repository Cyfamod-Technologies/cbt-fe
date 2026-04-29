"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Licenses", href: "/dashboard#licenses" },
  { label: "Question Bank", href: "/dashboard#questions" },
  { label: "Exams", href: "/dashboard#exams" },
  { label: "Results", href: "/dashboard#results" },
  { label: "Offline Sync", href: "/dashboard#sync" },
] as const;

const managementLinks = [
  { label: "Session", href: "/management/sessions" },
  { label: "Semesters", href: "/management/semesters" },
  { label: "Departments", href: "/management/departments" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const managementActive = useMemo(
    () => managementLinks.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)),
    [pathname],
  );
  const [managementOpen, setManagementOpen] = useState(false);

  useEffect(() => {
    setManagementOpen(managementActive);
  }, [managementActive]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading || !user) {
    return loading ? (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    ) : null;
  }

  const roleLabel = user.role.replaceAll("_", " ");
  const initial = user.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div id="wrapper" className="wrapper bg-ash">
      <div className="navbar navbar-expand-md header-menu-one bg-light">
        <div className="nav-bar-header-one">
          <div className="header-logo">
            <Link href="/dashboard">Cyfamod CBT</Link>
          </div>
          <div className="toggle-button sidebar-toggle">
            <button type="button" className="item-link" aria-label="Toggle sidebar">
              <span className="btn-icon-wrap">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </div>
        <div className="header-main-menu">
          <div className="header-search-bar">
            <div className="input-group stylish-input-group">
              <span className="input-group-addon">
                <button type="button" aria-label="Search">
                  <span aria-hidden="true">⌕</span>
                </button>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Find Something . . ."
                aria-label="Find something"
              />
            </div>
          </div>
          <div className="navbar-right">
            <div className="user-account">
              <span className="user-avatar">{initial}</span>
              <div>
                <div className="font-weight-bold text-dark">{user.name}</div>
                <div className="text-muted small" style={{ textTransform: "capitalize" }}>
                  {roleLabel}
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-page-one">
        <aside className="sidebar-main sidebar-menu-one sidebar-expand-md sidebar-color">
          <div className="sidebar-menu-content">
            <ul className="nav nav-sidebar-menu sidebar-toggle-view cbt-sidebar-menu">
              <li className="sidebar-section-label">CBT Workspace</li>
              {navigation.slice(0, 1).map((item) => {
                const active =
                  pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard");
                return (
                  <li key={item.label} className={`nav-item ${active ? "active" : ""}`}>
                    <Link href={item.href} className="nav-link">
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              <li className={`nav-item sidebar-nav-item ${managementActive ? "active" : ""}`}>
                <button
                  type="button"
                  className={`nav-link sidebar-nav-button ${managementActive ? "menu-active" : ""}`}
                  onClick={() => setManagementOpen((current) => !current)}
                >
                  <span>Management</span>
                </button>
                <ul className={`sub-group-menu ${managementOpen ? "sub-group-active" : ""}`}>
                  {managementLinks.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <li className="nav-item" key={item.href}>
                        <Link href={item.href} className={`nav-link ${active ? "menu-active" : ""}`}>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
              {navigation.slice(1).map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.label} className={`nav-item ${active ? "active" : ""}`}>
                    <Link href={item.href} className="nav-link">
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
        <main className="dashboard-content-one">{children}</main>
      </div>
    </div>
  );
}
