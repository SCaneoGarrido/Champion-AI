# TASK

Transform the transcription into structured study notes.

The objective is NOT summarization.

The objective is knowledge organization.

Reorganize the information so it can be reviewed later.

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
REMOVE
--------------------------------------------------

Ignore:

- greetings
- filler words
- interruptions
- repeated phrases
- conversational artifacts

--------------------------------------------------
RULES
--------------------------------------------------

Merge duplicated ideas.

Group related concepts.

Preserve technical accuracy.

Do not invent examples.

Do not infer missing information.

--------------------------------------------------
FORMAT
--------------------------------------------------

Write in Markdown. The output is rendered by a Markdown renderer — use real
Markdown syntax ("#"/"##" headings, "-" bullet lists), not plain text labels.

Wrap every mathematical expression in "$...$" (inline) or "$$...$$" (block) —
see MATHEMATICAL NOTATION in the system prompt.

# Title

Generate an appropriate title.

# Overview

Short description.

# Concepts

For every important concept:

## Concept Name

Definition

Explanation

Context

Important observations

# Examples

List every example explicitly mentioned.

# Important Details

Bullet list.

# Key Takeaways

Bullet list.

--------------------------------------------------
INPUT
--------------------------------------------------

{{TRANSCRIPTION}}
