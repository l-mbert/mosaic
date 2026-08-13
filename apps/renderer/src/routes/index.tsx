import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { withBackendClient } from "../backend/client.ts";

const backendHealthQuery = queryOptions({
  queryKey: ["backend", "health"],
  queryFn: async () => {
    const startedAt = performance.now();
    const health = await withBackendClient((client) => client.Health());

    return {
      ...health,
      roundTripMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  },
  refetchInterval: 5_000,
});

export const Route = createFileRoute("/")({
  component: BackendStatusPage,
});

function BackendStatusPage() {
  const health = useQuery(backendHealthQuery);
  const isConnected = health.isSuccess;
  const statusLabel = isConnected ? "Connected" : health.isError ? "Unavailable" : "Connecting";

  return (
    <section className="flex min-h-dvh items-center py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl px-5 sm:px-8">
        <div className="flex flex-col gap-8">
          <header className="flex flex-col gap-3">
            <p className="font-mono text-sm tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
              Mosaic desktop
            </p>
            <div className="flex flex-col gap-2">
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Local backend status
              </h1>
              <p className="max-w-[56ch] text-pretty text-base/7 text-neutral-600 sm:text-sm/6 dark:text-neutral-300">
                This renderer talks directly to Mosaic&apos;s utility process over a private,
                schema-validated RPC channel.
              </p>
            </div>
          </header>

          <div className="rounded-2xl bg-white p-5 ring-1 ring-neutral-950/10 sm:p-7 dark:bg-neutral-900 dark:ring-white/10">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-medium">Backend connection</h2>
                  <p className="text-pretty text-base/7 text-neutral-600 sm:text-sm/6 dark:text-neutral-400">
                    Renderer to utility process
                  </p>
                </div>
                <div
                  className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-2.5 pl-1.5 text-base/6 font-medium sm:text-sm/5 ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : health.isError
                        ? "bg-red-500/10 text-red-700 dark:text-red-300"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  }`}
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      isConnected
                        ? "bg-emerald-500"
                        : health.isError
                          ? "bg-red-500"
                          : "animate-pulse bg-amber-500"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{statusLabel}</span>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-4 border-t border-neutral-950/10 pt-5 sm:grid-cols-3 dark:border-white/10">
                <StatusDetail label="Transport" value="MessagePort" />
                <StatusDetail
                  label="Protocol"
                  value={isConnected ? `Version ${health.data.protocolVersion}` : "—"}
                />
                <StatusDetail
                  label="Round trip"
                  value={isConnected ? `${health.data.roundTripMs} ms` : "—"}
                  numeric
                />
              </dl>

              {health.isError ? (
                <div className="flex flex-col items-start gap-4 border-t border-neutral-950/10 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                  <p className="max-w-[48ch] text-pretty text-base/7 text-neutral-600 sm:text-sm/6 dark:text-neutral-400">
                    The local backend did not respond. Mosaic will reconnect after the utility
                    process recovers.
                  </p>
                  <button
                    type="button"
                    className="relative shrink-0 rounded-lg bg-neutral-950 px-3 py-2 text-base/6 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 sm:text-sm/5 dark:bg-neutral-50 dark:text-neutral-950"
                    onClick={() => void health.refetch()}
                  >
                    <span
                      className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
                      aria-hidden="true"
                    />
                    Retry connection
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusDetail({
  label,
  value,
  numeric = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly numeric?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-base/7 font-medium text-neutral-950 sm:text-sm/6 dark:text-neutral-100">
        {label}
      </dt>
      <dd
        className={`truncate text-base/7 text-neutral-600 sm:text-sm/6 dark:text-neutral-400 ${numeric ? "tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
