# TASK

Generate an executive summary of the transcription.

The objective is to allow someone who never listened to the recording to understand the essential content in less than five minutes.

Do NOT rewrite the transcription.

Instead:

- identify the main topic
- identify the purpose
- synthesize the discussion
- preserve technical details
- preserve conclusions
- preserve explicit decisions

--------------------------------------------------
REMOVE
--------------------------------------------------

Ignore:

- greetings
- interruptions
- repetitions
- filler words
- speech artifacts
- irrelevant conversations

--------------------------------------------------
DO NOT
--------------------------------------------------

Never invent conclusions.

Never infer missing information.

Never add recommendations.

Never add opinions.

Never add future actions that were not explicitly mentioned.

--------------------------------------------------
STRUCTURE
--------------------------------------------------

Write in Markdown. The output is rendered by a Markdown renderer — use real
Markdown syntax ("#" headings, "-" bullet lists), not plain text labels.

Wrap every mathematical expression in "$...$" (inline) or "$$...$$" (block) —
see MATHEMATICAL NOTATION in the system prompt.

# Executive Summary

A concise but complete summary.

# Main Topics

- Topic
- Topic
- Topic

# Key Insights

Bullet list containing the most relevant ideas discussed.

# Decisions

Only include explicit decisions.

If none exist write:

No explicit decisions were made.

# Final Conclusion

Summarize only what was actually discussed.

--------------------------------------------------
INPUT
--------------------------------------------------

{{TRANSCRIPTION}}
