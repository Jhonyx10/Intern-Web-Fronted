import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom"; // or your routing library
import {
  Plus,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Eye,
  Edit3,
  Calendar,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export interface EvaluationTemplateItem {
  id: number;
  item_type:
    | "rating"
    | "single_choice"
    | "multiple_choice"
    | "text"
    | "textarea";
  label: string;
  is_required: boolean;
  options?: Record<string, unknown>;
}

export interface EvaluationTemplate {
  id: number;
  section_id: number;
  section?: { id: number; name: string };
  name: string;
  description?: string;
  is_active: boolean;
  items?: EvaluationTemplateItem[];
  items_count?: number;
  created_at: string;
}

export const EvaluationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">(
    "all"
  );

  // Query templates using your TanStack Query setup
  const { data: templates = [], isLoading } = useQuery({
    queryKey: queryKeys.evaluations.templates(),
    queryFn: () => apiRequest<EvaluationTemplate[]>("/evaluation-templates"),
  });

  const filteredTemplates = templates.filter((template) => {
    const query = searchTerm.trim().toLowerCase();

    // Handle active/inactive tab status filter
    const matchesTab =
      activeTab === "all"
        ? true
        : activeTab === "active"
        ? template.is_active
        : !template.is_active;

    if (!matchesTab) return false;
    if (!query) return true;

    // Search against template fields safely (name, description, section)
    const nameMatches = (template.name ?? "").toLowerCase().includes(query);
    const descriptionMatches = (template.description ?? "")
      .toLowerCase()
      .includes(query);
    const sectionMatches = (template.section?.name ?? "")
      .toLowerCase()
      .includes(query);

    return nameMatches || descriptionMatches || sectionMatches;
  });

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 max-w-7xl mx-auto space-y-6"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Evaluation Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage OJT evaluation questionnaires, active templates, and grading
            rubrics.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/evaluation/create")} // Navigates to dedicated page
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white font-medium text-sm rounded-lg shadow-sm transition-colors duration-200 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Evaluation Template</span>
        </motion.button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div
            className="p-3 rounded-lg"
            style={{
              backgroundColor: "var(--color-accent-soft)",
              color: "var(--color-accent)",
            }}
          >
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Templates
            </p>
            <h3 className="text-xl font-bold text-gray-900">
              {templates.length}
            </h3>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Active Forms
            </p>
            <h3 className="text-xl font-bold text-gray-900">
              {templates.filter((t) => t.is_active).length}
            </h3>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Inactive Forms
            </p>
            <h3 className="text-xl font-bold text-gray-900">
              {templates.filter((t) => !t.is_active).length}
            </h3>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
          {(["all", "active", "inactive"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                activeTab === tab
                  ? "bg-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              style={
                activeTab === tab ? { color: "var(--color-accent)" } : undefined
              }
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates or sections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Template Title</th>
                <th className="px-6 py-3.5">Questions</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <Loader2
                      className="w-6 h-6 animate-spin mx-auto"
                      style={{ color: "var(--color-accent)" }}
                    />
                    <span className="mt-2 block text-xs">
                      Loading templates...
                    </span>
                  </td>
                </tr>
              ) : filteredTemplates.length > 0 ? (
                <AnimatePresence>
                  {filteredTemplates.map(
                    (template: {
                      id: React.Key;
                      title:
                        | string
                        | number
                        | bigint
                        | boolean
                        | React.ReactElement<
                            unknown,
                            string | React.JSXElementConstructor<any>
                          >
                        | Iterable<React.ReactNode>
                        | React.ReactPortal
                        | Promise<
                            | string
                            | number
                            | bigint
                            | boolean
                            | React.ReactPortal
                            | React.ReactElement<
                                unknown,
                                string | React.JSXElementConstructor<any>
                              >
                            | Iterable<React.ReactNode>
                          >;
                      description: string;
                      items_count: any;
                      items: string | any[];
                      is_active: any;
                      created_at: string | number | Date;
                    }) => (
                      <motion.tr
                        key={template.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50/80 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {template.title}
                          {template.description && (
                            <p
                              className="text-xs text-gray-400 truncate max-w-xs"
                              title={template.description} // Shows full text on hover
                            >
                              {truncateText(template.description, 50)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {template.items_count ?? template.items?.length ?? 0}{" "}
                          items
                        </td>
                        <td className="px-6 py-4">
                          {template.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(template.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                navigate(`/evaluation/details/${template.id}`)
                              }
                              className="p-1.5 text-gray-500 rounded-lg transition-colors hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                              title="View Template"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/evaluations/${template.id}/edit`)
                              }
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit Template"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  )}
                </AnimatePresence>
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No evaluation templates found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default EvaluationPage;
