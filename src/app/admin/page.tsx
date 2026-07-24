import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { listForms } from "@/lib/forms/registry";
import { listSubmissions, isUsingMemoryStore } from "@/lib/db";
import { pcoPersonUrl } from "@/lib/pco/client";
import { logoutAdminAction } from "@/actions/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const submissions = await listSubmissions(100);
  const firstForm = listForms()[0];

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-2xl text-[var(--color-accent-dark)]">{brand.name}</p>
            <h1 className="mt-1 font-display text-3xl text-[var(--color-text)]">
              Submissions
            </h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Signed in as {session.email}
              {isUsingMemoryStore() ? " · memory store (set DATABASE_URL for Postgres)" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/teams"
              className="text-sm text-[var(--color-muted)] underline-offset-4 hover:underline"
            >
              Teams
            </Link>
            <Link href="/" className="text-sm text-[var(--color-muted)] underline-offset-4 hover:underline">
              Forms
            </Link>
            <form action={logoutAdminAction}>
              <button type="submit" className="text-sm text-[var(--color-muted)] underline-offset-4 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto border border-[var(--color-line)] bg-white/70">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[var(--color-bg-warm)] text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Form</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Email status</th>
                <th className="px-4 py-3 font-medium">PCO</th>
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--color-muted)]">
                    No submissions yet.
                    {firstForm ? (
                      <>
                        {" "}
                        Try{" "}
                        <Link
                          href={`/f/${firstForm.slug}`}
                          className="underline underline-offset-4"
                        >
                          /f/{firstForm.slug}
                        </Link>
                        .
                      </>
                    ) : null}
                  </td>
                </tr>
              ) : (
                submissions.map((row) => {
                  const pcoUrl = row.pcoPersonId ? pcoPersonUrl(row.pcoPersonId) : null;
                  return (
                    <tr key={row.id} className="border-t border-[var(--color-line)]">
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-soft)]">
                        {row.createdAt.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{row.formSlug}</td>
                      <td className="px-4 py-3">{row.name ?? "—"}</td>
                      <td className="px-4 py-3">{row.email ?? "—"}</td>
                      <td className="px-4 py-3">{row.emailStatus ?? "—"}</td>
                      <td className="px-4 py-3">
                        {pcoUrl ? (
                          <a
                            href={pcoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                          >
                            Open
                          </a>
                        ) : row.pcoPersonId ? (
                          <span className="text-[var(--color-muted)]">{row.pcoPersonId}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
