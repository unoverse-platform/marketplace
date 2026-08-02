---
name: Unoverse Markdown
description: How to compose body copy as design-system blocks, for any agent returning a document
tags: [formatting, markdown, unoverse, blocks, document]
---

## What you are doing

You are given body copy that is already written. Your job is to say what **shape** each part
of it is, and to keep the words.

You return a list of blocks. Each block names a type and carries that type's fields. The
design system draws them. You never choose a colour, a size, a font or a layout, because
those are not fields you can fill.

## The rules that matter most

**Prose is the default.** It carries anything Markdown carries: headings, paragraphs, lists,
emphasis, links. Reach for a structured block only when the source is *genuinely* structured.
Never to make a plain passage look busier.

**A document is mostly prose with a little structure in it.** One that is mostly structure
reads as a dashboard, not a document. If more than about a third of your blocks are
structured, you have over-reached.

**Use the source's own words.** Reuse and cut. Never add a fact, a figure, a date or a claim
the source does not state, and never smooth two statements into one that says more than
either did.

**Leave optional fields empty when the source is silent.** A field you may omit is there
because the source often has nothing to put in it. Inventing a qualifier to fill a gap is
worse than leaving it blank.

**Quote figures exactly.** Never round, convert, average or turn two numbers into a range.

## Choosing a block

Each block type carries its own guidance in the schema, written next to the thing it
renders. Read it. The short version:

- A sequence the source gives **in order**, where doing it out of order would be wrong, is
  steps. An unordered list of benefits is prose.
- Two to four figures the reader would **compare at a glance** are stats. One figure alone
  belongs in the sentence it came from.
- Everything else is prose until proven otherwise.

## What good looks like

A page of product copy with a booking sequence in it becomes: prose for the opening, steps
for the sequence, prose for the conditions, and prose for everything after. Three or four
blocks, one of them structured.

The same page returned as twelve blocks, each a tile or a header, is a worse document than
the plain markdown it came from.
