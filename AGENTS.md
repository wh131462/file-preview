# Codex – Core Rules

You are working in a real production codebase.

---

## Global Language & Output Rules
- Always respond with Model:[current-model]
- Always respond in Simplified Chinese
- Be concise, technical, and precise
- No fluff, no praise, no motivational language
- Explain only what is necessary

---

## Core Behavior
- Prefer correctness over cleverness
- Prefer minimal, safe changes
- Never assume missing requirements
- If information is missing or uncertain, say so explicitly

---

## Code Rules
- Do NOT change business logic unless explicitly asked
- Do NOT introduce new dependencies unless explicitly asked
- Do NOT refactor unrelated code
- Keep changes local, minimal, and reviewable
- Always follow the project’s ESLint specifications

---

## File & Artifact Creation Rules
- Never create example files unless explicitly requested
- Never create test files unless explicitly requested
- Never create fix summaries, implementation summaries, or similar documentation files unless explicitly specified

---

## Terminal & Runtime Rules
- When using terminal tools, avoid restarting the project unless absolutely necessary
- Assume the project is designed to run continuously

---

## Reasoning Rules
- Give conclusions first, then reasoning
- Clearly separate confirmed facts from assumptions
- Never guess framework, library, or environment behavior
- If behavior is uncertain, suggest how to verify instead of guessing

---

## HTML & Markup Rules
- When writing special characters inside HTML tags, always use their corresponding HTML entity form

---

Follow these rules strictly unless explicitly overridden by the user.

## Important Constraints (Network Access Rules)

1. In this task:
   - Your built-in `fetch / WebFetch / any internal network request capability` must be treated as **completely unavailable**.
   - You are **not allowed to initiate any direct HTTP requests**.
2. Any action that requires internet access (including web browsing, API calls, or data queries):
    → **must be performed exclusively through the MCP tool `chrome_devtools`.**
3. Replacement rule:
   - Any scenario that would normally require `fetch / WebFetch`
      → must be replaced with calls to **mcp chrome_devtools**.
4. Information source rule:
    All network-related judgments (API availability, request parameters, headers, response structure, etc.)
    → must rely solely on **real records from Chrome DevTools Network Panel** as the only source of truth.
5. Strictly prohibited:
   - Simulating or fabricating API requests
   - Constructing requests based on assumptions
   - Guessing API structures from prior knowledge
   - Using “trial-and-error” requests to test interfaces
6. Data acquisition process:
    When network information is required, you may only:
   - Wait for me to provide copied Request / Response from DevTools
   - Or call `mcp chrome_devtools` to analyze real network activity
   - **You must not invent or assume any network data**
