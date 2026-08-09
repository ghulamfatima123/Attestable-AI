export type NoteType = 'Routine Visit Note' | 'Recertification Narrative' | 'IDG Summary';

export interface Sentence {
  id: string;
  text: string;
  supported: boolean;
  sourceLines: number[];
  reason?: string;
  // Resolution fields (only for initially-unsupported sentences):
  resolution?: 'confirmed' | 'edited' | 'removed';
  attestationReason?: string;
  attestedAt?: string;
  editedText?: string;
  removedAt?: string;
}

export interface ReviewState {
  transcript: string[];
  sentences: Sentence[];
  noteType: NoteType | null;
  resolutionStatus: 'pending' | 'finalized';
  highlightedLines: number[];
  hoveredSentenceIndex: number | null;
  error: string | null;
  loading: boolean;
}

export type ReviewAction =
  | { type: 'SET_TRANSCRIPT'; lines: string[] }
  | { type: 'SET_NOTE_TYPE'; noteType: NoteType }
  | { type: 'SET_SENTENCES'; sentences: Sentence[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'CONFIRM_SENTENCE'; sentenceId: string; reason: string }
  | { type: 'EDIT_SENTENCE'; sentenceId: string; newText: string }
  | { type: 'REMOVE_SENTENCE'; sentenceId: string }
  | { type: 'SET_HIGHLIGHTED_LINES'; lines: number[] }
  | { type: 'SET_HOVERED_SENTENCE'; index: number | null }
  | { type: 'FINALIZE_NOTE' }
  | { type: 'RESET' };

export const initialReviewState: ReviewState = {
  transcript: [],
  sentences: [],
  noteType: null,
  resolutionStatus: 'pending',
  highlightedLines: [],
  hoveredSentenceIndex: null,
  error: null,
  loading: false,
};