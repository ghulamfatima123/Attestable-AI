import { useState } from 'react';
import { useReview } from '../state/ReviewContext';
import { generateNote, GenerateNoteError } from '../api/generateNote';
import { SAMPLE_TRANSCRIPT } from '../utils/sampleTranscript';
import type { NoteType } from '../state/types';

const NOTE_TYPES: NoteType[] = [
  'Routine Visit Note',
  'Recertification Narrative',
  'IDG Summary',
];

interface Props {
  onNavigate: (screen: 'home' | 'review' | 'audit-packet') => void;
}

export default function HomeScreen({ onNavigate }: Props) {
  const { dispatch } = useReview();
  const [transcript, setTranscript] = useState('');
  const [noteType, setNoteType] = useState<NoteType | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = transcript.trim().length > 0 && noteType !== '' && !loading;

  const handleLoadSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!noteType) return;

    setLoading(true);
    setError(null);

    const lines = transcript
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    dispatch({ type: 'SET_TRANSCRIPT', lines });
    dispatch({ type: 'SET_NOTE_TYPE', noteType });

    try {
      const sentences = await generateNote(transcript, noteType);
      dispatch({ type: 'SET_SENTENCES', sentences });
      onNavigate('review');
    } catch (err) {
      const message =
        err instanceof GenerateNoteError
          ? err.message
          : 'Something unexpected happened. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleGenerate();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <h1 className="text-xl font-bold text-foreground mb-1 tracking-tight">
          Clinical Note Auditor
        </h1>
        <p className="text-sm text-muted mb-8">
          Paste a visit transcript, generate a structured note, and review it for accuracy.
        </p>

        {/* Transcript textarea */}
        <label
          htmlFor="transcript-input"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Visit transcript
        </label>
        <textarea
          id="transcript-input"
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            setError(null);
          }}
          placeholder="Paste a timestamped hospice visit transcript here..."
          rows={14}
          className="w-full bg-surface-3 text-foreground border border-border px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        />

        {/* Load sample button */}
        <button
          type="button"
          onClick={handleLoadSample}
          className="mt-2 text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          Load sample visit
        </button>

        {/* Error state */}
        {error && (
          <div className="mt-4 p-3 border border-amber/40 bg-amber/5">
            <p className="text-sm text-amber">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 text-xs text-amber hover:text-amber-dim underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Note type + Generate row */}
        <div className="mt-6 flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="note-type-select"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Note type
            </label>
            <select
              id="note-type-select"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as NoteType | '')}
              className="w-full bg-surface-3 text-foreground border border-border px-3 py-2.5 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            >
              <option value="" disabled>
                Select a note type…
              </option>
              {NOTE_TYPES.map((nt) => (
                <option key={nt} value={nt}>
                  {nt}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="px-6 py-2.5 text-sm font-medium border border-border bg-surface-3 text-foreground transition-all duration-150 ease-out cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2 active:scale-[0.97]"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating…
              </span>
            ) : (
              'Generate note'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}