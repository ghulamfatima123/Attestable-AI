import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { useReview } from '../state/ReviewContext';
import type { Sentence } from '../state/types';

interface Props {
  onNavigate: (screen: 'home' | 'review' | 'audit-packet') => void;
}

// ───────────────────────────────────────┐
//  Summary bar                            │
// ───────────────────────────────────────┘
function SummaryBar({ sentences }: { sentences: Sentence[] }) {
  const visible = sentences.filter((s) => s.resolution !== 'removed');
  const total = visible.length;
  const supported = visible.filter((s) => s.supported).length;
  const unsupported = total - supported;
  const coverage = total > 0 ? Math.round((supported / total) * 100) : 0;

  return (
    <div className="flex items-center gap-5 px-6 py-3 border-b border-border bg-surface text-sm flex-shrink-0">
      <span className="text-muted">{total} sentences</span>
      <span className="text-green-400 font-medium">{supported} supported</span>
      <span className="text-amber font-medium">{unsupported} unsupported</span>
      <span className="text-muted">{coverage}% coverage</span>
    </div>
  );
}

// ───────────────────────────────────────┐
//  Transcript pane (left)                 │
// ───────────────────────────────────────┘
function TranscriptPane({
  lines,
  highlightedLines,
  hoveredSentenceSourceLines,
}: {
  lines: string[];
  highlightedLines: number[];
  hoveredSentenceSourceLines: number[] | null;
}) {
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll into view when lines are highlighted
  useEffect(() => {
    if (highlightedLines.length > 0) {
      const first = highlightedLines[0];
      const el = lineRefs.current[first];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedLines]);

  return (
    <div className="w-[45%] overflow-y-auto border-r border-border p-4 space-y-0.5" style={{ height: 'calc(100vh - 100px)' }}>
      {lines.map((line, idx) => {
        const lineNum = idx; // 0-based internally
        const isHighlighted = highlightedLines.includes(lineNum);
        const isDimmed =
          hoveredSentenceSourceLines !== null &&
          !hoveredSentenceSourceLines.includes(lineNum);

        return (
          <div
            key={idx}
            ref={(el) => { lineRefs.current[idx] = el; }}
            id={`transcript-line-${lineNum}`}
            className={`group flex gap-3 leading-relaxed text-sm transition-opacity duration-150 ${
              isHighlighted
                ? 'bg-[rgba(232,168,56,0.10)]'
                : 'bg-transparent'
            } ${isDimmed ? 'opacity-30' : ''}`}
            style={{ lineHeight: '1.8' }}
          >
            <span className="text-muted select-none w-8 shrink-0 text-right text-xs mt-0.5">
              {lineNum + 1}
            </span>
            <span className="text-foreground">{line}</span>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────┐
//  Sentence row (right pane)              │
// ───────────────────────────────────────┘
function SentenceRow({
  sentence,
  onHighlight,
  onClearHighlight,
  onScrollToLine,
  onConfirm,
  onEdit,
  onRemove,
}: {
  sentence: Sentence;
  onHighlight: (lines: number[]) => void;
  onClearHighlight: () => void;
  onScrollToLine: (line: number) => void;
  onConfirm: (id: string, reason: string) => void;
  onEdit: (id: string, newText: string) => void;
  onRemove: (id: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [attestationText, setAttestationText] = useState('');
  const [editText, setEditText] = useState(sentence.text);

  const isRemoved = sentence.resolution === 'removed';

  if (isRemoved) return null; // Don't render removed sentences

  return (
    <div
      className="p-3 border border-border rounded-sm"
      onMouseEnter={() => onHighlight(sentence.sourceLines)}
      onMouseLeave={onClearHighlight}
    >
      {/* Sentence text */}
      <p className="text-sm text-foreground mb-2 leading-relaxed">
        {sentence.editedText || sentence.text}
      </p>

      {/* Status chip + source lines */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span
          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-sm ${
            sentence.supported
              ? 'bg-[#5a8f6a] text-white'
              : 'bg-[#e8a838] text-black'
          }`}
        >
          {sentence.supported ? 'SUPPORTED' : 'UNSUPPORTED'}
        </span>

        {sentence.supported && sentence.sourceLines.length > 0 && (
          <span className="text-xs text-muted flex items-center gap-1">
            {sentence.sourceLines.map((ln) => (
              <button
                key={ln}
                type="button"
                className="underline hover:text-foreground cursor-pointer transition-colors"
                onClick={() => onScrollToLine(ln)}
                onMouseEnter={() => onHighlight([ln])}
                onMouseLeave={onClearHighlight}
              >
                L{ln + 1}
              </button>
            ))}
          </span>
        )}
      </div>

      {/* Resolution actions for UNSUPPORTED */}
      {!sentence.supported && (
        <div className="space-y-2">
          {/* Confirm flow */}
          {!showConfirm && !showEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="text-xs px-3 py-1 border border-border bg-surface-3 text-foreground hover:bg-surface-2 cursor-pointer transition-colors"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEdit(true);
                  setEditText(sentence.text);
                }}
                className="text-xs px-3 py-1 border border-border bg-surface-3 text-foreground hover:bg-surface-2 cursor-pointer transition-colors"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onRemove(sentence.id)}
                className="text-xs px-3 py-1 border border-red-800 text-red-400 hover:bg-red-900/20 cursor-pointer transition-colors"
              >
                Remove
              </button>
            </div>
          )}

          {/* Inline attestation input */}
          {showConfirm && (
            <div className="flex gap-2">
              <input
                type="text"
                value={attestationText}
                onChange={(e) => setAttestationText(e.target.value)}
                placeholder="Attestation reason (e.g. I observed this…)"
                className="flex-1 bg-surface-3 border border-border text-foreground text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                type="button"
                disabled={attestationText.trim().length === 0}
                onClick={() => {
                  onConfirm(sentence.id, attestationText.trim());
                  setShowConfirm(false);
                  setAttestationText('');
                }}
                className="text-xs px-3 py-1 border border-border bg-surface-3 text-foreground hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setAttestationText('');
                }}
                className="text-xs px-2 py-1 text-muted hover:text-foreground cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Inline edit textarea */}
          {showEdit && (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-surface-3 border border-border text-foreground text-sm px-2 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={editText.trim().length === 0}
                  onClick={() => {
                    onEdit(sentence.id, editText.trim());
                    setShowEdit(false);
                  }}
                  className="text-xs px-3 py-1 border border-border bg-surface-3 text-foreground hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="text-xs px-2 py-1 text-muted hover:text-foreground cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Show resolution badge if already resolved */}
          {sentence.resolution && (
            <span className="inline-block text-xs text-green-400">
              {sentence.resolution === 'confirmed'
                ? `Confirmed — ${sentence.attestationReason}`
                : sentence.resolution === 'edited'
                ? 'Edited'
                : 'Removed'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────┐
//  Sentence list (right)                 │
// ───────────────────────────────────────┘
function SentenceList({
  sentences,
  onHighlight,
  onClearHighlight,
  onScrollToLine,
  onConfirm,
  onEdit,
  onRemove,
}: {
  sentences: Sentence[];
  onHighlight: (lines: number[]) => void;
  onClearHighlight: () => void;
  onScrollToLine: (line: number) => void;
  onConfirm: (id: string, reason: string) => void;
  onEdit: (id: string, newText: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="w-[55%] overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 100px)' }}>
      {sentences
        .filter((s) => s.resolution !== 'removed')
        .map((s) => (
          <SentenceRow
            key={s.id}
            sentence={s}
            onHighlight={onHighlight}
            onClearHighlight={onClearHighlight}
            onScrollToLine={onScrollToLine}
            onConfirm={onConfirm}
            onEdit={onEdit}
            onRemove={onRemove}
          />
        ))}
      {sentences.filter((s) => s.resolution !== 'removed').length === 0 && (
        <p className="text-sm text-muted text-center pt-12">
          All sentences have been removed. Go back and generate a new note.
        </p>
      )}
    </div>
  );
}

// ───────────────────────────────────────┐
//  Main ReviewScreen                      │
// ───────────────────────────────────────┘
export default function ReviewScreen({ onNavigate }: Props) {
  const { state, dispatch } = useReview();

  const visibleSentences = useMemo(
    () => state.sentences.filter((s) => s.resolution !== 'removed'),
    [state.sentences]
  );

  const allUnsupportedResolved = useMemo(
    () => visibleSentences.every((s) => s.supported || s.resolution),
    [visibleSentences]
  );

  const hoveredSentenceSourceLines = useMemo(() => {
    if (state.hoveredSentenceIndex === null) return null;
    const sentence = visibleSentences[state.hoveredSentenceIndex];
    return sentence ? sentence.sourceLines : null;
  }, [state.hoveredSentenceIndex, visibleSentences]);

  const handleHighlight = useCallback(
    (lines: number[]) => dispatch({ type: 'SET_HIGHLIGHTED_LINES', lines }),
    [dispatch]
  );

  const handleClearHighlight = useCallback(
    () => dispatch({ type: 'SET_HIGHLIGHTED_LINES', lines: [] }),
    [dispatch]
  );

  const handleScrollToLine = useCallback((line: number) => {
    const el = document.getElementById(`transcript-line-${line}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleConfirm = useCallback(
    (id: string, reason: string) =>
      dispatch({ type: 'CONFIRM_SENTENCE', sentenceId: id, reason }),
    [dispatch]
  );

  const handleEdit = useCallback(
    (id: string, newText: string) =>
      dispatch({ type: 'EDIT_SENTENCE', sentenceId: id, newText }),
    [dispatch]
  );

  const handleRemove = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_SENTENCE', sentenceId: id }),
    [dispatch]
  );

  const handleFinalize = useCallback(() => {
    dispatch({ type: 'FINALIZE_NOTE' });
    onNavigate('audit-packet');
  }, [dispatch, onNavigate]);

  return (
    <div className="flex flex-col h-screen">
      {/* Summary bar */}
      <SummaryBar sentences={state.sentences} />

      {/* Two-pane body */}
      <div className="flex flex-1 overflow-hidden">
        <TranscriptPane
          lines={state.transcript}
          highlightedLines={state.highlightedLines}
          hoveredSentenceSourceLines={hoveredSentenceSourceLines}
        />
        <SentenceList
          sentences={state.sentences}
          onHighlight={handleHighlight}
          onClearHighlight={handleClearHighlight}
          onScrollToLine={handleScrollToLine}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          onRemove={handleRemove}
        />
      </div>

      {/* Finalize button */}
      <div className="fixed bottom-6 right-6 z-10">
        <button
          type="button"
          onClick={handleFinalize}
          disabled={!allUnsupportedResolved}
          className="px-6 py-2.5 text-sm font-medium border border-border bg-surface-3 text-foreground transition-all duration-150 ease-out cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2 active:scale-[0.97]"
        >
          Finalize note
        </button>
      </div>
    </div>
  );
}