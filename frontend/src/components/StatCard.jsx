export default function StatCard({ title, count, accent, subtitle }) {
  return (
    <div className="animate-fadeUp rounded-3xl border border-white/10 bg-white/[0.05] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{title}</p>
        <span
          className="h-3 w-3 rounded-full"
          style={{ background: accent }}
        />
      </div>
      <p className="font-display text-4xl text-white">{count}</p>
      <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}
