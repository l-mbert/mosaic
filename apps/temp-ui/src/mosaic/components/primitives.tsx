import type { Tone } from "../types";
import { cn } from "@/lib/utils";

/** Four hues, all at badge scale. Structure is white, neutral, or a hairline. */
const toneBg: Record<Tone, string> = {
  neutral: "bg-tone-neutral",
  deal: "bg-tone-deal",
  esign: "bg-tone-esign",
  ai: "bg-tone-ai",
};

/** Marks anything a plugin put on screen, so its origin is never a guess. */
export function PluginDot({
  tone,
  className,
  ...props
}: React.ComponentProps<"span"> & { tone: Tone }) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 shrink-0 rounded-full", toneBg[tone], className)}
      {...props}
    />
  );
}

/** A square monogram — used for accounts and sources, never for people. */
export function Monogram({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md text-[0.625rem] font-semibold",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A ruled section heading: label, hairline, optional trailing meta. */
export function SectionRule({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="h-px flex-1 bg-border" />
      {meta ? <div className="shrink-0 text-xs text-muted-foreground">{meta}</div> : null}
    </div>
  );
}

/**
 * The container every plugin panel uses, so a plugin cannot invent its own
 * surface treatment and make the reader look like a dashboard.
 */
export function Panel({
  children,
  className,
  footer,
}: {
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}) {
  return (
    <section className="max-w-(--container-measure) overflow-hidden rounded-xl ring-1 ring-black/5">
      <div className={cn("flex items-center gap-3 px-3 py-2", className)}>{children}</div>
      {footer ? (
        <div className="flex items-center gap-2 border-t border-border bg-muted/50 px-3 py-1.5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

/** label + value on one line. A stacked stat grid costs vertical we do not have. */
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium tabular-nums">{value}</span>
    </span>
  );
}
