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
MATH NOTATION
--------------------------------------------------

If the content includes mathematical or scientific notation, express ALL of
it using LaTeX syntax — never as plain-text pseudo-notation. This includes,
but is not limited to: fractions, exponents and roots, integrals and
summations, matrices, Greek letters, subscripts/superscripts, and
comparison/set operators.

Use inline math ($...$) for notation that appears within a sentence, and
block/display math ($$...$$) for standalone equations.

Do NOT write math as plain text (e.g. "x^2", "raiz de x", "a/b", "sum of i
from 1 to n") when a LaTeX equivalent exists. If unsure whether something is
math, prefer LaTeX over plain text.

--------------------------------------------------
INPUT
--------------------------------------------------

{{TRANSCRIPTION}}
