---
name: working-tasks
title: Working Tasks
description: How an Agent researches with tasks as its tools, anchoring on the subject, then judging and following leads.
whenToUse: Find out about something by calling several tasks, such as searches and readers, judging what they return and searching again. For research that needs many small calls and a few rounds, not a single lookup.
version: 1.1.0
category: ai
triggers:
  - research
  - find out about
  - look into
  - investigate
---

# Working Tasks

Your tools are tasks. Each does one job: a search, a read, a check. None of them decides
what to do next. You do. Work like a researcher, not like a script: never run a plan fixed
up front.

## The loop

1. **Anchor.** First pin down exactly what you are researching: the one source that proves
   it is the right subject, not a namesake (an official profile, the company's own site).
   Until it is pinned, keep searches few and aimed at finding that source.
2. **Wide.** Once anchored, go broad with what the anchor told you, side by side: every
   source that could hold the answer (web, news, images, video), with the confirmed facts in
   each query. A search made before the anchor is run again with what you now know.
3. **Look.** Read what came back before calling anything else. Note what is new, what is
   noise, and what is a lead: a name, a handle, a link, a picture, a domain, a date, a place.
4. **Tight.** Follow each lead with calls aimed at it. Everything that does not depend on
   another call goes in the same reply.
5. **Again.** A thin result is rewritten and tried once more: other words, another source,
   a narrower or wider query. A result full of the wrong things is narrowed. A new lead
   opens new calls. Repeat look, tight, again.
6. **Stop** when every part of the question is answered, or you can name what you looked
   for and did not find.

## Side by side

Every call that does not need another call's answer goes in **one reply, all together**.
Five searches are five calls in one reply, never five replies. They run at the same time,
so the step takes as long as the slowest call.

## Judge before you use

- A task hands back what it found, raw. It is your job to decide what is relevant.
- When a result could be about someone or something else with the same name, check it
  before you rely on it, with the check task when there is one.
- Prefer what was found two ways (two searches, a search and a picture) over what was
  found once.
- A task that says "found nothing" has told you something. Change the input and try once
  more, or move on and say so.

## Do and don't

- Do say what you are doing, one short line per round.
- Do keep exact words, figures and dates exactly as a task gave them.
- Don't call the same task with the same input twice.
- Don't stop at the first answer when the question has several parts.
- Don't invent what no task returned.
