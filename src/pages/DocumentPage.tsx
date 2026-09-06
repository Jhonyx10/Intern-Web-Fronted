import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  ClipboardList,
  Clock,
  FileText,
  Plus,
  Search,
  Tag,
  UserRound,
  X,
  ExternalLink,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useDocumentRequirements,
  useCourseDocumentRequirements,
  useSubmittedDocuments,
  useUpdateDocumentStatus,
} from "@/lib/queries/documents";
import { useCourses } from "@/lib/queries/courses";
import { CreateRequirementModal } from "@/components/modal/CreateRequirementModal";
import { CreateTypeModal } from "@/components/modal/CreateTypeModal";
import { AssignRequirementsModal } from "@/components/modal/AssignRequirementsModal";
import { DocumentPreviewModal } from "@/components/modal/DocumentPreviewModal";

// ─── animation variants ─────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};
const row = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function formatDeadline(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes?: number) {
  if (!bytes) return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${
    units[unitIndex]
  }`;
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}
export default function DocumentPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.name === "super_admin";
  const isDean = user?.role?.name === "dean";
  const courseId = user?.course?.id as number | undefined;
  const updateStatus = useUpdateDocumentStatus();
  const [activeTab, setActiveTab] = useState<"requirements" | "submitted">("requirements");
  const [search, setSearch] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    id: number;
    title: string;
    filename?: string;
    fileSize?: number;
    mimeType?: string;
    notes?: string | null;
    status?: string;
    rejectionReason?: string | null;
    reviewedAt?: string | null;
    reviewedByName?: string | null;
  } | null>(null);

  // Master courses list for Super Admin filter
  const { data: courses } = useCourses();

  // Requirements list — super_admin's own view, and the checklist source a dean
  // picks from in the assign modal.
  const {
    data: allRequirements,
    isLoading: loadingAll,
    isError: errorAll,
  } = useDocumentRequirements();

  // Dean's course-scoped view
  const {
    data: courseRequirements,
    isLoading: loadingCourse,
    isError: errorCourse,
  } = useCourseDocumentRequirements(isDean ? courseId : undefined);

  // Submitted documents list with role-based scoping and filters
  const {
    data: submittedDocs,
    isLoading: loadingSubmitted,
    isError: errorSubmitted,
  } = useSubmittedDocuments(
    activeTab === "submitted"
      ? {
        course_id: isSuperAdmin ? selectedCourseId || undefined : undefined,
        search: search.trim() || undefined,
      }
      : undefined
  );

  const requirements = isDean ? courseRequirements : allRequirements;
  const isLoadingRequirements = isDean ? loadingCourse : loadingAll;
  const isErrorRequirements = isDean ? errorCourse : errorAll;

  const currentIds = useMemo(
    () => (courseRequirements ?? []).map((r) => r.id),
    [courseRequirements]
  );

  const currentDeadline = courseRequirements?.[0]?.pivot?.deadline_at;

  const filteredRequirements = (requirements ?? []).filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalRequirements = requirements?.length ?? 0;
  const activeRequirements = requirements?.filter((r) => r.is_active).length ?? 0;
  const inactiveRequirements = totalRequirements - activeRequirements;

  const totalSubmitted = submittedDocs?.length ?? 0;

  return (
    <>
      <motion.section
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* ── Page header ──────────────────────────────────── */}
        <motion.div
          variants={row}
          className="flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--color-accent)] uppercase">
              Document Management
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              {activeTab === "submitted"
                ? "Intern Submitted Documents"
                : isDean
                ? "Your Course Requirements"
                : "Document Requirements"}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              {activeTab === "submitted"
                ? "Review and track all documents uploaded by students and interns."
                : isDean
                ? "Documents your students are required to submit, and when they're due."
                : "Manage the master list of document types and requirements."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSuperAdmin && activeTab === "requirements" && (
              <>
                <button
                  type="button"
                  onClick={() => setShowTypeModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] shadow-sm transition hover:border-violet-300 hover:text-violet-600"
                >
                  <Tag size={15} /> Document Type
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                >
                  <Plus size={15} /> New Requirement
                </button>
              </>
            )}

            {isDean && activeTab === "requirements" && (
              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-muted)] shadow-sm transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                <ClipboardList size={15} /> Manage Requirements
              </button>
            )}
          </div>
        </motion.div>

        {/* ── View Toggle Tabs ─────────────────────────────── */}
        <motion.div variants={row} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("requirements");
              setSearch("");
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "requirements"
                ? "bg-[var(--color-accent)] text-white shadow-sm"
                : "bg-white text-[var(--color-muted)] hover:bg-slate-100 border border-[var(--color-line)]"
            }`}
          >
            <FileText size={16} /> Requirements Needed
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("submitted");
              setSearch("");
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "submitted"
                ? "bg-[var(--color-accent)] text-white shadow-sm"
                : "bg-white text-[var(--color-muted)] hover:bg-slate-100 border border-[var(--color-line)]"
            }`}
          >
            <UserRound size={16} /> Intern Submitted Documents
          </button>
        </motion.div>

        {/* ── Stat cards ───────────────────────────────────── */}
        {activeTab === "requirements" ? (
          <motion.div
            variants={row}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3"
          >
            {[
              {
                label: isDean ? "Assigned" : "Total requirements",
                value: totalRequirements,
                icon: FileText,
                color:
                  "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
              },
              {
                label: "Active",
                value: activeRequirements,
                icon: BookOpen,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Inactive",
                value: inactiveRequirements,
                icon: X,
                color: "text-red-500 bg-red-50",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <article
                key={label}
                className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm ${color}`}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs font-medium text-[var(--color-muted)]">
                    {label}
                  </p>
                </div>
              </article>
            ))}
          </motion.div>
        ) : (
          <motion.div
            variants={row}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3"
          >
            {[
              {
                label: "Total Submitted",
                value: totalSubmitted,
                icon: UserRound,
                color:
                  "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
              },
              {
                label: "Reviewed / Approved",
                value:
                  submittedDocs?.filter((d) => d.review_status === "approved")
                    .length ?? 0,
                icon: BookOpen,
                color: "text-emerald-600 bg-emerald-50",
              },
              {
                label: "Pending Review",
                value:
                  submittedDocs?.filter(
                    (d) => d.review_status === "pending" || !d.review_status
                  ).length ?? 0,
                icon: Clock,
                color: "text-amber-600 bg-amber-50",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <article
                key={label}
                className="flex items-center gap-4 rounded-2xl border border-[var(--color-line)] bg-white/80 px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm ${color}`}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs font-medium text-[var(--color-muted)]">
                    {label}
                  </p>
                </div>
              </article>
            ))}
          </motion.div>
        )}

        {/* ── Error banner ─────────────────────────────────── */}
        {(activeTab === "requirements"
          ? isErrorRequirements
          : errorSubmitted) && (
          <motion.div
            variants={row}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          >
            <p className="text-sm font-medium text-red-700">
              Couldn't load documents. Please check your network connection and
              try again.
            </p>
          </motion.div>
        )}

        {/* ── Table card ───────────────────────────────────── */}
        <motion.div
          variants={row}
          className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)] backdrop-blur"
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
            <label className="flex flex-1 min-w-48 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-muted)] focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20 transition">
              <Search size={14} />
              <input
                type="search"
                placeholder={
                  activeTab === "submitted"
                    ? "Search student name, student number, or filename…"
                    : "Search requirements…"
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-[var(--color-muted)] text-[var(--color-ink)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                >
                  <X size={12} />
                </button>
              )}
            </label>

            {/* Super Admin Course Dropdown Filter */}
            {isSuperAdmin && activeTab === "submitted" && (
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-[var(--color-muted)]" />
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] transition cursor-pointer"
                >
                  <option value="">All Courses</option>
                  {courses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="ml-auto text-xs text-[var(--color-muted)]">
              {activeTab === "requirements"
                ? isLoadingRequirements
                  ? "Loading…"
                  : `${filteredRequirements.length} of ${totalRequirements}`
                : loadingSubmitted
                ? "Loading…"
                : `${submittedDocs?.length ?? 0} submitted`}
            </span>
          </div>

          {/* ── Requirements Table ───────────────────────────── */}
          {activeTab === "requirements" ? (
            isLoadingRequirements ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-muted)]">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
                <p className="text-sm">Loading requirements…</p>
              </div>
            ) : filteredRequirements.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
                <ClipboardList size={36} className="text-[var(--color-line)]" />
                <p className="text-sm font-medium text-[var(--color-muted)]">
                  {search
                    ? "No requirements match your search."
                    : isDean
                    ? "No requirements assigned yet."
                    : "No document requirements have been created yet."}
                </p>
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    Clear search
                  </button>
                ) : isDean ? (
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(true)}
                    className="mt-1 flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--color-accent-hover)]"
                  >
                    <Plus size={15} /> Select Requirements
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--color-line)] bg-slate-50/70">
                      <th className="py-3 pl-5 pr-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Requirement
                      </th>
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Type
                      </th>
                      {isDean && (
                        <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                          Deadline
                        </th>
                      )}
                      <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={container}
                    initial="hidden"
                    animate="show"
                  >
                    <AnimatePresence>
                      {filteredRequirements.map((req) => (
                        <motion.tr
                          key={req.id}
                          variants={row}
                          className="group border-b border-[var(--color-line)] last:border-0 hover:bg-slate-50/50 transition"
                        >
                          <td className="py-3.5 pl-5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                                <FileText size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                                  {req.title}
                                </p>
                                {req.description && (
                                  <p className="truncate text-xs text-[var(--color-muted)]">
                                    {req.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            {req.document_type ? (
                              <span className="inline-flex items-center rounded-md bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                                {req.document_type.name}
                              </span>
                            ) : (
                              <span className="text-sm text-[var(--color-muted)]">
                                —
                              </span>
                            )}
                          </td>

                          {isDean && (
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]">
                                <Clock
                                  size={13}
                                  className="shrink-0 text-[var(--color-muted)]"
                                />
                                <span>
                                  {formatDeadline(req.pivot?.deadline_at)}
                                </span>
                              </div>
                            </td>
                          )}

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                req.is_active
                                  ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {req.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </motion.tbody>
                </table>
              </div>
            )
          ) : /* ── Submitted Documents Table ───────────────────── */
          loadingSubmitted ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-muted)]">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
              <p className="text-sm">Loading submitted documents…</p>
            </div>
          ) : (submittedDocs?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
              <UserRound size={36} className="text-[var(--color-line)]" />
              <p className="text-sm font-medium text-[var(--color-muted)]">
                {search
                  ? "No submitted documents match your search."
                  : "No intern document submissions found."}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-slate-50/70">
                    <th className="py-3 pl-5 pr-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Student / Intern
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Course / Section
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Requirement / Document
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Filename
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Submitted Date
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Action
                    </th>
                  </tr>
                </thead>
                <motion.tbody
                  variants={container}
                  initial="hidden"
                  animate="show"
                >
                  <AnimatePresence>
                    {submittedDocs?.map((doc) => {
                      const studentName = doc.student
                        ? `${doc.student.last_name}, ${doc.student.first_name}`
                        : "Unknown Student";
                      const courseCode =
                        doc.student?.section?.course?.code ?? "—";
                      const sectionCode = doc.student?.section?.code ?? "";

                      const reqTitle =
                        doc.document_requirement?.title ??
                        doc.document_type?.name ??
                        "Submitted Document";

                      const status =
                        doc.review_status?.toLowerCase() ?? "pending";

                      return (
                        <motion.tr
                          key={doc.id}
                          variants={row}
                          className="group border-b border-[var(--color-line)] last:border-0 hover:bg-slate-50/50 transition"
                        >
                          {/* Student */}
                          <td className="py-3.5 pl-5 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700 font-semibold text-xs">
                                {doc.student?.first_name?.[0]}
                                {doc.student?.last_name?.[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                                  {studentName}
                                </p>
                                {doc.student?.student_number && (
                                  <p className="truncate text-xs text-[var(--color-muted)]">
                                    {doc.student.student_number}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Course / Section */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              {courseCode}{" "}
                              {sectionCode ? `(${sectionCode})` : ""}
                            </span>
                          </td>

                          {/* Requirement / Document */}
                          <td className="px-4 py-3.5">
                            <p className="truncate text-sm font-medium text-[var(--color-ink)] max-w-xs">
                              {reqTitle}
                            </p>
                          </td>

                          {/* Filename */}
                          <td className="px-4 py-3.5">
                            <p
                              className="truncate text-xs text-[var(--color-muted)] max-w-44"
                              title={doc.original_filename}
                            >
                              {doc.original_filename}
                            </p>
                            {(doc.file_size || doc.mime_type) && (
                              <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">
                                {[
                                  formatFileSize(doc.file_size),
                                  doc.mime_type?.split("/")[1]?.toUpperCase(),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </td>

                          {/* Submitted Date */}
                          <td className="px-4 py-3.5">
                            <span className="text-xs text-[var(--color-muted)]">
                              {formatDeadline(doc.uploaded_at)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                status === "approved"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : status === "rejected"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDoc({
                                  id: doc.id,
                                  title: reqTitle,
                                  filename: doc.original_filename,
                                  fileSize: doc.file_size,
                                  mimeType: doc.mime_type,
                                  notes: doc.notes,
                                  status: doc.review_status,
                                  rejectionReason: doc.rejection_reason,
                                  reviewedAt: doc.reviewed_at,
                                  reviewedByName: doc.reviewed_by?.name,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-600 shadow-sm hover:bg-sky-50 transition whitespace-nowrap"
                            >
                              <ExternalLink size={12} /> View
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </motion.tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.section>

      {/* ── Modals ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isSuperAdmin && showCreateModal && (
          <CreateRequirementModal
            key="create-requirement"
            visible={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />
        )}
        {isSuperAdmin && showTypeModal && (
          <CreateTypeModal
            key="create-type"
            visible={showTypeModal}
            onClose={() => setShowTypeModal(false)}
          />
        )}
        {isDean && courseId && showAssignModal && (
          <AssignRequirementsModal
            key="assign-requirements"
            visible={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            courseId={courseId}
            masterList={allRequirements ?? []}
            currentIds={currentIds}
            currentDeadline={currentDeadline}
          />
        )}
        {previewDoc && (
          <DocumentPreviewModal
            key="document-preview"
            visible={!!previewDoc}
            onClose={() => setPreviewDoc(null)}
            fetchUrl={`${import.meta.env.VITE_API_URL?.replace(
              /\/$/,
              ""
            )}/student/documents/${previewDoc.id}/view`}
            title={previewDoc.title}
            filename={previewDoc.filename}
            fileSize={previewDoc.fileSize}
            mimeType={previewDoc.mimeType}
            notes={previewDoc.notes}
            status={previewDoc.status}
            rejectionReason={previewDoc.rejectionReason}
            reviewedAt={previewDoc.reviewedAt}
            reviewedByName={previewDoc.reviewedByName}
            isSubmittingReview={updateStatus.isPending}
            onApprove={async () => {
              await updateStatus.mutateAsync({
                id: previewDoc.id,
                status: "approved",
              });
              setPreviewDoc((prev) =>
                prev ? { ...prev, status: "approved" } : prev
              );
            }}
            onReject={async (reason) => {
              await updateStatus.mutateAsync({
                id: previewDoc.id,
                status: "rejected",
                rejection_reason: reason,
              });
              setPreviewDoc((prev) =>
                prev
                  ? { ...prev, status: "rejected", rejectionReason: reason }
                  : prev
              );
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
