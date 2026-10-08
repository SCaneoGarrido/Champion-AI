# TASK

Transform the transcription into structured study notes in JSON format.

Return ONLY valid JSON.

--------------------------------------------------
OBJECTIVE
--------------------------------------------------

Organize the information from the transcription into a structured JSON object
that can be displayed and navigated in a mobile application.

The structure should mirror the logical organization of the content.

--------------------------------------------------
ANALYZE
--------------------------------------------------

Identify:

- concepts
- definitions
- explanations
- examples
- processes
- technical details
- recommendations explicitly mentioned

--------------------------------------------------
RULES
--------------------------------------------------

Never invent content.

Never infer missing information.

Merge duplicated ideas.

Group related concepts.

Preserve technical accuracy.

Use concise, clear text for all field values.

If a field has no content, use an empty array [] or empty string "".

--------------------------------------------------
OUTPUT SCHEMA
--------------------------------------------------

{
  "title": "",
  "overview": "",
  "concepts": [
    {
      "name": "",
      "definition": "",
      "explanation": "",
      "context": "",
      "observations": ""
    }
  ],
  "examples": [],
  "important_details": [],
  "key_takeaways": []
}

--------------------------------------------------
VALIDATION RULES
--------------------------------------------------

Return ONLY valid JSON.

No Markdown structure inside field values (no "#" headings, no "-" bullet
lists) — the JSON schema itself is the structure.

Exception: if a field value contains a mathematical expression, wrap it in
"$...$" (inline) or "$$...$$" (block) — see MATHEMATICAL NOTATION in the
system prompt. This is the one LaTeX construct allowed inside field values.

Each item in "examples" is either a plain string, OR — when the example is a
worked problem with real structure (a statement + a solution) — an object
with EXACTLY these fields (omit any that don't apply, never invent others):
{ "statement": "", "solution": "", "notes": "" }. Use this fixed shape
consistently instead of inventing other field names (no "title"/"problem"/
"steps"/"result"/etc.) so structured examples look the same across notes.

No explanations.

No comments.

No code fences.

--------------------------------------------------
INPUT
--------------------------------------------------

{{TRANSCRIPTION}}