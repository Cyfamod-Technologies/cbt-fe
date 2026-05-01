"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  // { label: "Licenses", href: "/dashboard#licenses" },
  // { label: "Question Bank", href: "/dashboard#questions" },
  // { label: "Assessments", href: "/dashboard#assessments" },
  // { label: "Results", href: "/dashboard#results" },
  // { label: "Offline Sync", href: "/dashboard#sync" },
] as const;

const managementLinks = [
  { label: "Session", href: "/management/sessions" },
  { label: "Semesters", href: "/management/semesters" },
  { label: "Departments", href: "/management/departments" },
  { label: "Courses", href: "/management/courses" },
] as const;

const staffLinks = [
  { label: "View Staff", href: "/users/staff" },
  { label: "Bulk Upload", href: "/users/staff/bulk-upload" },
] as const;

const studentLinks = [
  { label: "View Student", href: "/users/students" },
  { label: "Bulk Upload", href: "/users/students/bulk-upload" },
  // { label: "Student dept/level", href: "/users/students/overrides" },
  // { label: "Student Courses", href: "/users/students/student-courses" },
] as const;

const assignLinks = [
  { label: "Courses to Dept/Level", href: "/assign/dept-level-courses" },
  { label: "Lecturer to Course", href: "/assign/lecturer-courses" },
  { label: "Exam-Officer to Dept/Level", href: "/assign/exam-officers" },
] as const;

const cbtLinks = [
  { label: "Assessment Management", href: "/cbt/admin" },
  { label: "Live Monitor", href: "/cbt/admin/live" },
  { label: "Results", href: "/cbt/results" },
  { label: "History", href: "/cbt/history" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const isRouteActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const managementActive = managementLinks.some((item) => isRouteActive(item.href));
  const staffActive = staffLinks.some((item) => isRouteActive(item.href));
  const studentsActive = studentLinks.some((item) => isRouteActive(item.href));
  const assignActive = assignLinks.some((item) => isRouteActive(item.href));
  const cbtActive = cbtLinks.some((item) => isRouteActive(item.href));
  const [managementOpen, setManagementOpen] = useState(false);
  const [managementCollapsed, setManagementCollapsed] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffCollapsed, setStaffCollapsed] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [studentsCollapsed, setStudentsCollapsed] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCollapsed, setAssignCollapsed] = useState(false);
  const [cbtOpen, setCbtOpen] = useState(false);
  const [cbtCollapsed, setCbtCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const showManagement = managementOpen || (managementActive && !managementCollapsed);
  const showStaff = staffOpen || (staffActive && !staffCollapsed);
  const showStudents = studentsOpen || (studentsActive && !studentsCollapsed);
  const showAssign = assignOpen || (assignActive && !assignCollapsed);
  const showCbt = cbtOpen || (cbtActive && !cbtCollapsed);

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

  const closeSidebarGroups = () => {
    setManagementOpen(false);
    setManagementCollapsed(false);
    setStaffOpen(false);
    setStaffCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
    setSidebarMobileOpen(false);
  };

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarMobileOpen((current) => !current);
      setSidebarCollapsed(false);
      return;
    }

    setSidebarCollapsed((current) => !current);
    setSidebarMobileOpen(false);
  };

  const toggleManagement = () => {
    const currentlyVisible = managementOpen || (managementActive && !managementCollapsed);
    setManagementOpen(!currentlyVisible);
    setManagementCollapsed(currentlyVisible);
    setStaffOpen(false);
    setStaffCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  };

  const toggleStaff = () => {
    const currentlyVisible = staffOpen || (staffActive && !staffCollapsed);
    setStaffOpen(!currentlyVisible);
    setStaffCollapsed(currentlyVisible);
    setManagementOpen(false);
    setManagementCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  };

  const toggleStudents = () => {
    const currentlyVisible = studentsOpen || (studentsActive && !studentsCollapsed);
    setStudentsOpen(!currentlyVisible);
    setStudentsCollapsed(currentlyVisible);
    setManagementOpen(false);
    setManagementCollapsed(false);
    setStaffOpen(false);
    setStaffCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  };

  const toggleAssign = () => {
    const currentlyVisible = assignOpen || (assignActive && !assignCollapsed);
    setAssignOpen(!currentlyVisible);
    setAssignCollapsed(currentlyVisible);
    setManagementOpen(false);
    setManagementCollapsed(false);
    setStaffOpen(false);
    setStaffCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  };

  const toggleCbt = () => {
    const currentlyVisible = cbtOpen || (cbtActive && !cbtCollapsed);
    setCbtOpen(!currentlyVisible);
    setCbtCollapsed(currentlyVisible);
    setManagementOpen(false);
    setManagementCollapsed(false);
    setStaffOpen(false);
    setStaffCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
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

  const isAdmin = user.role === "admin" || user.role === "super_admin";
  const roleLabel = user.role.replaceAll("_", " ");
  const initial = user.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div
      id="wrapper"
      className={`wrapper bg-ash ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${
        sidebarMobileOpen ? "sidebar-collapsed-mobile" : ""
      }`}
    >
      <div className="navbar navbar-expand-md header-menu-one bg-light">
        <div className="nav-bar-header-one">
          <div className="toggle-button sidebar-toggle desktop-sidebar-toggle">
            <button type="button" className="item-link" aria-label="Toggle sidebar" onClick={toggleSidebar}>
              <span className="btn-icon-wrap">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
          <div className="mobile-header-actions">
            <button type="button" className="mobile-header-action" aria-label="Quick action">
              <i className="far fa-arrow-alt-circle-down" aria-hidden="true" />
            </button>
            <button type="button" className="mobile-header-action" onClick={toggleSidebar} aria-label="Toggle sidebar">
              <i className="fas fa-bars" aria-hidden="true" />
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
          <div className="mobile-sidebar-header d-md-none">
            <div className="header-logo">
              <Link href="/dashboard" className="sidebar-brand-link d-flex align-items-center">
                <Image
                  src="/assets/img/logo1.png"
                  alt="Cyfamod CBT"
                  width={54}
                  height={54}
                  unoptimized
                  className="sidebar-school-logo"
                />
                <span className="sidebar-brand-text">
                  <span>Cyfamod</span>
                  <span>CBT</span>
                </span>
              </Link>
            </div>
          </div>
          <div className="sidebar-menu-content">
            <ul className="nav nav-sidebar-menu sidebar-toggle-view cbt-sidebar-menu">
              <li className="sidebar-section-label">CBT Workspace</li>
              {navigation.slice(0, 1).map((item) => {
                const active =
                  pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard");
                return (
                  <li key={item.label} className={`nav-item ${active ? "active" : ""}`}>
                    <Link href={item.href} className="nav-link" onClick={closeSidebarGroups}>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              {!isAdmin && (
                <li className={`nav-item ${pathname === "/users/students" ? "active" : ""}`}>
                  <Link href="/users/students" className="nav-link" onClick={closeSidebarGroups}>
                    <span>Students</span>
                  </Link>
                </li>
              )}
              {isAdmin && (
                <li className={`nav-item sidebar-nav-item ${managementActive ? "active" : ""}`}>
                  <button
                    type="button"
                    className={`nav-link sidebar-nav-button ${managementActive ? "menu-active" : ""}`}
                    onClick={toggleManagement}
                  >
                    <span>Management</span>
                  </button>
                  <ul className={`sub-group-menu ${showManagement ? "sub-group-active" : ""}`}>
                    {managementLinks.map((item) => {
                      const active = isRouteActive(item.href);

                      return (
                        <li className="nav-item" key={item.href}>
                          <Link href={item.href} className={`nav-link ${active ? "menu-active" : ""}`} onClick={closeSidebarGroups}>
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              )}
              {isAdmin && (
                <li className={`nav-item sidebar-nav-item ${staffActive ? "active" : ""}`}>
                  <button
                    type="button"
                    className={`nav-link sidebar-nav-button ${staffActive ? "menu-active" : ""}`}
                    onClick={toggleStaff}
                  >
                    <span>Staff</span>
                  </button>
                  <ul className={`sub-group-menu ${showStaff ? "sub-group-active" : ""}`}>
                    {staffLinks.map((item) => {
                      const active = isRouteActive(item.href);

                      return (
                        <li className="nav-item" key={item.href}>
                          <Link href={item.href} className={`nav-link ${active ? "menu-active" : ""}`} onClick={closeSidebarGroups}>
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              )}
              {isAdmin && (
                <li className={`nav-item sidebar-nav-item ${studentsActive ? "active" : ""}`}>
                  <button
                    type="button"
                    className={`nav-link sidebar-nav-button ${studentsActive ? "menu-active" : ""}`}
                    onClick={toggleStudents}
                  >
                    <span>Students</span>
                  </button>
                  <ul className={`sub-group-menu ${showStudents ? "sub-group-active" : ""}`}>
                    {studentLinks.map((item) => {
                      const active = item.href === "/users/students" ? pathname === item.href : isRouteActive(item.href);

                      return (
                        <li className="nav-item" key={item.href}>
                          <Link href={item.href} className={`nav-link ${active ? "menu-active" : ""}`} onClick={closeSidebarGroups}>
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              )}
              {isAdmin && (
                <li className={`nav-item sidebar-nav-item ${assignActive ? "active" : ""}`}>
                  <button
                    type="button"
                    className={`nav-link sidebar-nav-button ${assignActive ? "menu-active" : ""}`}
                    onClick={toggleAssign}
                  >
                    <span>Assign</span>
                  </button>
                  <ul className={`sub-group-menu ${showAssign ? "sub-group-active" : ""}`}>
                    {assignLinks.map((item) => {
                      const active = isRouteActive(item.href);

                      return (
                        <li className="nav-item" key={item.href}>
                          <Link href={item.href} className={`nav-link ${active ? "menu-active" : ""}`} onClick={closeSidebarGroups}>
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              )}
              <li className={`nav-item sidebar-nav-item ${cbtActive ? "active" : ""}`}>
                <button
                  type="button"
                  className={`nav-link sidebar-nav-button ${cbtActive ? "menu-active" : ""}`}
                  onClick={toggleCbt}
                >
                  <span>CBT</span>
                </button>
                <ul className={`sub-group-menu ${showCbt ? "sub-group-active" : ""}`}>
                  {cbtLinks.map((item) => {
                    const active =
                      isRouteActive(item.href) &&
                      !cbtLinks.some(
                        (other) =>
                          other.href !== item.href &&
                          isRouteActive(other.href) &&
                          other.href.startsWith(item.href),
                      );

                    return (
                      <li className="nav-item" key={item.href}>
                        <Link href={item.href} className={`nav-link ${active ? "menu-active" : ""}`} onClick={closeSidebarGroups}>
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
                    <Link href={item.href} className="nav-link" onClick={closeSidebarGroups}>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
        {sidebarMobileOpen && <div className="sidebar-overlay" onClick={() => setSidebarMobileOpen(false)}></div>}
        <main className="dashboard-content-one" onClick={() => setSidebarMobileOpen(false)}>
          {children}
        </main>
      </div>
    </div>
  );
}
