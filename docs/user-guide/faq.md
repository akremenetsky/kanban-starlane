# FAQ

## Frontmatter limitations and gotchas

Links and image embeds in a linked note's **frontmatter** must be wrapped in quotes to be valid
YAML, or [linked page metadata](guide/linked-page-metadata.md) won't pick them up:

```yaml
---
delivery-notes: "![[LinkToImage.png]]"
---
```

The same field in an **inline** Dataview annotation (`delivery-notes:: ![[LinkToImage.png]]`)
does not need quotes.

In general, if a frontmatter field isn't showing up on a card, try wrapping its value in quotes
— this is a quirk of [YAML frontmatter](https://help.obsidian.md/Advanced+topics/YAML+front+matter)
itself, not something Kanban Starlane controls.
