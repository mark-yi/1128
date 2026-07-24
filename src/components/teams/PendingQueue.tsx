"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  acceptPendingVolunteerAction,
  dismissPendingVolunteerAction,
} from "@/actions/pending-volunteers";
import type { StoredPendingVolunteer } from "@/lib/db";
import type { PcoTeamPosition } from "@/lib/pco/types";
import { pcoPersonUrl } from "@/lib/pco/people";

export function PendingQueue({
  pending,
  positions,
  serviceTypeId,
}: {
  pending: StoredPendingVolunteer[];
  positions: PcoTeamPosition[];
  serviceTypeId: string;
}) {
  if (pending.length === 0) {
    return (
      <div className="teams-card px-4 py-10 text-center text-sm text-[var(--teams-muted)]">
        No pending volunteers for this team.
      </div>
    );
  }

  return (
    <div className="teams-card overflow-hidden">
      {pending.map((row) => (
        <PendingRow
          key={row.id}
          row={row}
          positions={positions}
          serviceTypeId={serviceTypeId}
        />
      ))}
    </div>
  );
}

function PendingRow({
  row,
  positions,
  serviceTypeId,
}: {
  row: StoredPendingVolunteer;
  positions: PcoTeamPosition[];
  serviceTypeId: string;
}) {
  const router = useRouter();
  const [positionId, setPositionId] = useState(positions[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const personUrl = pcoPersonUrl(row.pcoPersonId);

  return (
    <div className="teams-row flex-col items-stretch sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {row.personName || "Unknown"}
        </p>
        <p className="truncate text-xs text-[var(--teams-muted)]">
          {row.personEmail ?? "—"} ·{" "}
          {row.createdAt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          {personUrl ? (
            <>
              {" · "}
              <a
                href={personUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--teams-link)]"
              >
                PCO
              </a>
            </>
          ) : null}
        </p>
        {error ? (
          <p className="mt-1 text-xs text-[var(--teams-danger)]">{error}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="teams-select w-auto min-w-[140px]"
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          disabled={pending || positions.length === 0}
        >
          {positions.length === 0 ? (
            <option value="">No positions</option>
          ) : (
            positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))
          )}
        </select>

        <button
          type="button"
          className="teams-btn teams-btn-primary"
          disabled={pending || !positionId}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await acceptPendingVolunteerAction({
                pendingId: row.id,
                teamPositionId: positionId,
                serviceTypeId: serviceTypeId || undefined,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          Accept
        </button>

        <button
          type="button"
          className="teams-btn teams-btn-danger"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await dismissPendingVolunteerAction(row.id);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
