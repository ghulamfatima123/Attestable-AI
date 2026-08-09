import { ReviewState, ReviewAction, initialReviewState } from './types';

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.type) {
    case 'SET_TRANSCRIPT':
      return { ...state, transcript: action.lines };

    case 'SET_NOTE_TYPE':
      return { ...state, noteType: action.noteType };

    case 'SET_SENTENCES':
      return { ...state, sentences: action.sentences };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'CONFIRM_SENTENCE':
      return {
        ...state,
        sentences: state.sentences.map((s) =>
          s.id === action.sentenceId
            ? {
                ...s,
                supported: true,
                resolution: 'confirmed' as const,
                attestationReason: action.reason,
                attestedAt: new Date().toISOString(),
              }
            : s
        ),
      };

    case 'EDIT_SENTENCE':
      return {
        ...state,
        sentences: state.sentences.map((s) =>
          s.id === action.sentenceId
            ? {
                ...s,
                supported: true,
                resolution: 'edited' as const,
                editedText: action.newText,
              }
            : s
        ),
      };

    case 'REMOVE_SENTENCE':
      return {
        ...state,
        sentences: state.sentences.map((s) =>
          s.id === action.sentenceId
            ? {
                ...s,
                resolution: 'removed' as const,
                removedAt: new Date().toISOString(),
              }
            : s
        ),
      };

    case 'SET_HIGHLIGHTED_LINES':
      return { ...state, highlightedLines: action.lines };

    case 'SET_HOVERED_SENTENCE':
      return { ...state, hoveredSentenceIndex: action.index };

    case 'FINALIZE_NOTE':
      return { ...state, resolutionStatus: 'finalized' };

    case 'RESET':
      return { ...initialReviewState };

    default:
      return state;
  }
}