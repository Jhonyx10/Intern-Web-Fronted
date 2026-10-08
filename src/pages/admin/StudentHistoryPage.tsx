import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Search, ExternalLink } from "lucide-react";

export function StudentHistoryPage() {
    const [search, setSearch] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["history", "students", search],
        queryFn: async () => {
            const res = await apiRequest<any>(`/history/students?search=${search}`);
            return res?.data?.data || res?.data || res || [];
        },
    });

    return (
        <section className="space-y-6">
            <div className="flex justify-between">
                <div>
                    <h2 className="text-3xl font-semibold tracking-tight">Student History</h2>
                    <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                        Historical archive of graduated or inactive students.
                    </p>
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/80 shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5">
                    <label className="flex flex-1 min-w-48 items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-muted)]">
                        <Search size={14} />
                        <input
                            type="search"
                            placeholder="Search by name or ID..."
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
                                <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Student</th>
                                <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Program</th>
                                <th className="py-3 px-5 text-xs text-[var(--color-muted)]">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((student: any) => (
                                <tr key={student.id} className="border-b">
                                    <td className="py-3 px-5 text-sm font-medium">
                                        {student.last_name}, {student.first_name} ({student.student_number})
                                    </td>
                                    <td className="py-3 px-5 text-sm text-[var(--color-muted)]">
                                        {student.section?.course?.name || "N/A"}
                                    </td>
                                    <td className="py-3 px-5 text-sm">
                                        <a
                                            href={`/app/students/${student.id}`}
                                            className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                                        >
                                            <ExternalLink size={14} /> View File
                                        </a>
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
export default StudentHistoryPage;
