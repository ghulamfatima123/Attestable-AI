# Attestable

**Verifiable AI for clinical documentation.** Every sentence in an AI-written clinical note is traced back to the words the clinician actually spoke, or flagged as unsupported.

Live demo: **https://attestable-ai.nativelyai.app**

Built for the AI Factory / native.builder hackathon (lablab.ai x NativelyAI, August 2026).

---

## The problem

Hospice and home health agencies increasingly let AI draft clinical documentation. A nurse finishes a home visit, the model produces the note, she reads it, it sounds right, she signs it.

Six months later Medicare audits the agency and asks her to prove the patient was still eligible for hospice. The note says the patient shows continued decline.

Did she observe that, or did the model write it?

Nobody can tell. There is no link between a sentence in the record and the moment in the visit where it was said. A hallucinated clinical claim reads exactly like a real one, and fluency is precisely what makes it dangerous. Agencies either absorb the denied claim or reconstruct the visit through weeks of manual chart review.

Recertification narratives, the notes that argue continued eligibility, are the most audited and the most saturated with clinical judgment that was never spoken aloud.

## What Attestable does

No sentence enters the record unless it can point at its source.

The app generates the clinical note and grounds it in the same model call. Each sentence comes back as a discrete unit with either the transcript lines that support it or a reason it has none.

- **SUPPORTED** — every clinical fact in the sentence appears in the cited lines. Clicking a source chip highlights that exact line in the transcript pane.
- **UNSUPPORTED** — the model added interpretation, a trend, a timing qualifier, or a clinical judgment that nobody spoke.

A clinician resolves every flag before the note can be finalized:

- **CONFIRMED** — she vouches for the claim and types why. Timestamped, and never recorded as SUPPORTED. A clinician vouching for something is not the same as a transcript proving it, and the record keeps those apart permanently.
- **EDITED** — narrowed to what was actually observed.
- **REMOVED** — rejected outright and struck from the note.

The Finalize button stays locked while a single flag is unresolved.

## The audit packet

Finalizing produces a packet containing the final note, a sentence-level provenance table (status, source lines, attestation text and timestamp), a packet ID, and a SHA-256 hash computed over the canonical packet contents.

An auditor recomputes the hash against the packet. If one word changed after signing, it will not match.

## Not explainability

This is deliberately not explainable AI. We do not attempt to explain why the model produced a sentence, and we make no claims about its internal reasoning.

We do something narrower and more checkable: prove which spoken words a sentence came from, or flag that it came from nowhere. Provenance and attribution, closer to chain of custody than to interpretability.

## How it was built

Built end to end on **native.builder**.

1. Scoped with the Product Architect agent, which produced a PRD from a written brief before any code was generated.
2. Generated and iterated with the Builder agent.
3. Deployed to a public URL from the platform.

**Stack**

| Layer | Choice |
|---|---|
| Platform | native.builder |
| Model | gpt-4o via AI/ML API (OpenAI-compatible endpoint) |
| Backend | Supabase Edge Function proxy |
| State | Session only. No database, no login, no accounts. |

The API key lives server-side in Supabase Secret Manager and never reaches the browser. Judges can use the app immediately from the URL with zero setup.

## Grounding design notes

Two failure modes surfaced during development and both are handled in the prompt and the Edge Function.

**Off-by-one citations.** Transcripts arriving with their own `[N]` prefixes were being numbered a second time by the app, so every citation was shifted by one and the final sentence cited a line that did not exist. Fixed by stripping any existing prefix and applying a single canonical 1-based numbering shared by both the model input and the transcript pane. The Edge Function now also discards any out-of-range citation and forces the affected sentence to UNSUPPORTED.

**Flag avoidance.** Told simply to be strict, the model stopped flagging and instead rewrote sentences to be safely groundable, silently dropping transcript content it could not cite. The instruction was changed from "be strict" to "be complete, then flag": the note must contain the assessment and plan sections a real note requires, and sentences that require synthesis must be written and marked UNSUPPORTED rather than omitted or softened.

**Known limitation.** Grounding is conservative but imperfect. In testing, a sentence describing medication given "when he asks" passed as SUPPORTED even though the phrasing implies a PRN order nobody stated. This is exactly why a human still signs off, and why confirmed claims are stored as attestations rather than as evidence.

## Running the demo

1. Open https://attestable-ai.nativelyai.app
2. Click **Load sample visit**, or paste a transcript
3. Select **Recertification Narrative**
4. Click **Generate note**
5. Click a green source chip to see the spoken line highlight
6. Resolve the amber flags with Confirm, Edit, or Remove
7. Finalize and inspect the audit packet

## Out of scope

Login and accounts, database persistence, live microphone transcription, batch review, multi-user collaboration, and any third-party API. Deliberate cuts made to ship a verifiable core within the hackathon window.

## Next

Speechmatics integration is the natural next step. Word-level timestamps and speaker diarization would let a provenance chip point at *"nurse, 4 minutes 12 seconds in"* rather than a line number, closing the loop from spoken audio to signed record.
