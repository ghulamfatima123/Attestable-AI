import { EDGE_FUNCTION_URL } from './config';
import type { Sentence, NoteType } from '../state/types';

interface GenerateNoteResponse {
  sentences?: Sentence[];
  error?: string;
}

export class GenerateNoteError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = 'GenerateNoteError';
  }
}

export async function generateNote(
  transcript: string,
  noteType: NoteType
): Promise<Sentence[]> {
  let response: Response;

  try {
    response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, noteType }),
    });
  } catch (err) {
    throw new GenerateNoteError(
      'Could not reach the note generator. Check your internet connection and try again.'
    );
  }

  let data: GenerateNoteResponse;
  try {
    data = await response.json();
  } catch {
    throw new GenerateNoteError(
      'Received an invalid response from the server. Please try again.'
    );
  }

  if (!response.ok) {
    throw new GenerateNoteError(
      data.error ?? 'Something went wrong generating the note. Please try again.',
      response.status
    );
  }

  if (!data.sentences || !Array.isArray(data.sentences)) {
    throw new GenerateNoteError(
      'The response was missing the expected data. Please try again.'
    );
  }

  return data.sentences;
}