"use client";

import type { LinkedItem } from "@/lib/apiClient";

interface Props {
  itemName: string;
  linked: LinkedItem[];
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}

export function DeleteModal({ itemName, linked, onConfirm, onCancel, confirming = false }: Props) {
  const hasHardLinks = linked.some((l) => !l.unlinkable);
  const hasSoftLinks = linked.some((l) => l.unlinkable);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="card"
        style={{ width: "100%", maxWidth: 500, margin: "1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
      >
        <div className="card-body">
          <h4 className="mb-1" style={{ color: "#ef4444" }}>
            Cannot Delete
          </h4>
          <p className="text-muted mb-3" style={{ fontSize: "0.95rem" }}>
            <strong>{itemName}</strong> is linked to the following records:
          </p>

          <ul className="list-unstyled mb-4" style={{ fontSize: "0.9rem" }}>
            {linked.map((item, i) => (
              <li key={i} className="d-flex align-items-start mb-2">
                {item.unlinkable ? (
                  <span
                    className="badge badge-warning mr-2"
                    style={{ minWidth: 60, textAlign: "center", marginTop: 2 }}
                  >
                    Unlink
                  </span>
                ) : (
                  <span
                    className="badge badge-danger mr-2"
                    style={{ minWidth: 60, textAlign: "center", marginTop: 2 }}
                  >
                    Blocked
                  </span>
                )}
                <span>
                  <strong>{item.count}</strong> {item.label}
                  {item.unlinkable ? (
                    <span className="text-muted"> — will be removed automatically</span>
                  ) : (
                    <span className="text-danger"> — must be manually removed first</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {hasHardLinks ? (
            <div className="alert alert-danger py-2 mb-3" style={{ fontSize: "0.85rem" }}>
              Remove the blocked records above before deleting this item.
            </div>
          ) : (
            <div className="alert alert-warning py-2 mb-3" style={{ fontSize: "0.85rem" }}>
              {hasSoftLinks
                ? "The linked records above will be permanently removed."
                : "This action cannot be undone."}
            </div>
          )}

          <div className="d-flex gap-2 justify-content-end">
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={confirming}>
              Cancel
            </button>
            {!hasHardLinks && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={onConfirm}
                disabled={confirming}
              >
                {confirming ? "Deleting…" : hasSoftLinks ? "Unlink & Delete" : "Confirm Delete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
