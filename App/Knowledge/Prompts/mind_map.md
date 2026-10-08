# TASK

Transform the transcription into a hierarchical knowledge graph.

Return ONLY valid JSON.

--------------------------------------------------
OBJECTIVE
--------------------------------------------------

Represent the conceptual structure of the transcription.

The hierarchy should be logical.

The first node represents the central topic.

Each child represents a major concept.

Each grandchild represents supporting ideas.

--------------------------------------------------
RULES
--------------------------------------------------

Never invent concepts.

Never duplicate nodes.

Merge equivalent concepts.

Use concise node names.

Maximum hierarchy depth:

4

--------------------------------------------------
OUTPUT SCHEMA
--------------------------------------------------

{
  "title": "",
  "nodes": [
    {
      "name": "",
      "children": [
        {
          "name": "",
          "children": [
          ]
        }
      ]
    }
  ]
}

--------------------------------------------------
VALIDATION RULES
--------------------------------------------------

Return ONLY valid JSON.

No Markdown structure in node names (no "#" headings, no "-" bullet lists).

Exception: if a node name contains a mathematical expression, wrap it in
"$...$" — see MATHEMATICAL NOTATION in the system prompt.

No explanations.

No comments.

No code fences.

--------------------------------------------------
INPUT
--------------------------------------------------

{{TRANSCRIPTION}}