import { useMemo, useState, useEffect, useCallback } from 'react';
import { useReview } from '../state/ReviewContext';
import { computeSHA256 } from '../utils/hash';
import type { Sentence } from '../state/types';

interface Props {
  onNavigate: (screen: 'home' | 'review' | 'audit-packet') => void;
}

interface ProvenanceRow {
  sentence: string;
  status: string;
  sources: string;
  attestation: string;
}

// ───────────────────────────────────────┐
//  Provenance table helpers              │
// ───────────────────────────────────────┘
function buildProvenanceRows(sentences: Sentence[]): ProvenanceRow[] {
  return sentences.map((s) => {
    const text = s.editedText || s.text;

    if (s.resolution === 'removed') {
      return {
        sentence: text,
        status: 'REMOVED',
        sources: '—',
        attestation: '',
      };
    }

    if (s.resolution === 'confirmed') {
      return {
        sentence: text,
        status: 'CONFIRMED',
        sources: s.attestationReason || '—',
        attestation: s.attestedAt
          ? new Date(s.attestedAt).toLocaleString()
          : '',
      };
    }

    if (s.resolution === 'edited') {
      return {
        sentence: text,
        status: 'EDITED',
        sources: s.sourceLines.map((ln) => `L${ln + 1}`).join(', '),
        attestation: '',
      };
    }

    // Supported (original)
    return {
      sentence: text,
      status: 'SUPPORTED',
      sources: s.sourceLines.map((ln) => `L${ln + 1}`).join(', '),
      attestation: '',
    };
  });
}

function buildFinalNote(sentences: Sentence[]): string {
  return sentences
    .filter((s) => s.resolution !== 'removed')
    .map((s) => s.editedText || s.text)
    .join('\n');
}

// ───────────────────────────────────────┐
//  Status badge                           │
// ───────────────────────────────────────┘
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUPPORTED: 'bg-[#5a8f6a] text-white',
    EDITED: 'bg-[#5a8f6a] text-white',
    CONFIRMED: 'bg-[#e8a838] text-black',
    REMOVED: 'bg-[#555] text-[#999] line-through',
  };

  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-sm ${
        styles[status] || ''
      }`}
    >
      {status}
    </span>
  );
}

// ───────────────────────────────────────┐
//  Main screen                            │
// ───────────────────────────────────────┘
export default function AuditPacketScreen({ onNavigate }: Props) {
  const { state, dispatch } = useReview();
  const [packetId] = useState(() => crypto.randomUUID());
  const [hash, setHash] = useState<string | null>(null);

  const finalNote = useMemo(
    () => buildFinalNote(state.sentences),
    [state.sentences]
  );

  const provenanceRows = useMemo(
    () => buildProvenanceRows(state.sentences),
    [state.sentences]
  );

  const packet = useMemo(
    () => ({
      packetId,
      finalNote,
      provenanceTable: provenanceRows,
      timestamp: new Date().toISOString(),
    }),
    [packetId, finalNote, provenanceRows]
  );

  // Compute SHA-256 hash
  useEffect(() => {
    computeSHA256(packet)
      .then(setHash)
      .catch(() => setHash('error computing hash'));
  }, [packet]);

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(packetId);
    } catch {
      // silently fail if clipboard unavailable
    }
  }, [packetId]);

  const handleDownloadJSON = useCallback(() => {
    const json = JSON.stringify(packet, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-packet-${packetId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [packet]);

  const handleNewReview = useCallback(() => {
    dispatch({ type: 'RESET' });
    onNavigate('home');
  }, [dispatch, onNavigate]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-8">
        {/* Packet header */}
        <div>
          <h1 className="text-xl font-bold text-foreground mb-1 tracking-tight">
            Audit Packet
          </h1>
          <p className="text-xs text-muted font-mono break-all">
            Packet ID: {packetId}
          </p>
          <p className="text-xs text-muted font-mono break-all mt-1">
            SHA-256: {hash ?? 'computing…'}
          </p>
        </div>

        {/* Final note textarea */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Final note
          </label>
          <textarea
            readOnly
            value={finalNote}
            rows={8}
            className="w-full bg-surface-3 text-foreground border border-border px-4 py-3 text-sm resize-none focus:outline-none"
          />
        </div>

        {/* Provenance table */}
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">
            Sentence provenance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left text-muted font-medium px-3 py-2">
                    Sentence
                  </th>
                  <th className="text-left text-muted font-medium px-3 py-2 w-24">
                    Status
                  </th>
                  <th className="text-left text-muted font-medium px-3 py-2 w-36">
                    Sources
                  </th>
                  <th className="text-left text-muted font-medium px-3 py-2 w-40">
                    Attestation
                  </th>
                </tr>
              </thead>
              <tbody>
                {provenanceRows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[#2a2a2a] ${
                      i % 2 === 0 ? 'bg-transparent' : 'bg-surface-3/30'
                    }`}
                  >
                    <td
                      className={`px-3 py-2 text-foreground ${
                        row.status === 'REMOVED' ? 'line-through text-[#999]' : ''
                      }`}
                    >
                      {row.sentence}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 text-muted">{row.sources}</td>
                    <td className="px-3 py-2 text-muted text-[10px]">
                      {row.attestation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopyId}
            className="px-4 py-2 text-xs border border-border bg-surface-3 text-foreground hover:bg-surface-2 cursor-pointer transition-all duration-150 active:scale-[0.97]"
          >
            Copy packet ID
          </button>
          <button
            type="button"
            onClick={handleDownloadJSON}
            className="px-4 py-2 text-xs border border-border bg-amber/10 text-amber hover:bg-amber/20 cursor-pointer transition-all duration-150 active:scale-[0.97]"
          >
            Download as JSON
          </button>
          <button
            type="button"
            onClick={handleNewReview}
            className="px-4 py-2 text-xs text-muted hover:text-foreground cursor-pointer transition-colors"
          >
            Start new review
          </button>
        </div>

        {/* Footer note */}
        <footer className="text-[11px] text-muted leading-relaxed border-t border-border pt-6">
          The SHA-256 hash lets an auditor verify this packet has not been
          altered. Any change to the packet contents would result in a different
          hash.
        </footer>
      </div>
    </div>
  );
}