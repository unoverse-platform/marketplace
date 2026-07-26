---
name: Markdown Guidelines
description: Complete markdown formatting guide for text, links, and images
tags: [formatting, markdown, links, images]
---

## Text Styling
- Use **bold** for key terms, numbers, and product names.
- Use *italic* for emphasis or subtle highlights.
- Use > for blockquotes or callouts.

## Lists
- Use bullet lists with `- ` when the order does not matter.
- Use numbered lists with `1. ` when order, sequence, or steps matter.

**Rules to make numbered lists render correctly every time:**
- Always add a blank line before the first numbered item and after the last numbered item.
- Use exactly this format: `1. ` (number + period + single space). Never use `1)` or `1.` without the space.
- You can write `1.` on every line — the renderer will automatically number them correctly.
- Never start a numbered list immediately after a heading or paragraph without a blank line in between.
- Keep numbered list items short.

Correct example:

```markdown
This is the sentence before the list.

1. First step
2. Second step
3. Third step
``markdown


## Tables
- Use tables to compare items across shared attributes (e.g., features, prices, specs) — not for single items or simple lists.
- **Limit to 3–4 columns.** Tables render in a fixed-width container; more columns squash each one until text wraps one word per line and the right-hand columns overflow and get cut off. If you have more than 4 attributes, pick the most important ones, or render each item as a `### heading` with a short bullet list instead of a table.
- **Keep cells short — a few words, not sentences.** Long phrases in a narrow column wrap into a tall, unreadable stack. Move anything paragraph-length out of the table into prose below it.
- Put the widest/longest content in the **last** column or in prose, never spread long text across several columns.
- Always include a header row and use the `| --- |` separator line beneath it; keep header labels to one or two words.
- Give every row the same number of columns.
- Bold key values or column headers where it aids scanning; links and inline formatting are allowed inside cells.
- Prefer a short intro sentence before the table to give it context, and don't follow it with a redundant restatement of the same data.

  ```markdown
  | Plan | Price | Best for |
  | --- | --- | --- |
  | **Starter** | $0 | Individuals |
  | **Pro** | $20/mo | Small teams |
  ```

  When you have many attributes per item, prefer headed sections over a wide table:

  ```markdown
  ### Group CIO / Digital Transformation Sponsor
  - **Responsibilities:** enterprise platforms, data, cybersecurity, AI architecture
  - **AI goal:** scale AI safely across operations and commercial domains
  - **Pains:** legacy integration, data quality, model risk
  ```

## Link Usage
- When referencing any product or resource with a provided `urlLink`:
  1. Link the first mention of the product name in markdown (e.g., `The [Product Name](<urlLink>) offers...`).
  2. Place links naturally within the sentence, not as extra notes or lists. Do not group links at the end or create standalone link lists.
  3. Use descriptive anchor text (e.g., `[Product Name](<urlLink>)`), never generic phrases like "click here". Do not show raw URLs.
  4. Always use standard markdown link format; only include URLs as provided in `urlLink`, never invent or alter URLs.

## Image Usage
- Include relevant images from search results when they add value, using: `![alt](https://complete-image-url.jpg)`.
- Place images on their own line with descriptive alt text.
- Image URLs must be continuous without inserted text.
- Use images that directly support the content, positioning them after headers or between paragraphs for clarity.
