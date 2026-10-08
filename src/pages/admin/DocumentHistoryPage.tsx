import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Search, Download, FileText } from "lucide-react";
import { format } from "date-fns";

export function DocumentHistoryPage() {
    const [search, setSearch] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["history", "documents", search],
        queryFn: async () => {
            const res = await apiRequest<any>(`/history/documents?search=${search}`);
            return res?.data?.data || res?.data || res || [];
        },
    });

    return (
        <section className="space-y-6">
            <div className="flex justify-between">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight">Document History Archive</h2>
                    <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                        Access documents submitted by past and graduated students.
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
                    <label className="flex flex-1 min-w-48 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
                        <Search size={14} />
                        <input
                            type="search"
                            placeholder="Search by student or filename..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 bg-transparent outline-none"
                        />
                    </label>
                </div>

                {isLoading ? (
                    <div className="p-8 text-center text-sm text-[var(--color-muted)]">Loading...</div>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-slate-50">
                                <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Document</th>
                                <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Student</th>
                                <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Date</th>
                                <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Download</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((doc: any) => (
                                <tr key={doc.id} className="border-b">
                                    <td className="py-3 px-5 text-sm font-medium flex items-center gap-2">
                                        <FileText size={16} className="text-sky-600" />
                                        {doc.original_filename || "Unknown File"}
                                    </td>
                                    <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                        {doc.student?.first_name} {doc.student?.last_name}
                                    </td>
                                    <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                        {doc.uploaded_at ? format(new Date(doc.uploaded_at), "PPP") : "N/A"}
                                    </td>
                                    <td className="py-3 px-5 text-sm">
                                        <button
                                            onClick={() => {
                                                window.open(
                                                    `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"}/student/documents/${doc.id}/view`,
                                                    '_blank'
                                                );
                                            }}
                                            className="inline-flex items-center gap-1 text-sky-600 hover:bg-sky-50 px-2 py-1 rounded"
                                        >
                                            <Download size={14} /> Open
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
}
export default DocumentHistoryPage;
