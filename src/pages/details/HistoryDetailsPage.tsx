import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
    ArrowLeft,
    Search,
    Download,
    FileText,
    ExternalLink,
    GraduationCap,
    Layers,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

type Tab = "sections" | "students" | "documents";

interface Page<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

interface Person {
    id: number;
    name: string;
    email: string;
}

/* ── Helpers ──────────────────────────────────────────────────── */
function toPage(p: any): Page<any> {
    return {
        data: Array.isArray(p?.data) ? p.data : [],
        current_page: p?.current_page ?? 1,
        last_page: p?.last_page ?? 1,
        total: p?.total ?? 0,
    };
}

function useDebounced<T>(value: T, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

function errorMessage(e: unknown) {
    return e instanceof Error ? e.message : "Something went wrong while loading data.";
}

function useSchoolYearHistory(
    id: string | undefined,
    search: string,
    studentsPage: number,
    documentsPage: number,
) {
    return useQuery({
        queryKey: ["history", "school-year", id, search, studentsPage, documentsPage],
        enabled: !!id,
        queryFn: async () => {
            const params = new URLSearchParams({
                students_page: String(studentsPage),
                documents_page: String(documentsPage),
            });
            if (search) params.set("search", search);

            const res = await apiRequest<any>(`/history/school-years/${id}?${params}`);
            // Tolerate apiRequest returning either the raw body or { data: body }
            const body = res?.school_year ? res : res?.data;

            return {
                schoolYear: body?.school_year as any,
                dean: (body?.dean ?? null) as Person | null,
                sections: (Array.isArray(body?.sections) ? body.sections : []) as any[],
                students: toPage(body?.students),
                documents: toPage(body?.documents),
            };
        },
        placeholderData: keepPreviousData,
    });
}

/* ── Page ─────────────────────────────────────────────────────── */
export function HistoryDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [tab, setTab] = useState<Tab>("sections");
    const [search, setSearch] = useState("");
    const [studentsPage, setStudentsPage] = useState(1);
    const [documentsPage, setDocumentsPage] = useState(1);
    const debouncedSearch = useDebounced(search);

    // A new search starts both lists from page 1
    useEffect(() => {
        setStudentsPage(1);
        setDocumentsPage(1);
    }, [debouncedSearch]);

    const { data, isLoading, error } = useSchoolYearHistory(
        id,
        debouncedSearch,
        studentsPage,
        documentsPage,
    );

    const schoolYear = data?.schoolYear;
    const dean = data?.dean;
    const sections = data?.sections ?? [];
    const students = data?.students;
    const documents = data?.documents;

    const tabs: { id: Tab; label: string; count: number; icon: React.ElementType }[] = [
        { id: "sections", label: "Sections", count: sections.length, icon: Layers },
        { id: "students", label: "Students", count: students?.total ?? 0, icon: GraduationCap },
        { id: "documents", label: "Documents", count: documents?.total ?? 0, icon: FileText },
    ];

    return (
        <section className="space-y-6">
            <button
                type="button"
                onClick={() => navigate("/history")}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-soft)] transition hover:bg-slate-50"
            >
                <ArrowLeft size={14} /> Back to history
            </button>

            <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                    {schoolYear?.name ?? "School year"}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                    {schoolYear?.start_date
                        ? format(new Date(schoolYear.start_date), "MMM yyyy")
                        : "—"}
                    {" – "}
                    {schoolYear?.end_date ? format(new Date(schoolYear.end_date), "MMM yyyy") : "—"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Dean:{" "}
                    <span className="font-medium text-[var(--color-ink)]">
                        {dean?.name ?? "Not assigned"}
                    </span>
                    {dean?.email && <span> · {dean.email}</span>}
                </p>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-[var(--color-line)] bg-slate-100 p-1 w-fit">
                {tabs.map(({ id: tabId, label, count, icon: Icon }) => (
                    <button
                        key={tabId}
                        onClick={() => setTab(tabId)}
                        className={[
                            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                            tab === tabId
                                ? "bg-white shadow text-[var(--color-ink)]"
                                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
                        ].join(" ")}
                    >
                        <Icon size={15} />
                        {label} ({count})
                    </button>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)]">
                {/* Search only applies to students and documents */}
                {tab !== "sections" && (
                    <div className="flex items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
                        <label className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
                            <Search size={14} />
                            <input
                                type="search"
                                placeholder={
                                    tab === "students"
                                        ? "Search by name or ID..."
                                        : "Search by student or filename..."
                                }
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent outline-none"
                            />
                        </label>
                    </div>
                )}

                {error ? (
                    <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {errorMessage(error)}
                    </div>
                ) : isLoading ? (
                    <div className="p-8 text-center text-sm text-[var(--color-muted)]">Loading...</div>
                ) : tab === "sections" ? (
                    <SectionsTable sections={sections} />
                ) : tab === "students" ? (
                    <StudentsTable page={students!} onPageChange={setStudentsPage} />
                ) : (
                    <DocumentsTable page={documents!} onPageChange={setDocumentsPage} />
                )}
            </div>
        </section>
    );
}

/* ── Sections ─────────────────────────────────────────────────── */
function SectionsTable({ sections }: { sections: any[] }) {
    if (!sections.length) {
        return (
            <div className="p-10 text-center text-sm text-[var(--color-muted)]">
                No sections found for this school year.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b bg-slate-50">
                        <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Section</th>
                        <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Code</th>
                        <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Coordinator</th>
                        <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Students</th>
                        <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section: any) => (
                        <tr key={section.id} className="border-b hover:bg-slate-50/60">
                            <td className="py-3 px-5 text-sm font-medium">{section.name}</td>
                            <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                {section.code || "N/A"}
                            </td>
                            <td className="py-3 px-5 text-sm">
                                {section.coordinator ? (
                                    <div>
                                        <div className="font-medium">{section.coordinator.name}</div>
                                        <div className="text-xs text-[var(--color-muted)]">
                                            {section.coordinator.email}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-[var(--color-muted)]">Unassigned</span>
                                )}
                            </td>
                            <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                {section.student_count ?? 0}
                            </td>
                            <td className="py-3 px-5 text-sm">
                                <span
                                    className={[
                                        "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                        section.is_active
                                            ? "bg-emerald-50 text-emerald-700"
                                            : "bg-slate-100 text-slate-600",
                                    ].join(" ")}
                                >
                                    {section.is_active ? "Active" : "Inactive"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ── Students ─────────────────────────────────────────────────── */
function StudentsTable({
    page,
    onPageChange,
}: {
    page: Page<any>;
    onPageChange: (p: number) => void;
}) {
    if (!page.data.length) {
        return (
            <div className="p-10 text-center text-sm text-[var(--color-muted)]">
                No students found for this school year.
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b bg-slate-50">
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Student</th>
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Program</th>
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Section</th>
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {page.data.map((student: any) => (
                            <tr key={student.id} className="border-b hover:bg-slate-50/60">
                                <td className="py-3 px-5 text-sm font-medium">
                                    {student.last_name}, {student.first_name} ({student.student_number})
                                </td>
                                <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                    {student.section?.course?.name || "N/A"}
                                </td>
                                <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                    {student.section?.name || "N/A"}
                                </td>
                                <td className="py-3 px-5 text-sm">
                                    <Link
                                        to={`/students/${student.id}`}
                                        className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                                    >
                                        <ExternalLink size={14} /> View student
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} onChange={onPageChange} />
        </>
    );
}

/* ── Documents ────────────────────────────────────────────────── */
function DocumentsTable({
    page,
    onPageChange,
}: {
    page: Page<any>;
    onPageChange: (p: number) => void;
}) {
    if (!page.data.length) {
        return (
            <div className="p-10 text-center text-sm text-[var(--color-muted)]">
                No documents found for this school year.
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b bg-slate-50">
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Document</th>
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Student</th>
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Uploaded</th>
                            <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {page.data.map((doc: any) => (
                            <tr key={doc.id} className="border-b hover:bg-slate-50/60">
                                <td className="py-3 px-5 text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        <FileText size={15} className="text-sky-600 shrink-0" />
                                        {doc.original_filename || "Unknown file"}
                                    </span>
                                </td>
                                <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                    {doc.student?.first_name} {doc.student?.last_name}
                                </td>
                                <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                    {doc.uploaded_at ? format(new Date(doc.uploaded_at), "PPP") : "N/A"}
                                </td>
                                <td className="py-3 px-5 text-sm">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                window.open(
                                                    `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"}/student/documents/${doc.id}/view`,
                                                    "_blank",
                                                )
                                            }
                                            className="inline-flex items-center gap-1 text-sky-600 hover:bg-sky-50 px-2 py-1 rounded"
                                        >
                                            <Download size={14} /> Open file
                                        </button>
                                        {doc.student?.id && (
                                            <Link
                                                to={`/students/${doc.student.id}`}
                                                className="inline-flex items-center gap-1 text-slate-500 hover:text-sky-600 hover:bg-slate-50 px-2 py-1 rounded"
                                            >
                                                <ExternalLink size={14} /> View student
                                            </Link>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination page={page} onChange={onPageChange} />
        </>
    );
}

/* ── Pagination ───────────────────────────────────────────────── */
function Pagination({
    page,
    onChange,
}: {
    page: Page<any>;
    onChange: (p: number) => void;
}) {
    if (page.last_page <= 1) return null;
    return (
        <div className="flex items-center justify-between border-t border-[var(--color-line)] px-5 py-3 text-sm text-[var(--color-muted)]">
            <span>
                Page {page.current_page} of {page.last_page} · {page.total} total
            </span>
            <div className="flex gap-2">
                <button
                    disabled={page.current_page <= 1}
                    onClick={() => onChange(page.current_page - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 disabled:opacity-40"
                >
                    <ChevronLeft size={14} /> Prev
                </button>
                <button
                    disabled={page.current_page >= page.last_page}
                    onClick={() => onChange(page.current_page + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-line)] px-3 py-1.5 disabled:opacity-40"
                >
                    Next <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

export default HistoryDetailsPage;