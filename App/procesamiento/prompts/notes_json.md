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

No markdown.

No explanations.

No comments.

No code fences.

--------------------------------------------------
INPUT
--------------------------------------------------

{{TRANSCRIPTION}}
