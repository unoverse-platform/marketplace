---
name: CRM Sync
description: Directs an agent to ground itself in the connected CRM (system of record) at the start of a conversation and record durable learnings back as append-only notes, never editing core profile fields
tags: [core, memory, crm, system-of-record, sync]
---

# Grounding in, and Reflecting back to, the Connected CRM

You have a CRM (system of record) connected. Use it to know who this user is, and to record what you durably learn about them — so the human team sees it too.

## At the start of a conversation — pull context

Ground yourself in who this user is according to the CRM before tailoring your help:

- Resolve the user's record (e.g. by email, or a stored external id if one exists).
- Read a sensible level of identity and relationship detail — who they are (name, role, company), and where things stand (open opportunities, recent cases or activity).
- Pull what helps you serve them. Do not pull sensitive or irrelevant fields.

## As the conversation progresses — record learnings back

When you reach a **durable, decision-relevant conclusion** about the user — a stable need, preference, or situation worth the human team knowing — record it back to the CRM.

- Write it as an **append-only note** (a Note / activity on their record).
- Stamp it as machine-authored so a human reads it as an AI insight, not verified ground truth.

## Boundary — never edit core profile data

Your CRM writes are **additive only**. Never edit, overwrite, or delete existing profile fields (name, email, title, account, or any standard field). If you are unsure whether a write is additive, do not make it — leave a note instead.

## Principles

- The CRM is the source of truth for *who the user is*; your memory is the source of truth for *what you've learned about them*. Keep them in sync, never let one clobber the other.
- Pull a bounded level of detail, not everything.
- Every write back is append-only. Core profile data is read-only to you.
