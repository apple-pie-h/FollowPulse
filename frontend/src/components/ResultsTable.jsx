const PAGE_SIZE = 12;

function sortRows(rows, sortKey, sortDirection) {
  const copy = [...rows];
  copy.sort((a, b) => {
    const left = String(a[sortKey] ?? "").toLowerCase();
    const right = String(b[sortKey] ?? "").toLowerCase();

    if (left < right) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (left > right) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });
  return copy;
}

export default function ResultsTable({
  title,
  rows,
  search,
  onSearchChange,
  sortKey,
  sortDirection,
  onSortChange,
  page,
  onPageChange,
  onCopy,
  onDownloadCsv,
  onDownloadTxt,
  secondaryColumn = null,
}) {
  const filtered = rows.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
  );
  const sorted = sortRows(filtered, sortKey, sortDirection);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-2xl text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search, sort, copy, and export your results.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]"
          >
            Copy usernames
          </button>
          <button
            type="button"
            onClick={onDownloadCsv}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={onDownloadTxt}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]"
          >
            Download TXT
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="text"
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value);
            onPageChange(1);
          }}
          placeholder="Search usernames..."
          className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-white outline-none ring-0 transition focus:border-slate-400 lg:max-w-sm"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onSortChange("username")}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]"
          >
            Sort username
          </button>
          {secondaryColumn ? (
            <button
              type="button"
              onClick={() => onSortChange(secondaryColumn.key)}
              className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/[0.08]"
            >
              Sort {secondaryColumn.label.toLowerCase()}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/[0.04]">
            <tr>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.24em] text-slate-400">
                Username
              </th>
              {secondaryColumn ? (
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.24em] text-slate-400">
                  {secondaryColumn.label}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-slate-950/20">
            {pageRows.length ? (
              pageRows.map((row) => (
                <tr key={`${row.username}-${row.status ?? "username"}`}>
                  <td className="px-4 py-3 text-sm text-slate-100">{row.username}</td>
                  {secondaryColumn ? (
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {row[secondaryColumn.key]}
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={secondaryColumn ? 2 : 1}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  No usernames match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Showing {pageRows.length} of {sorted.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/[0.08]"
          >
            Previous
          </button>
          <span>
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className="rounded-full border border-white/10 px-4 py-2 transition hover:bg-white/[0.08]"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
