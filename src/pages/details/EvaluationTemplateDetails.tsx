import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  User,
  Star,
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useEvaluationTemplate } from "@/lib/queries/evaluation";
import { useTheme } from "@/context/ThemeContext"; // adjust path to wherever ThemeProvider lives

type ItemType =
  | "rating"
  | "single_choice"
  | "multiple_choice"
  | "text"
  | "textarea";

interface RatingOptions {
  min: number;
  max: number;
}

interface ChoiceOptions {
  choices: string[];
}

interface TemplateItem {
  id: number;
  evaluation_template_id: number;
  sort_order: number;
  item_type: ItemType;
  label: string;
  options: string | null; // raw JSON string from the API, e.g. "{\"min\":1,\"max\":5}"
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

/** `options` arrives as a JSON string (or null) -- parse it defensively. */
const parseOptions = (
  raw: string | null
): RatingOptions | ChoiceOptions | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

interface Creator {
  id: number;
  name: string;
  email?: string;
}

interface EvaluationTemplate {
  id: number;
  created_by_user_id: number;
  title: string;
  description: string | null;
  is_active: boolean | number; // API returns 1 / 0, not true / false
  created_at: string;
  updated_at: string;
  items?: TemplateItem[];
  creator?: Creator;
}

const typeLabel: Record<ItemType, string> = {
  rating: "Rating scale",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  text: "Short text",
  textarea: "Paragraph",
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const EvaluationTemplateDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: template,
    isLoading,
    isError,
    error,
  } = useEvaluationTemplate(id!) as {
    data: EvaluationTemplate | undefined;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };

  const { themeColor } = useTheme();

  // Items may not arrive pre-sorted -- sort_order is the source of truth.
  const sortedItems = useMemo(
    () =>
      [...(template?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [template?.items]
  );

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading template...</span>
        </div>
      </div>
    );
  }

  if (isError || !template) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <button
          onClick={() => navigate("/evaluations")}
          className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="p-8 text-center bg-rose-50 border-2 border-dashed border-rose-200 rounded-xl">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-rose-700">
            Couldn't load this template.
          </p>
          <p className="text-xs text-rose-400">
            {(error as any)?.response?.data?.message ||
              "It may have been deleted, or you don't have access."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate("/evaluation")}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Back to evaluations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {template.title}
              </h1>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  template.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {template.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <p className="text-xs text-gray-500 flex items-center gap-3 mt-1.5 flex-wrap">
              {template.creator?.name && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  {template.creator.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Created {formatDate(template.created_at)}
              </span>
              {template.updated_at !== template.created_at && (
                <span className="text-gray-400">
                  · Updated {formatDate(template.updated_at)}
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/evaluations/${id}/edit`)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>

      {/* Description */}
      {template.description && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-600 leading-relaxed">
            {template.description}
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-800 border-b pb-3 mb-5">
          Questions ({sortedItems.length})
        </h2>

        {sortedItems.length === 0 && (
          <p className="text-xs text-gray-400">
            This template has no questions yet.
          </p>
        )}

        <ol className="divide-y divide-gray-100">
          {sortedItems.map((item, index) => {
            const options = parseOptions(item.options);
            const ratingOptions =
              item.item_type === "rating"
                ? (options as RatingOptions | null)
                : null;
            const choiceOptions =
              item.item_type === "single_choice" ||
              item.item_type === "multiple_choice"
                ? (options as ChoiceOptions | null)
                : null;
            const isRating = item.item_type === "rating";
            const isChoice =
              item.item_type === "single_choice" ||
              item.item_type === "multiple_choice";

            return (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <div
                  className={
                    isRating || isChoice
                      ? "flex items-start justify-between gap-6"
                      : ""
                  }
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">
                      {index + 1}. {item.label}
                      {item.is_required && (
                        <span className="text-rose-500"> *</span>
                      )}
                    </p>
                    <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-1">
                      {typeLabel[item.item_type]}
                    </p>
                  </div>

                  {isRating && (
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {Array.from(
                        {
                          length:
                            (ratingOptions?.max ?? 5) -
                            (ratingOptions?.min ?? 1) +
                            1,
                        },
                        (_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4"
                            style={{ color: themeColor }}
                            fill={themeColor}
                          />
                        )
                      )}
                      <span className="text-[11px] text-gray-400 ml-1">
                        {ratingOptions?.min ?? 1}–{ratingOptions?.max ?? 5}
                      </span>
                    </div>
                  )}

                  {isChoice && (
                    <ul className="space-y-1.5 text-xs text-gray-600 shrink-0 text-right">
                      {(choiceOptions?.choices ?? []).map((choice, ci) => (
                        <li
                          key={ci}
                          className="flex items-center justify-end gap-1.5"
                        >
                          {choice}
                          <span style={{ color: themeColor }}>
                            {item.item_type === "single_choice" ? "○" : "☐"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {item.item_type === "text" && (
                  <div className="h-10 mt-2 bg-gray-50 border border-gray-200 rounded-md w-full max-w-sm" />
                )}

                {item.item_type === "textarea" && (
                  <div className="h-24 mt-2 bg-gray-50 border border-gray-200 rounded-md w-full" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </motion.div>
  );
};

export default EvaluationTemplateDetails;
