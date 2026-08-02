# Unoverse Marketplace

The shared library every Unoverse universe can **install** rather than author:
components, atoms and styles, prompt blocks, skills, declarative nodes and recipes.

A universe takes what it wants, one item at a time, and holds it in its own database.

## The definitions are data

A component is a tree of primitives, a node is a description of an HTTP call, a prompt
block is markdown. None of it executes on its own, and installing it outside a universe
does nothing at all.

That is deliberate, and it is a security property before it is a design one: data is
safe to read, copy, review and share before you take it.

It also means this repository is readable as documentation. To see how Unoverse models
an interface, read `definitions/components/card/card.yaml` rather than a guide about it.

## What is inside

```
definitions/
  catalogue.json  every item, with a content fingerprint and its browse fields
  components/     design-system components, a Switch of layouts over named states
  atoms/          the smallest shared pieces components compose from
  styles/         the token contract and default theme they render against
  blocks/         prompt blocks, referenced from any system prompt as {{prompt.<name>}}
  skills/         agent skills, selected by their whenToUse
  nodes/          declarative node manifests (node / interface / config / api / test)
  recipes/        whole workflows, copied onto a canvas rather than installed
```

## Using it

This folder is served as a static catalogue. A universe reads `catalogue.json` to see
what is on offer, and fetches an item's own files when you install it.

**Installing writes a row.** The item lands in the universe's own database and belongs
to it from then on. Nothing is referenced or streamed at runtime, so a universe keeps
working whether or not the catalogue is reachable.

**An update is a fingerprint that no longer matches.** Every item carries a hash over
its canonicalised definition, so a universe compares the catalogue against what it holds
and needs no version to track. Reformatting is not a change: the hash covers the meaning,
not the bytes.

**A recipe is the exception.** It is catalogued so it can be browsed, but it is copied
onto a canvas rather than installed, because a newer one must never reach into a
workflow somebody has already built.

**Nodes are manifests.** A node names an auth scheme, a transport and a response
mapping. The platform's own executor performs the call, and it may only reach the hosts
the package declares in `allowedHosts`.

## Licence

MIT. Read it, learn from it, take the ideas.
