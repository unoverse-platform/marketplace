# Unoverse Marketplace

The shared library every Unoverse universe can **install** rather than author:
components, atoms and styles, prompt blocks, skills, and declarative nodes.

Published as one package at one version, so a universe takes the marketplace whole
rather than tracking a version per node.

## This package is definitions, not code

Everything here is **data**. A component is a tree of primitives, a node is a
description of an HTTP call, a prompt block is markdown. None of it executes on its
own, and installing it outside a universe does nothing at all.

That is deliberate, and it is a security property before it is a design one: data
cannot execute, so a definition is safe to read, copy, review and share.

It also means this repository is readable as documentation. If you want to know how
Unoverse models an interface, read `definitions/components/card/card.yaml` rather
than a guide about it.

## What is inside

```
definitions/
  components/   design-system components — a Switch of layouts over named states
  atoms/        the smallest shared pieces components compose from
  styles/       the token contract and default theme they render against
  blocks/       prompt blocks, referenced from any system prompt as {{prompt.<name>}}
  skills/       agent skills, selected by their whenToUse
  nodes/        declarative node manifests (node / interface / config / api / test)
```

## Using it

Install it from the marketplace inside a universe. It is seeded by default, and a
universe converges to the newest published version at boot.

Nodes in `definitions/nodes/` are interpreted by the platform's manifest executor:
they name an auth scheme, a transport and a response mapping, and may only call the
hosts their package declares in `allowedHosts`. There is no code path a manifest can reach.

## Licence

MIT. Read it, learn from it, take the ideas.
