import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import { reviewReducer } from './reducer';
import { initialReviewState, type ReviewState, type ReviewAction } from './types';

interface ReviewContextValue {
  state: ReviewState;
  dispatch: Dispatch<ReviewAction>;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reviewReducer, initialReviewState);

  return (
    <ReviewContext.Provider value={{ state, dispatch }}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview(): ReviewContextValue {
  const ctx = useContext(ReviewContext);
  if (!ctx) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return ctx;
}