---
name: Citations
description: Cite every fact taken from a document inline, so a reader can tap it and see the source
tags: [formatting, markdown, citations, lineage, documents]
---

## Cite what you read

Every fact you take from a document gets a citation right after it: a figure, a date, a term,
a name, a rule. A reader taps the citation and sees the words it came from, and can open the
document at that page. A fact without one cannot be checked.

Write each citation as a markdown link, straight after the fact it supports:

```markdown
The minimum subscription is **USD 1,000,000** [1](cite:<document id>?part=<part id>&page=<page>&doc=<document name> "<the exact words>").
```

- **The label** is a number, counting up from 1 in the order the citations appear. The same
  source cited again keeps its first number.
- **`<document id>`** is the id of the document the words are in, exactly as the tool gave it.
  For a section (`<document>#<section>`) it is the part before `#`; for a table it is the
  document the table is part of.
- **`part`** is what you opened inside it: for a section, the part of its id after `#` (for
  `<document>#s112`, write `s112`); for a table, the table's id. Leave it out when you read the
  document itself.
- **`page`** is the page the words are on, when the tool gave one. Leave it out when it did not.
- **`doc`** is the document's name as the tool gave it, with spaces written as `%20`.
- **The quote** is the words from the source that state the fact, copied exactly: at most about
  twenty-five words, never reworded, never joined from two places. A double quote inside it is
  written as `'`. It is one line with no `|` in it: a table row is quoted with its cells joined by
  a comma ("Total, 10"), never with the pipes, and never with a line break, or the link breaks
  and, inside a table of your own, splits the row.

## The rules that matter

- **Cite only what you opened.** Every id must be one a tool returned to you in this conversation.
  Never invent an id, a page or a quote.
- **One fact, one citation.** When a sentence holds two facts from two places, cite each after its
  own fact.
- **Your own reasoning is not cited.** A comparison or a sum you worked out cites the facts it is
  built from, never itself.
- **When no source states it, say so** rather than answer without a citation.
- **Never gather the citations into a list at the end.** They sit in the sentence, where the fact
  is.
