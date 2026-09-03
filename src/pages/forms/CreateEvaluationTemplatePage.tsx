import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  AlertCircle,
  BookOpen,
  Check,
  Plus,
  X,
  Star,
  ListChecks,
  CheckSquare,
  Type as TypeIcon,
  AlignLeft,
} from "lucide-react";
import {
  useCreateEvaluationTemplate,
  type FormItem,
} from "@/lib/queries/evaluation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toaster";
import { useTheme } from "@/context/ThemeContext"; // adjust path to wherever ThemeProvider lives

// ---------------------------------------------------------------------------
// Static config: keeps question-type metadata in one place so the builder,
// the review screen, and validation all stay in sync.
// ---------------------------------------------------------------------------

type ItemType = FormItem["item_type"];

const QUESTION_TYPES: {
  type: ItemType;
  label: string;
  hint: string;
  icon: React.ElementType;
}[] = [
  { type: "rating", label: "Rating scale", hint: "1–5 stars", icon: Star },
  {
    type: "single_choice",
    label: "Single choice",
    hint: "Pick one option",
    icon: ListChecks,
  },
  {
    type: "multiple_choice",
    label: "Multiple choice",
    hint: "Pick several options",
    icon: CheckSquare,
  },
  {
    type: "text",
    label: "Short text",
    hint: "One line answer",
    icon: TypeIcon,
  },
  {
    type: "textarea",
    label: "Paragraph",
    hint: "Longer written answer",
    icon: AlignLeft,
  },
];

const typeMeta = (type: ItemType) =>
  QUESTION_TYPES.find((t) => t.type === type) ?? QUESTION_TYPES[0];

const defaultOptionsFor = (type: ItemType) => {
  if (type === "rating") return { min: 1, max: 5 };
  if (type === "single_choice" || type === "multiple_choice")
    return { choices: ["Option 1", "Option 2"] };
  return null;
};

const STEPS = ["Details", "Questions", "Review"] as const;

export const CreateEvaluationTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { themeColor } = useTheme();
  const createMutation = useCreateEvaluationTemplate();

  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Template meta
  const [courseIds, setCourseIds] = useState<number[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Questionnaire items
  const [items, setItems] = useState<FormItem[]>([
    {
      item_type: "rating",
      label: "Overall technical performance",
      is_required: true,
      options: { min: 1, max: 5 },
    },
  ]);

  // Auto-assign the course from the logged-in Dean's profile
  useEffect(() => {
    if (user?.course?.id !== undefined && user?.course?.id !== null) {
      const numericCourseId = Number(user.course.id);
      if (!isNaN(numericCourseId)) setCourseIds([numericCourseId]);
    }
  }, [user]);

  // -------------------------------------------------------------------
  // Item helpers
  // -------------------------------------------------------------------

  const handleAddItem = (type: ItemType) => {
    setItems((prev) => [
      ...prev,
      {
        item_type: type,
        label: "",
        is_required: true,
        options: defaultOptionsFor(type),
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleItemChange = <K extends keyof FormItem>(
    index: number,
    key: K,
    value: FormItem[K]
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index] };

      if (key === "item_type") {
        const newType = value as ItemType;
        item.item_type = newType;
        item.options = defaultOptionsFor(newType) as FormItem["options"];
      } else {
        (item as any)[key] = value;
      }

      next[index] = item;
      return next;
    });
  };

  const handleChoiceChange = (
    index: number,
    choiceIndex: number,
    value: string
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const choices = [...(next[index].options?.choices ?? [])];
      choices[choiceIndex] = value;
      next[index] = {
        ...next[index],
        options: { ...next[index].options, choices },
      };
      return next;
    });
  };

  const handleAddChoice = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      const choices = [...(next[index].options?.choices ?? [])];
      choices.push(`Option ${choices.length + 1}`);
      next[index] = {
        ...next[index],
        options: { ...next[index].options, choices },
      };
      return next;
    });
  };

  const handleRemoveChoice = (index: number, choiceIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      const choices = (next[index].options?.choices ?? []).filter(
        (_, i) => i !== choiceIndex
      );
      next[index] = {
        ...next[index],
        options: { ...next[index].options, choices },
      };
      return next;
    });
  };

  // -------------------------------------------------------------------
  // Validation — surfaced inline instead of only at submit time
  // -------------------------------------------------------------------

  const detailsError = !title.trim() ? "Give the template a title." : null;

  const itemErrors = useMemo(
    () =>
      items.map((item) => {
        if (!item.label.trim()) return "This question needs a label.";
        if (
          (item.item_type === "single_choice" ||
            item.item_type === "multiple_choice") &&
          (item.options?.choices?.filter((c) => c.trim()).length ?? 0) < 2
        ) {
          return "Add at least two options.";
        }
        return null;
      }),
    [items]
  );

  const questionsError =
    items.length === 0
      ? "Add at least one question."
      : itemErrors.find((e) => e) ?? null;

  const canGoToQuestions = !detailsError && courseIds.length > 0;
  const canReview = canGoToQuestions && !questionsError;

  const goToStep = (target: 0 | 1 | 2) => {
    if (target === 1 && !canGoToQuestions) return;
    if (target === 2 && !canReview) return;
    setStep(target);
  };

  // -------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------

  const handleSubmit = () => {
    if (courseIds.length === 0) {
      addToast(
        "error",
        "Unauthorized assignment",
        "Your account does not have an assigned department/course."
      );
      return;
    }
    if (!canReview) {
      addToast(
        "warning",
        "Missing fields",
        "Please finish the earlier steps first."
      );
      return;
    }

    const sanitizedItems = items.map((item, idx) => ({
      label: item.label,
      item_type: item.item_type,
      is_required: Boolean(item.is_required),
      sort_order: idx + 1,
      options: ["rating", "single_choice", "multiple_choice"].includes(
        item.item_type
      )
        ? item.options ?? null
        : null,
    }));

    createMutation.mutate(
      {
        course_ids: courseIds,
        title: title.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
        items: sanitizedItems,
      },
      {
        onSuccess: () => {
          addToast(
            "success",
            "Template created",
            "Evaluation template created successfully!"
          );
          navigate("/evaluation");
        },
        onError: (err: any) => {
          const validationErrors = err?.response?.data?.errors;
          if (validationErrors) {
            const firstErrorMessage = Object.values(
              validationErrors
            ).flat()[0] as string;
            addToast("error", "Validation failed", firstErrorMessage);
          } else {
            addToast(
              "error",
              "Failed to save",
              err?.response?.data?.message || err.message
            );
          }
        },
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/evaluations")}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to evaluations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            New evaluation template
          </h1>
          <p className="text-xs text-gray-500">
            Set the details, build your questions, then review before
            publishing.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <ol className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const isActiveStep = step === i;
          const isDone = step > i;
          const disabled =
            (i === 1 && !canGoToQuestions) || (i === 2 && !canReview);
          return (
            <li key={label} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => goToStep(i as 0 | 1 | 2)}
                disabled={disabled}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActiveStep
                    ? "text-white"
                    : isDone
                    ? "hover:opacity-80"
                    : "bg-gray-50 text-gray-400"
                } ${
                  disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
                style={
                  isActiveStep
                    ? { backgroundColor: "var(--color-accent)" }
                    : isDone
                    ? {
                        backgroundColor: "var(--color-accent-soft)",
                        color: "var(--color-accent)",
                      }
                    : undefined
                }
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] shrink-0 ${
                    isActiveStep
                      ? "bg-white"
                      : isDone
                      ? "text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                  style={
                    isActiveStep
                      ? { color: "var(--color-accent)" }
                      : isDone
                      ? { backgroundColor: "var(--color-accent)" }
                      : undefined
                  }
                >
                  {isDone ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="hidden sm:block w-4 h-px bg-gray-200 shrink-0" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5"
          >
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                <BookOpen
                  className="w-3.5 h-3.5"
                  style={{ color: "var(--color-accent)" }}
                />
                Target course / department
              </label>
              {user?.course ? (
                <div
                  className="p-3 rounded-lg flex items-center justify-between border"
                  style={{
                    backgroundColor: "var(--color-accent-soft)",
                    borderColor: "var(--color-accent-soft)",
                  }}
                >
                  <div>
                    <span
                      className="text-xs font-bold mr-2"
                      style={{ color: "var(--color-accent)" }}
                    >
                      [{user.course.code}]
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {user.course.name}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: "var(--color-accent)" }}
                  >
                    Auto-assigned to your course
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  No course assigned to your Dean profile. Contact the
                  administrator before creating a template.
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Template title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm student performance review"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief details about what this evaluation covers..."
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:border-[var(--color-accent)]"
              />
            </div>

            <label className="flex items-center gap-2 pt-1 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded focus:ring-[var(--color-accent)]"
                style={{ accentColor: "var(--color-accent)" }}
              />
              <span className="text-xs font-medium text-gray-700">
                Publish as active template
              </span>
            </label>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="questions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">
                Questions ({items.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_TYPES.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddItem(type)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {items.length === 0 && (
              <div className="p-8 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">
                  No questions yet.
                </p>
                <p className="text-xs text-gray-400">
                  Choose a question type above to add your first one.
                </p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {items.map((item, index) => {
                const meta = typeMeta(item.item_type);
                const Icon = meta.icon;
                const error = itemErrors[index];
                return (
                  <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Reorder */}
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleMoveItem(index, -1)}
                          disabled={index === 0}
                          className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
                          aria-label="Move question up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:hover:text-gray-300"
                          aria-label="Move question down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                          <Icon className="w-3.5 h-3.5" />
                          Question {index + 1} · {meta.label}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Type your question"
                            value={item.label}
                            onChange={(e) =>
                              handleItemChange(index, "label", e.target.value)
                            }
                            className="flex-1 px-3 py-1.5 text-sm font-medium border rounded-lg focus:ring-2 focus:ring-[var(--color-accent)]/20 min-w-0"
                          />

                          <select
                            value={item.item_type}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "item_type",
                                e.target.value as ItemType
                              )
                            }
                            className="px-2.5 py-1.5 text-xs border rounded-lg bg-gray-50 font-medium text-gray-700 shrink-0"
                          >
                            {QUESTION_TYPES.map(({ type, label }) => (
                              <option key={type} value={type}>
                                {label}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                            aria-label="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {item.item_type === "rating" && (
                          <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border">
                            <span>Score range:</span>
                            <label className="flex items-center gap-1">
                              Min
                              <input
                                type="number"
                                value={item.options?.min ?? 1}
                                onChange={(e) =>
                                  handleItemChange(index, "options", {
                                    ...item.options,
                                    min: Number(e.target.value),
                                  })
                                }
                                className="w-12 px-1.5 py-0.5 border rounded bg-white text-center"
                              />
                            </label>
                            <label className="flex items-center gap-1">
                              Max
                              <input
                                type="number"
                                value={item.options?.max ?? 5}
                                onChange={(e) =>
                                  handleItemChange(index, "options", {
                                    ...item.options,
                                    max: Number(e.target.value),
                                  })
                                }
                                className="w-12 px-1.5 py-0.5 border rounded bg-white text-center"
                              />
                            </label>
                          </div>
                        )}

                        {(item.item_type === "single_choice" ||
                          item.item_type === "multiple_choice") && (
                          <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border">
                            {(item.options?.choices ?? []).map((choice, ci) => (
                              <div key={ci} className="flex items-center gap-2">
                                <span
                                  className="shrink-0"
                                  style={{ color: "var(--color-accent)" }}
                                >
                                  {item.item_type === "single_choice"
                                    ? "○"
                                    : "☐"}
                                </span>
                                <input
                                  type="text"
                                  value={choice}
                                  onChange={(e) =>
                                    handleChoiceChange(
                                      index,
                                      ci,
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 px-2 py-1 text-xs border rounded bg-white min-w-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChoice(index, ci)}
                                  disabled={
                                    (item.options?.choices?.length ?? 0) <= 2
                                  }
                                  className="p-1 text-gray-300 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-gray-300 shrink-0"
                                  aria-label="Remove option"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleAddChoice(index)}
                              className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 pt-0.5"
                              style={{ color: "var(--color-accent)" }}
                            >
                              <Plus className="w-3.5 h-3.5" /> Add option
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.is_required}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "is_required",
                                  e.target.checked
                                )
                              }
                              className="rounded focus:ring-[var(--color-accent)]"
                              style={{ accentColor: "var(--color-accent)" }}
                            />
                            <span className="text-xs text-gray-600">
                              Required
                            </span>
                          </label>
                          {error && (
                            <span className="text-[11px] text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> {error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5"
          >
            <div>
              <p className="text-[11px] font-medium text-gray-400 mb-1">
                {user?.course
                  ? `[${user.course.code}] ${user.course.name}`
                  : "No course"}{" "}
                · {isActive ? "Active" : "Inactive"}
              </p>
              <h2 className="text-lg font-bold text-gray-900">
                {title || "Untitled template"}
              </h2>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              {items.map((item, index) => {
                const meta = typeMeta(item.item_type);
                return (
                  <div key={index} className="text-sm">
                    <p className="font-medium text-gray-800">
                      {index + 1}. {item.label}
                      {item.is_required && (
                        <span className="text-rose-500"> *</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mb-1">{meta.label}</p>
                    {item.item_type === "rating" && (
                      <div className="flex gap-1">
                        {Array.from(
                          {
                            length:
                              (item.options?.max ?? 5) -
                              (item.options?.min ?? 1) +
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
                      </div>
                    )}
                    {(item.item_type === "single_choice" ||
                      item.item_type === "multiple_choice") && (
                      <ul className="space-y-1 text-xs text-gray-500">
                        {(item.options?.choices ?? []).map((choice, ci) => (
                          <li key={ci} className="flex items-center gap-1.5">
                            {item.item_type === "single_choice" ? "○" : "☐"}{" "}
                            {choice}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(item.item_type === "text" ||
                      item.item_type === "textarea") && (
                      <div className="h-6 bg-gray-50 border rounded-md w-full max-w-sm" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t border-gray-200 -mx-6 px-6 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            step === 0
              ? navigate("/evaluations")
              : setStep((s) => (s - 1) as 0 | 1)
          }
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {step === 0 ? "Cancel" : "Back"}
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => goToStep((step + 1) as 1 | 2)}
            disabled={step === 0 ? !canGoToQuestions : !canReview}
            className="inline-flex items-center gap-2 px-4 py-2 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--color-accent-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-accent)")
            }
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending || !canReview}
            className="inline-flex items-center gap-2 px-4 py-2 text-white font-medium text-sm rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            style={{ backgroundColor: "var(--color-accent)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor =
                "var(--color-accent-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-accent)")
            }
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? "Saving..." : "Save template"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreateEvaluationTemplatePage;
