# AI

The LLM is a reranker and explainer, not a catalog.

- Structured output via Vercel AI SDK `generateObject`
- Responses validated with Zod (`aiRerankResponseSchema`, `aiExplanationResponseSchema`)
- Explanations must stay inside supplied metadata
- Copy uses “Genie thinks this could be a strong match because…”
- `AI_MOCK=true` (default) skips live calls and uses deterministic ranking plus grounded template explanations
- Every call is logged on `AiRequest` / `AiResponse`

Conversational Genie is **out of MVP**. If added later, the LLM must call this recommendation engine rather than invent titles.
