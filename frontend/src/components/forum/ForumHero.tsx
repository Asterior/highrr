import type { ReactNode } from "react";

interface ForumHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  stats?: Array<{ label: string; value: string | number }>;
  action?: ReactNode;
}

const ForumHero = ({ eyebrow, title, description, stats, action }: ForumHeroProps) => (
  <section className="rounded-[2rem] border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 text-white shadow-elevated">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
          {eyebrow}
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{description}</p>
      </div>
      {action}
    </div>
    {stats && stats.length > 0 && (
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-300">{stat.label}</div>
          </div>
        ))}
      </div>
    )}
  </section>
);

export default ForumHero;
