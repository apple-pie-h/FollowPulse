import { useEffect, useMemo, useState } from "react";
import api from "./lib/api";
import FileDropZone from "./components/FileDropZone";
import ResultsTable from "./components/ResultsTable";
import StatCard from "./components/StatCard";

const APP_NAME = "FollowPulse";
const APP_TAGLINE = "See who doesn’t follow you back on Instagram.";
const YOUTUBE_EMBED_URL = "https://www.youtube.com/embed/your-video-id";
const YOUTUBE_WATCH_URL = "https://www.youtube.com/watch?v=your-video-id";

const NAV_TABS = ["Upload", "Results", "Help"];

const RESULT_TABS = [
  {
    key: "following_not_following_back",
    title: "Not Following Back",
    subtitle: "Accounts you follow that are not following you back.",
    accent: "#f59e8b",
  },
  {
    key: "mutuals",
    title: "Mutuals",
    subtitle: "Accounts where the follow goes both ways.",
    accent: "#84ccbd",
  },
  {
    key: "followers_not_followed_back",
    title: "You Don't Follow Back",
    subtitle: "People following you that you have not followed back.",
    accent: "#9db4ff",
  },
];

const helpItems = [
  {
    question: "How do I export my Instagram data?",
    answer:
      "Go to Instagram Settings, open Download Your Information, request the export in JSON format, then extract the ZIP file when it arrives.",
  },
  {
    question: "Where are the files after extraction?",
    answer:
      "Open connections/followers_and_following/. You can upload any two JSON files as long as one contains followers data and the other contains following data.",
  },
  {
    question: "Why does inactive account checking take time?",
    answer:
      "FollowPulse checks profiles one by one with a reusable headless browser and a short delay to reduce rate limits, so larger lists naturally take longer.",
  },
  {
    question: "Why can some statuses be unclear?",
    answer:
      "Instagram can return challenge pages or partial responses. If the response is ambiguous, the account may not fall cleanly into active or missing states.",
  },
];

const initialTableState = {
  search: "",
  sortKey: "username",
  sortDirection: "asc",
  page: 1,
};

function usernamesToRows(usernames) {
  return usernames.map((username) => ({ username }));
}

function YoutubeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-5.8ZM9.6 15.7V8.3L16 12l-6.4 3.7Z" />
    </svg>
  );
}

function HelpAccordion({ item, isOpen, onToggle }) {
  return (
    <div className="rounded-3xl border border-stone-200/50 bg-white/80 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-slate-800">{item.question}</span>
        <span className="text-lg text-slate-500">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen ? (
        <div className="border-t border-stone-200/70 px-5 py-4 text-sm leading-7 text-slate-600">
          {item.answer}
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("Upload");
  const [files, setFiles] = useState({ first: null, second: null });
  const [session, setSession] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState("following_not_following_back");
  const [openHelp, setOpenHelp] = useState(helpItems[0].question);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState("");
  const [jobState, setJobState] = useState({
    loading: false,
    jobId: "",
    processed: 0,
    total: 0,
    status: "idle",
    results: [],
    error: "",
  });
  const [tableState, setTableState] = useState({
    mutuals: { ...initialTableState },
    followers_not_followed_back: { ...initialTableState },
    following_not_following_back: { ...initialTableState },
    inactive_results: { ...initialTableState, sortKey: "status" },
  });

  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setCopied(""), 1800);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    if (!jobState.jobId || !jobState.loading) {
      return undefined;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const { data } = await api.get(`/check-inactive/${jobState.jobId}`);
        setJobState((current) => ({
          ...current,
          processed: data.processed ?? 0,
          total: data.total ?? 0,
          status: data.status,
          results: data.results ?? [],
          error: data.error ?? "",
          loading: data.status === "queued" || data.status === "running",
        }));

        if (data.status === "completed") {
          setSession((current) =>
            current
              ? {
                  ...current,
                  results: {
                    ...current.results,
                    inactive_results: data.results ?? [],
                  },
                  counts: {
                    ...current.counts,
                    inactive_results: (data.results ?? []).length,
                  },
                }
              : current
          );
        }
      } catch (requestError) {
        setJobState((current) => ({
          ...current,
          loading: false,
          error:
            requestError.response?.data?.error ||
            "Unable to fetch inactive-check progress.",
        }));
      }
    }, 1200);

    return () => window.clearInterval(intervalId);
  }, [jobState.jobId, jobState.loading]);

  const results = session?.results ?? {
    mutuals: [],
    followers_not_followed_back: [],
    following_not_following_back: [],
    inactive_results: [],
  };

  const counts = useMemo(
    () => ({
      mutuals: results.mutuals.length,
      followers_not_followed_back: results.followers_not_followed_back.length,
      following_not_following_back: results.following_not_following_back.length,
      inactive_results:
        session?.counts?.inactive_results ?? jobState.results.length ?? 0,
    }),
    [jobState.results.length, results, session?.counts?.inactive_results]
  );

  const currentRows = useMemo(
    () => usernamesToRows(results[activeResultTab] ?? []),
    [activeResultTab, results]
  );

  const currentTableState = tableState[activeResultTab];

  const setTabState = (tab, updates) => {
    setTableState((current) => ({
      ...current,
      [tab]: {
        ...current[tab],
        ...updates,
      },
    }));
  };

  const handleUpload = async () => {
    if (!files.first || !files.second) {
      setError("Please choose two Instagram JSON export files.");
      return;
    }

    const chosenFiles = [files.first, files.second];
    const hasInvalidExtension = chosenFiles.some(
      (file) => !file.name.toLowerCase().endsWith(".json")
    );

    if (hasInvalidExtension) {
      setError("Both uploaded files must use the .json extension.");
      return;
    }

    const formData = new FormData();
    chosenFiles.forEach((file) => formData.append("files", file));

    setIsUploading(true);
    setError("");
    setJobState({
      loading: false,
      jobId: "",
      processed: 0,
      total: 0,
      status: "idle",
      results: [],
      error: "",
    });

    try {
      const { data } = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSession({
        sessionId: data.session_id,
        counts: {
          ...data.counts,
          inactive_results: 0,
        },
        results: {
          ...data.results,
          inactive_results: [],
        },
      });
      setActiveResultTab("following_not_following_back");
      setActiveSection("Results");
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          "Upload failed. Make sure both files are valid Instagram exports."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const copyUsernames = async (tab) => {
    const rows = usernamesToRows(results[tab] ?? []);
    const text = rows.map((row) => row.username).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(tab);
  };

  const downloadResults = async (tab, format) => {
    if (!session?.sessionId) {
      return;
    }

    const response = await api.get(`/download/${tab}`, {
      params: {
        session_id: session.sessionId,
        format,
      },
      responseType: "blob",
    });

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tab}.${format === "csv" ? "csv" : "txt"}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const startInactiveCheck = async () => {
    if (!session?.sessionId) {
      setError("Upload files first so the app knows which usernames to check.");
      return;
    }

    setJobState({
      loading: true,
      jobId: "",
      processed: 0,
      total: 0,
      status: "queued",
      results: [],
      error: "",
    });
    setSession((current) =>
      current
        ? {
            ...current,
            results: {
              ...current.results,
              inactive_results: [],
            },
            counts: {
              ...current.counts,
              inactive_results: 0,
            },
          }
        : current
    );

    try {
      const { data } = await api.post("/check-inactive", {
        session_id: session.sessionId,
        delay_seconds: 1.0,
      });
      setJobState((current) => ({
        ...current,
        jobId: data.job_id,
        total: data.total,
      }));
    } catch (requestError) {
      setJobState((current) => ({
        ...current,
        loading: false,
        error:
          requestError.response?.data?.error ||
          "Inactive account check could not be started.",
      }));
    }
  };

  const progress =
    jobState.total > 0 ? Math.round((jobState.processed / jobState.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.10),_transparent_22%),linear-gradient(180deg,_#111827_0%,_#172033_45%,_#1f2937_100%)] font-body text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <header className="mb-8">
          <div className="flex flex-col items-center gap-5 rounded-[2rem] border border-white/10 bg-white/[0.05] px-6 py-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-sm sm:px-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-300">
              <span className="font-display text-lg text-white">{APP_NAME}</span>
            </div>
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
                {APP_NAME}
              </h1>
              <p className="mt-3 text-base leading-8 text-slate-300 sm:text-lg">
                {APP_TAGLINE}
              </p>
            </div>
            <a
              href="#upload-panel"
              className="inline-flex items-center rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
            >
              Upload Instagram Files
            </a>
          </div>
        </header>

        <nav className="mb-8 flex justify-center">
          <div className="inline-flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.05] p-1.5 shadow-sm">
            {NAV_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSection(tab)}
                className={`rounded-full px-5 py-2.5 text-sm transition ${
                  activeSection === tab
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        {activeSection === "Upload" ? (
          <section id="upload-panel" className="mx-auto max-w-3xl">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] backdrop-blur-sm sm:p-8">
              <div className="text-center">
                <p className="text-sm text-slate-400">Upload any two Instagram export JSON files</p>
                <h2 className="mt-2 font-display text-3xl text-white">Start with your files</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                  File names do not matter. FollowPulse will detect which upload contains followers data and which contains following data automatically.
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <FileDropZone
                  label="Follower JSON File"
                  helperText="Choose the file that should contain your follower export. Wrong order is okay."
                  accept=".json,application/json"
                  file={files.first}
                  onFileSelect={(file) =>
                    setFiles((current) => ({ ...current, first: file }))
                  }
                />
                <FileDropZone
                  label="Following JSON File"
                  helperText="Choose the file that should contain your following export. Wrong order is okay."
                  accept=".json,application/json"
                  file={files.second}
                  onFileSelect={(file) =>
                    setFiles((current) => ({ ...current, second: file }))
                  }
                />
              </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? `Preparing ${APP_NAME}...` : "Analyze files"}
                </button>
                <p className="text-xs text-slate-400">
                  We only validate the `.json` extension and Instagram export structure, not the filename or upload order.
                </p>
                {copied ? (
                  <span className="text-sm text-emerald-600">Copied usernames for {copied}.</span>
                ) : null}
              </div>

              {error ? (
                <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeSection === "Results" ? (
          <section>
            {session ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {RESULT_TABS.map((tab) => (
                    <StatCard
                      key={tab.key}
                      title={tab.title}
                      count={counts[tab.key]}
                      subtitle={tab.subtitle}
                      accent={tab.accent}
                    />
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {RESULT_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveResultTab(tab.key)}
                      className={`rounded-full px-5 py-2.5 text-sm transition ${
                        activeResultTab === tab.key
                          ? "bg-slate-100 text-slate-900"
                          : "border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {tab.title}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <ResultsTable
                    title={RESULT_TABS.find((tab) => tab.key === activeResultTab)?.title ?? ""}
                    rows={currentRows}
                    search={currentTableState.search}
                    onSearchChange={(value) => setTabState(activeResultTab, { search: value })}
                    sortKey={currentTableState.sortKey}
                    sortDirection={currentTableState.sortDirection}
                    onSortChange={(key) =>
                      setTabState(activeResultTab, {
                        sortKey: key,
                        sortDirection:
                          currentTableState.sortKey === key &&
                          currentTableState.sortDirection === "asc"
                            ? "desc"
                            : "asc",
                      })
                    }
                    page={currentTableState.page}
                    onPageChange={(page) => setTabState(activeResultTab, { page })}
                    onCopy={() => copyUsernames(activeResultTab)}
                    onDownloadCsv={() => downloadResults(activeResultTab, "csv")}
                    onDownloadTxt={() => downloadResults(activeResultTab, "txt")}
                  />
                </div>

                <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-sm text-slate-400">Optional inactive checker</p>
                      <h2 className="mt-2 font-display text-2xl text-white">
                        Check Deleted/Inactive Accounts
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-300">
                        Check whether accounts that don't follow you back are active, deleted, or deactivated.
                      </p>
                      <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                        Instagram may temporarily rate-limit inactive account checking.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startInactiveCheck}
                      disabled={jobState.loading}
                      className="rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {jobState.loading ? "Checking accounts..." : "Run inactive check"}
                    </button>
                  </div>

                  {jobState.error ? (
                    <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                      {jobState.error}
                    </div>
                  ) : null}

                  {(jobState.loading || jobState.status === "completed") ? (
                    <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/30 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-300">Progress</p>
                        <span className="text-sm text-slate-200">
                          {jobState.processed} / {jobState.total} checked
                        </span>
                      </div>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-300 via-slate-200 to-amber-200 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {jobState.loading ? (
                        <div className="mt-4 flex items-center gap-3 text-sm text-slate-300">
                          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
                          Scanning accounts that do not follow you back.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {results.inactive_results.length ? (
                    <div className="mt-6">
                      <ResultsTable
                        title="Inactive check results"
                        rows={jobState.loading ? jobState.results : results.inactive_results}
                        search={tableState.inactive_results.search}
                        onSearchChange={(value) =>
                          setTabState("inactive_results", { search: value })
                        }
                        sortKey={tableState.inactive_results.sortKey}
                        sortDirection={tableState.inactive_results.sortDirection}
                        onSortChange={(key) =>
                          setTabState("inactive_results", {
                            sortKey: key,
                            sortDirection:
                              tableState.inactive_results.sortKey === key &&
                              tableState.inactive_results.sortDirection === "asc"
                                ? "desc"
                                : "asc",
                          })
                        }
                        page={tableState.inactive_results.page}
                        onPageChange={(page) =>
                          setTabState("inactive_results", { page })
                        }
                        onCopy={async () => {
                          const text = (results.inactive_results ?? [])
                            .map((row) => row.username)
                            .join("\n");
                          await navigator.clipboard.writeText(text);
                          setCopied("inactive_results");
                        }}
                        onDownloadCsv={() => downloadResults("inactive_results", "csv")}
                        onDownloadTxt={() => downloadResults("inactive_results", "txt")}
                        secondaryColumn={{ key: "status", label: "Status" }}
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
                <h2 className="font-display text-2xl text-white">No results yet</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Upload two Instagram JSON export files in the Upload tab and FollowPulse will bring your results here automatically.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection("Upload")}
                  className="mt-6 rounded-full bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
                >
                  Go to Upload
                </button>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "Help" ? (
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:p-8">
              <p className="text-sm text-slate-400">Help and tutorial</p>
              <h2 className="mt-2 font-display text-3xl text-white">Need a hand getting your files?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Export your Instagram data in JSON format, then look inside
                {" "}
                <span className="font-medium text-white">connections/followers_and_following/</span>
                {" "}
                after extracting the ZIP file.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
                <h3 className="font-display text-2xl text-white">Quick guide</h3>
                <div className="mt-5 space-y-3">
                  {helpItems.map((item) => (
                    <HelpAccordion
                      key={item.question}
                      item={item}
                      isOpen={openHelp === item.question}
                      onToggle={() =>
                        setOpenHelp((current) => (current === item.question ? "" : item.question))
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
                <h3 className="font-display text-2xl text-white">Video walkthrough</h3>
                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/40 shadow-sm">
                  <div className="aspect-video w-full">
                    <iframe
                      className="h-full w-full"
                      src={YOUTUBE_EMBED_URL}
                      title="Instagram export tutorial"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                </div>
                <div className="mt-5">
                  <a
                    href={YOUTUBE_WATCH_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-3 rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400"
                  >
                    <YoutubeIcon />
                    Watch on YouTube
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-slate-400">
          <div className="flex flex-col items-center justify-center gap-3">
            <p>
              Created by{" "}
              <a
                href="https://github.com/apple-pie-h"
                target="_blank"
                rel="noreferrer"
                className="text-slate-200 transition hover:text-white"
              >
                apple-pie-h
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
