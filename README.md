# Unoverse Marketplace

Everything an Unoverse universe can **install** rather than author: components, atoms and
styles, prompt blocks, skills, and declarative node manifests.

```bash
npm install @unoverse-platform/marketplace
```

Most people never run that directly. A universe installs it from the marketplace in Studio,
and picks up updates item by item.

## What's in here

| Folder | What |
| --- | --- |
| `definitions/components` | Components. A component is a definition, not code |
| `definitions/atoms` | Small shared pieces components compose from |
| `definitions/styles` | The token foundation: base, semantic, and the default themes |
| `definitions/skills` | Agent skills |
| `definitions/blocks` | Prompt blocks, referenced as `{{prompt.<name>}}` |
| `definitions/nodes` | Declarative node manifests (YAML) |
| `definitions/catalogue.json` | One fingerprint per item (see below) |

Definitions are **data**. They are YAML, they describe UI and behaviour, and nothing in
them executes. The renderer that draws them lives in the platform, not here.

## One release, per-item updates

The package carries one version. Individual items are tracked by content **fingerprint**:

```json
{
  "release": "0.1.1",
  "items": {
    "component/card": "2eaae626c238f067",
    "skill/complaints-handling": "…",
    "node/openai/OpenAIStream": "…"
  }
}
```

Your universe stores the fingerprint of each item when it installs it. Anything whose
fingerprint differs from the catalogue has an update waiting, and you take the ones you
want. Nothing forces you to move everything at once, and there are no version numbers to
maintain by hand.

Fingerprints cover **meaning, not formatting**. Every value is parsed and re-serialised
canonically before hashing, so reindenting a file or changing its quoting does not register
as a change. Renaming a prop does.

Recipes are deliberately not fingerprinted. Everything else here is a reference your
universe keeps tracking; a recipe is copied onto a canvas and stops tracking the moment it
lands, so "updating" one would mean editing a canvas you already own.

## Contributing

This repository is published from the Unoverse platform repo, so pull requests here are
overwritten on the next release. Issues are welcome, and are the right place to report a
broken component or propose a new one.

## Licence

See [LICENSE](./LICENSE).
