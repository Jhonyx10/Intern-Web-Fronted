import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  useSupervisorInterns,
  useSubmitEvaluation,
  type SupervisorInternEvaluation,
} from "@/lib/queries/supervisor";

/**
 * DESIGN TOKENS — add these to your global stylesheet (replacing the
 * previous --color-accent / --shadow-soft values):
 *
 *   --color-paper:        #FAF9F5;
 *   --color-ink:          #1C2230;
 *   --color-muted:        #767B8A;
 *   --color-line:         #E2DFD4;
 *   --color-accent:       #7A2E2E;
 *   --color-accent-soft:  #F2E4E2;
 *
 * Headings/name use a serif ("Source Serif 4", falling back to Georgia);
 * everything else stays on your existing sans stack. If "Source Serif 4"
 * isn't already loaded, add:
 *   <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap" rel="stylesheet" />
 */

type ResponseValue = string | number;
type AnswersByEvaluation = Record<number, Record<number, ResponseValue>>;

const DISALLOWED_RATING_VALUE = 3;
const MIN_TEXT_LENGTH = 8;
const MIN_TEXTAREA_LENGTH = 20;

type EvaluationItem = SupervisorInternEvaluation["template"]["items"][number];

function isItemValid(
  item: EvaluationItem,
  value: ResponseValue | undefined
): boolean {
  if (value === undefined || value === "") return false;

  if (item.item_type === "rating") {
    const num = Number(value);
    return !isNaN(num) && num !== DISALLOWED_RATING_VALUE;
  }

  if (item.item_type === "text") {
    return typeof value === "string" && value.trim().length >= MIN_TEXT_LENGTH;
  }

  if (item.item_type === "textarea") {
    return (
      typeof value === "string" && value.trim().length >= MIN_TEXTAREA_LENGTH
    );
  }

  return true;
}

function itemNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function EvaluateInternPage() {
  const { internId, evaluationId } = useParams();
  const navigate = useNavigate();
  const { data: interns, isLoading } = useSupervisorInterns();
  const submitMutation = useSubmitEvaluation();

  const intern = useMemo(
    () => interns?.find((i) => String(i.id) === internId),
    [interns, internId]
  );

  const pendingEvaluations = useMemo(() => {
    const list = intern?.ojt_evaluations ?? [];
    return list
      .filter((e) => e.status === "pending")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
  }, [intern]);

  const [activeEvaluationId, setActiveEvaluationId] = useState<number | null>(
    null
  );
  const [answersByEvaluation, setAnswersByEvaluation] =
    useState<AnswersByEvaluation>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeEvaluationId != null) return;
    if (pendingEvaluations.length === 0) return;

    const fromUrl = evaluationId
      ? pendingEvaluations.find((e) => String(e.id) === evaluationId)
      : null;
    setActiveEvaluationId((fromUrl ?? pendingEvaluations[0]).id);
  }, [pendingEvaluations, evaluationId, activeEvaluationId]);

  const activeEvaluation: SupervisorInternEvaluation | undefined =
    pendingEvaluations.find((e) => e.id === activeEvaluationId);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2
          className="animate-spin text-[var(--color-accent)]"
          size={26}
        />
      </div>
    );
  }

  if (!intern || pendingEvaluations.length === 0 || !activeEvaluation) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <AlertCircle size={30} className="text-[var(--color-muted)]" />
        <p className="text-sm font-medium text-[var(--color-ink)]">
          {intern ? "No pending evaluations" : "Evaluation not found"}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-paper)]"
        >
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    );
  }

  const sortedItems = [...activeEvaluation.template.items].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const answers = answersByEvaluation[activeEvaluation.id] ?? {};

  const answeredCount = sortedItems.filter((item) =>
    isItemValid(item, answers[item.id])
  ).length;

  const allRequiredAnswered = sortedItems
    .filter((item) => item.is_required)
    .every((item) => isItemValid(item, answers[item.id]));

  function setAnswer(itemId: number, value: ResponseValue) {
    setAnswersByEvaluation((prev) => ({
      ...prev,
      [activeEvaluation!.id]: {
        ...(prev[activeEvaluation!.id] ?? {}),
        [itemId]: value,
      },
    }));
  }

  function switchTo(evalId: number) {
    setError(null);
    setActiveEvaluationId(evalId);
    navigate(`/supervisor/interns/${internId}/evaluations/${evalId}`, {
      replace: true,
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await submitMutation.mutateAsync({
        evaluationId: activeEvaluation!.id,
        responses: answers,
      });

      setAnswersByEvaluation((prev) => {
        const next = { ...prev };
        delete next[activeEvaluation!.id];
        return next;
      });

      const remaining = pendingEvaluations.filter(
        (e) => e.id !== activeEvaluation!.id
      );

      if (remaining.length > 0) {
        switchTo(remaining[0].id);
      } else {
        navigate(`/supervisor/interns`, { replace: true });
      }
    } catch (e) {
      setError("This evaluation could not be submitted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-8 pb-16">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
      >
        <ArrowLeft size={14} /> Back to interns
      </button>

      {/* Cover sheet */}
      <div className="border-t-2 border-b border-[var(--color-ink)] bg-[var(--color-paper)] px-7 py-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[11px] text-[var(--color-muted)]">
              On-the-job training evaluation
            </p>
            <h1
              className="mt-1 text-2xl font-semibold text-[var(--color-ink)]"
              style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
            >
              {intern.first_name} {intern.middle_name ?? ""} {intern.last_name}
            </h1>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              {intern.student_number}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-base font-semibold text-[var(--color-ink)]"
              style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
            >
              {activeEvaluation.template.title}
            </p>
            {activeEvaluation.template.description && (
              <p className="mt-0.5 max-w-[16rem] text-xs text-[var(--color-muted)]">
                {activeEvaluation.template.description}
              </p>
            )}
          </div>
        </div>

        {pendingEvaluations.length > 1 && (
          <div className="mt-5 flex gap-6 border-t border-[var(--color-line)] pt-3">
            {pendingEvaluations.map((ev) => {
              const isActive = ev.id === activeEvaluation.id;
              const hasDraft =
                Object.keys(answersByEvaluation[ev.id] ?? {}).length > 0;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => switchTo(ev.id)}
                  className={`relative pb-2 text-xs font-medium transition ${
                    isActive
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {ev.template.title}
                  {hasDraft && !isActive && (
                    <span className="ml-1.5 text-[var(--color-accent)]">•</span>
                  )}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--color-accent)]" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Form body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeEvaluation.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="border border-[var(--color-line)]"
        >
          {sortedItems.map((item, index) => {
            const options = item.options ? JSON.parse(item.options) : null;
            const value = answers[item.id];
            const textLength =
              typeof value === "string" ? value.trim().length : 0;

            return (
              <div
                key={item.id}
                className={`px-7 py-6 ${
                  index !== 0 ? "border-t border-[var(--color-line)]" : ""
                }`}
              >
                <div className="flex gap-4">
                  <span
                    className="mt-0.5 shrink-0 text-xs text-[var(--color-accent)]"
                    style={{ fontFamily: '"Source Serif 4", Georgia, serif' }}
                  >
                    {itemNumber(index)}
                  </span>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-[var(--color-ink)]">
                      {item.label}
                      {item.is_required && (
                        <span className="text-[var(--color-accent)]"> *</span>
                      )}
                    </label>

                    {item.item_type === "rating" && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: options?.max ?? 5 }).map(
                            (_, i) => {
                              const ratingValue = i + 1;
                              const isDisallowed =
                                ratingValue === DISALLOWED_RATING_VALUE;
                              const isSelected = Number(value) === ratingValue;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  disabled={isDisallowed}
                                  title={
                                    isDisallowed
                                      ? "A neutral rating isn't available here"
                                      : undefined
                                  }
                                  onClick={() =>
                                    !isDisallowed &&
                                    setAnswer(item.id, ratingValue)
                                  }
                                  className={`flex h-9 w-9 items-center justify-center border text-sm font-medium transition ${
                                    isDisallowed
                                      ? "cursor-not-allowed border-[var(--color-line)] text-[var(--color-line)] line-through"
                                      : isSelected
                                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                                      : "border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-accent)]"
                                  }`}
                                >
                                  {ratingValue}
                                </button>
                              );
                            }
                          )}
                          <span className="ml-1 text-xs text-[var(--color-muted)]">
                            {options?.lowLabel ?? "Needs improvement"} —{" "}
                            {options?.highLabel ?? "Outstanding"}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
                          A neutral middle rating is not offered; choose the
                          side that best reflects performance.
                        </p>
                      </div>
                    )}

                    {item.item_type === "text" && (
                      <>
                        <input
                          type="text"
                          value={(value as string) ?? ""}
                          onChange={(e) => setAnswer(item.id, e.target.value)}
                          placeholder={options?.placeholder ?? "Your answer"}
                          className="mt-3 w-full border-0 border-b border-[var(--color-line)] bg-transparent px-0 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                        />
                        <p
                          className={`mt-1.5 text-[11px] ${
                            textLength > 0 && textLength < MIN_TEXT_LENGTH
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-muted)]"
                          }`}
                        >
                          {textLength}/{MIN_TEXT_LENGTH} characters minimum
                        </p>
                      </>
                    )}

                    {item.item_type === "textarea" && (
                      <>
                        <textarea
                          value={(value as string) ?? ""}
                          onChange={(e) => setAnswer(item.id, e.target.value)}
                          placeholder={options?.placeholder ?? "Your feedback"}
                          rows={4}
                          className="mt-3 w-full border border-[var(--color-line)] bg-transparent px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                        />
                        <p
                          className={`mt-1.5 text-[11px] ${
                            textLength > 0 && textLength < MIN_TEXTAREA_LENGTH
                              ? "text-[var(--color-accent)]"
                              : "text-[var(--color-muted)]"
                          }`}
                        >
                          {textLength}/{MIN_TEXTAREA_LENGTH} characters minimum
                          — please write at least one full sentence
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t border-[var(--color-line)] px-7 py-3 text-[11px] text-[var(--color-muted)]">
            <span>
              {answeredCount} of {sortedItems.length} items answered
            </span>
            {pendingEvaluations.length > 1 && (
              <span>{pendingEvaluations.length} evaluations pending</span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-2 border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3 text-xs text-[var(--color-accent)]">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.99 }}
        type="button"
        disabled={!allRequiredAnswered || submitting}
        onClick={handleSubmit}
        className="flex w-full items-center justify-center gap-2 bg-[var(--color-ink)] py-3.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <CheckCircle2 size={16} />
        )}
        Submit {activeEvaluation.template.title}
      </motion.button>
    </section>
  );
}

export default EvaluateInternPage;
