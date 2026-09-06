import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

function formatFileSize(bytes?: number) {
  if (!bytes) return null;
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
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

function RejectReasonModal({
  visible,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
  isSubmitting?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setReason("");
      setError(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for rejecting this document.");
      return;
    }
    await onSubmit(reason.trim());
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-ink)]/40 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                Reject Document
              </h3>
              <button
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-lg text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 px-5 py-4">
              <label className="text-xs font-medium text-[var(--color-ink)]">
                Reason for rejection
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="e.g. Signature missing, wrong form version…"
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                autoFocus
              />
              {error && (
                <p className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={12} /> {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--color-line)] px-5 py-4">
              <button
                onClick={onClose}
                className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-medium text-[var(--color-muted)] transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                Reject Document
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DocumentPreviewModal({
  visible,
  onClose,
  fetchUrl,
  title,
  filename,
  fileSize,
  mimeType,
  notes,
  status,
  rejectionReason,
  reviewedAt,
  reviewedByName,
  onApprove,
  onReject,
  isSubmittingReview,
}: {
  visible: boolean;
  onClose: () => void;
  fetchUrl: string;
  title: string;
  filename?: string;
  fileSize?: number;
  mimeType?: string;
  notes?: string | null;
  status?: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedByName?: string | null;
  onApprove?: () => void | Promise<void>;
  onReject?: (reason: string) => void | Promise<void>;
  isSubmittingReview?: boolean;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Reset any leftover local UI state every time the modal opens, so a
  // dropdown left open (or a reject modal left mid-flow) from a previous
  // viewing doesn't carry over to the next document.
  useEffect(() => {
    if (visible) {
      setMenuOpen(false);
      setShowRejectModal(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    (async () => {
      try {
        const token = localStorage.getItem("occ_spa_token");
        const response = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the document.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visible, fetchUrl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const normalizedStatus = status?.toLowerCase();
  const isApproved = normalizedStatus === "approved";
  const isRejected = normalizedStatus === "rejected";
  const isDecided = isApproved || isRejected;

  const canReview = !!(onApprove || onReject);

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/30 p-4 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] px-5 py-3.5">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                    {title}
                  </h2>
                  {filename && (
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {filename}
                      {(fileSize || mimeType) && (
                        <span className="text-[var(--color-muted)]/70">
                          {" · "}
                          {[formatFileSize(fileSize), mimeType?.split("/")[1]?.toUpperCase()]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {canReview && !isDecided && (
                    <div className="relative" ref={menuRef}>
                      <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        disabled={isSubmittingReview}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmittingReview ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : null}
                        Review
                        <ChevronDown size={13} />
                      </button>

                      <AnimatePresence>
                        {menuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 top-full z-30 mt-1.5 w-40 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
                          >
                            {onApprove && (
                              <button
                                type="button"
                                onClick={async () => {
                                  setMenuOpen(false);
                                  await onApprove();
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                              >
                                <Check size={13} /> Approve
                              </button>
                            )}
                            {onReject && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpen(false);
                                  setShowRejectModal(true);
                                }}
                                className="flex w-full items-center gap-2 border-t border-[var(--color-line)] px-3 py-2.5 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {isDecided && (
                    <span
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                        isApproved ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {isApproved ? <Check size={13} /> : <XCircle size={13} />}
                      {isApproved ? "Approved" : "Rejected"}
                    </span>
                  )}

                  {blobUrl && (
                    <a
                      href={blobUrl}
                      download={filename}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                    >
                      <Download size={13} /> Download
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[var(--color-muted)] transition hover:bg-slate-100 hover:text-[var(--color-ink)]"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {isRejected && rejectionReason && (
                <div className="shrink-0 border-b border-red-100 bg-red-50 px-5 py-3">
                  <p className="text-xs font-semibold text-red-700">Rejected</p>
                  <p className="mt-0.5 text-xs text-red-600">{rejectionReason}</p>
                  {reviewedAt && (
                    <p className="mt-1 text-[11px] text-red-400">
                      {formatDateTime(reviewedAt)}
                      {reviewedByName ? ` · by ${reviewedByName}` : ""}
                    </p>
                  )}
                </div>
              )}

              {isApproved && (
                <div className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-5 py-3">
                  <p className="text-xs font-semibold text-emerald-700">Approved</p>
                  {reviewedAt && (
                    <p className="mt-0.5 text-[11px] text-emerald-600">
                      {formatDateTime(reviewedAt)}
                      {reviewedByName ? ` · by ${reviewedByName}` : ""}
                    </p>
                  )}
                </div>
              )}

              {notes && (
                <div className="shrink-0 border-b border-[var(--color-line)] bg-slate-50 px-5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                    Student note
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink)]">{notes}</p>
                </div>
              )}

              <div className="relative flex-1 bg-slate-50">
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[var(--color-muted)]">
                    <Loader2 className="animate-spin text-[var(--color-accent)]" size={24} />
                    <p className="text-sm">Loading document…</p>
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
                    <AlertCircle className="text-[var(--color-muted)]" size={28} />
                    <p className="text-sm text-[var(--color-ink)]">{error}</p>
                  </div>
                )}
                {blobUrl && !loading && !error && (
                  <iframe src={blobUrl} title={title} className="h-full w-full border-0" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <RejectReasonModal
        visible={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        isSubmitting={isSubmittingReview}
        onSubmit={async (reason) => {
          if (onReject) {
            await onReject(reason);
            setShowRejectModal(false);
          }
        }}
      />
    </>
  );
}