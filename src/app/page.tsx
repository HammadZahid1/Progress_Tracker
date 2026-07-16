import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-10 px-6 py-20">
      <div className="text-center">
        <p className="font-mono text-xs uppercase tracking-[0.4em] text-white/40">
          daily progress
        </p>
        <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Track it. Tick it. Ship it.
        </h1>
      </div>

      <div className="grid w-full gap-5 sm:grid-cols-2">
        <TrackerCard
          href="/work"
          label="Work"
          desc="Daily tasks, ticked or crossed."
          accent="cyan"
        />
        <TrackerCard
          href="/study"
          label="Study"
          desc="Daily assignments, tracked."
          accent="fuchsia"
        />
      </div>
    </div>
  );
}

function TrackerCard({
  href,
  label,
  desc,
  accent,
}: {
  href: string;
  label: string;
  desc: string;
  accent: "cyan" | "fuchsia";
}) {
  const styles =
    accent === "cyan"
      ? {
          border: "hover:border-cyan-400/60",
          glow: "hover:shadow-[0_0_35px_-8px_rgba(34,211,238,0.5)]",
          text: "text-cyan-300",
          dot: "bg-cyan-400",
        }
      : {
          border: "hover:border-fuchsia-400/60",
          glow: "hover:shadow-[0_0_35px_-8px_rgba(232,121,249,0.5)]",
          text: "text-fuchsia-300",
          dot: "bg-fuchsia-400",
        };

  return (
    <Link
      href={href}
      className={`group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition ${styles.border} ${styles.glow}`}
    >
      <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      <span className={`font-mono text-xl font-semibold ${styles.text}`}>
        {label}
      </span>
      <span className="font-mono text-sm text-white/40">{desc}</span>
      <span className="mt-2 font-mono text-xs text-white/30 transition group-hover:text-white/60">
        enter →
      </span>
    </Link>
  );
}
