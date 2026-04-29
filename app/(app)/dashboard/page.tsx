import Link from "next/link";

const summaryCards = [
  {
    label: "Schools",
    value: "1",
    icon: "S",
    accent: "bg-light-green",
  },
  {
    label: "Question Types",
    value: "4",
    icon: "Q",
    accent: "bg-skyblue",
  },
  {
    label: "Exam Controls",
    value: "7",
    icon: "E",
    accent: "bg-yellow",
  },
  {
    label: "Build Phase",
    value: "v1.0",
    icon: "V",
    accent: "bg-violet-blue",
  },
] as const;

const workflowRows = [
  ["Foundation", "Auth, roles, current user, API client", "In progress"],
  ["Catalog", "Schools, levels, courses, licenses", "Next"],
  ["Question Workflow", "Create, export, import, review, approve", "Planned"],
  ["Exam Workflow", "Schedule, register students, attempt lifecycle", "Planned"],
  ["Results", "Score, publish, review according to settings", "Planned"],
] as const;

const quickActions = [
  ["School Setup", "#schools"],
  ["License Usage", "#licenses"],
  ["Question Bank", "#questions"],
  ["Exam Management", "#exams"],
  ["Offline Sync", "#sync"],
] as const;

export default function DashboardPage() {
  return (
    <>
      <div className="breadcrumbs-area">
        <h3>CBT Dashboard</h3>
        <ul>
          <li>
            <Link href="/dashboard">Home</Link>
          </li>
          <li>Dashboard</li>
        </ul>
      </div>

      <div className="row">
        {summaryCards.map((card) => (
          <div className="col-lg-3 col-md-6 col-12" key={card.label}>
            <div className={`dashboard-summery-one ${card.accent}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="item-icon">{card.icon}</div>
                <div style={{ textAlign: "right" }}>
                  <div className="item-number">{card.value}</div>
                  <div className="item-title">{card.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row">
        <div className="col-lg-8 col-12">
          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Build Workflow</h3>
                </div>
                <span className="badge badge-info">Standalone CBT</span>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      <th>Scope</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflowRows.map(([phase, scope, status]) => (
                      <tr key={phase}>
                        <td className="font-weight-bold">{phase}</td>
                        <td className="text-muted">{scope}</td>
                        <td>
                          <span
                            className={`badge ${
                              status === "In progress"
                                ? "badge-success"
                                : status === "Next"
                                  ? "badge-warning"
                                  : "badge-info"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card height-auto" id="questions">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Question Workflow Rules</h3>
                </div>
              </div>
              <div className="row">
                {["Multiple Choice", "Multiple Select", "True/False", "Short Answer"].map(
                  (type) => (
                    <div className="col-lg-6 col-12" key={type}>
                      <div className="alert alert-secondary">
                        <strong>{type}</strong>
                        <div className="text-muted small">
                          Staff/admin create, staff export, admin import and approve.
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4 col-12">
          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Quick Actions</h3>
                </div>
              </div>
              <div className="quick-action-list">
                {quickActions.map(([label, href]) => (
                  <Link href={`/dashboard${href}`} className="quick-action" key={label}>
                    <span>{label}</span>
                    <span aria-hidden="true">›</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="card height-auto" id="sync">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Offline Sync</h3>
                </div>
              </div>
              <p className="text-muted" style={{ lineHeight: 1.7 }}>
                Offline mode must keep only one school&apos;s data locally,
                queue changes, and sync with the online server when connectivity
                returns.
              </p>
              <div className="alert alert-warning" style={{ marginBottom: 0 }}>
                Backend remains the source of truth for sync state and conflicts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
