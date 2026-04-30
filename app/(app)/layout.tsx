"use client";

import Link from "next/link";
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

const userLinks = [
  { label: "Staff", href: "/users/staff" },
  { label: "Staff Bulk Upload", href: "/users/staff/bulk-upload" },
] as const;

const studentLinks = [
  { label: "View Student", href: "/users/students" },
  { label: "Bulk Upload", href: "/users/students/bulk-upload" },
  { label: "Student dept/level", href: "/users/students/overrides" },
  { label: "Student Courses", href: "/users/students/student-courses" },
] as const;

const assignLinks = [
  { label: "Lecturer to Course", href: "/assign/lecturer-courses" },
  { label: "Assessment-Officer to Dept/Level", href: "/assign/exam-officers" },
] as const;

const cbtLinks = [
  { label: "Quiz Management", href: "/cbt/admin" },
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
  const usersActive = [...userLinks, ...studentLinks].some((item) => isRouteActive(item.href));
  const studentsActive = studentLinks.some((item) => isRouteActive(item.href));
  const assignActive = assignLinks.some((item) => isRouteActive(item.href));
  const cbtActive = cbtLinks.some((item) => isRouteActive(item.href));
  const [managementOpen, setManagementOpen] = useState(false);
  const [managementCollapsed, setManagementCollapsed] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [usersCollapsed, setUsersCollapsed] = useState(false);
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [studentsCollapsed, setStudentsCollapsed] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCollapsed, setAssignCollapsed] = useState(false);
  const [cbtOpen, setCbtOpen] = useState(false);
  const [cbtCollapsed, setCbtCollapsed] = useState(false);
  const showManagement = managementOpen || (managementActive && !managementCollapsed);
  const showUsers = usersOpen || (usersActive && !usersCollapsed);
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

  useEffect(() => {
    setManagementOpen(false);
    setManagementCollapsed(false);
    setUsersOpen(false);
    setUsersCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const closeSidebarGroups = () => {
    setManagementOpen(false);
    setManagementCollapsed(false);
    setUsersOpen(false);
    setUsersCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  };

  const toggleManagement = () => {
    const currentlyVisible = managementOpen || (managementActive && !managementCollapsed);
    setManagementOpen(!currentlyVisible);
    setManagementCollapsed(currentlyVisible);
    setUsersOpen(false);
    setUsersCollapsed(false);
    setStudentsOpen(false);
    setStudentsCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  };

  const toggleUsers = () => {
    const currentlyVisible = usersOpen || (usersActive && !usersCollapsed);
    setUsersOpen(!currentlyVisible);
    setUsersCollapsed(currentlyVisible);
    setManagementOpen(false);
    setManagementCollapsed(false);
    setAssignOpen(false);
    setAssignCollapsed(false);
    setCbtOpen(false);
    setCbtCollapsed(false);
  };

  const toggleStudents = () => {
    const currentlyVisible = studentsOpen || (studentsActive && !studentsCollapsed);
    setStudentsOpen(!currentlyVisible);
    setStudentsCollapsed(currentlyVisible);
    setAssignOpen(false);
    setAssignCollapsed(false);
  };

  const toggleAssign = () => {
    const currentlyVisible = assignOpen || (assignActive && !assignCollapsed);
    setAssignOpen(!currentlyVisible);
    setAssignCollapsed(currentlyVisible);
    setManagementOpen(false);
    setManagementCollapsed(false);
    setUsersOpen(false);
    setUsersCollapsed(false);
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
    setUsersOpen(false);
    setUsersCollapsed(false);
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
                    <Link href={item.href} className="nav-link" onClick={closeSidebarGroups}>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
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
              <li className={`nav-item sidebar-nav-item ${usersActive ? "active" : ""}`}>
                <button
                  type="button"
                  className={`nav-link sidebar-nav-button ${usersActive ? "menu-active" : ""}`}
                  onClick={toggleUsers}
                >
                  <span>Users</span>
                </button>
                <ul className={`sub-group-menu ${showUsers ? "sub-group-active" : ""}`}>
                  {userLinks.map((item) => {
                    const active = isRouteActive(item.href);

                    return (
                      <li className="nav-item" key={item.href}>
                        <Link href={item.href} className={`nav-link ${active ? "menu-active" : ""}`} onClick={closeSidebarGroups}>
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
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
                </ul>
              </li>
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
        <main className="dashboard-content-one">{children}</main>
      </div>
    </div>
  );
}
