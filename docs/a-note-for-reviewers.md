# A note for reviewers

This was a really interesting challenge!

It's the first code I've written in a while, first code-challenge I've done in nearly ten years, and the first time I'm trying to code something using agents, that other people will look at.

I decided to take an agent-first approach, defined architecture, structure, and specs, then poured AI into that vessel.

While the result was functionally correct, and technically followed what I defined, the sheer amount of code, and the absolute complexity of it was astounding. It wasn't wrong, but it definitely wasn't right.

I decided to try reworking what had been produced, which I now believe was a mistake. I essentially created myself an enormous legacy codebase to whittle down. I specced a simple markdown ticketing system, and tried to have a mix of models collaborate, including Deepseek, ChatGPT, Grok, and eventually Claude. In retrospect, to manage a set of agents together, I should have worked with a harness like Hermes or Pi, and used a ticketing system like Beans or backlog.md.

This was quite a learning experience. Coding this way felt like walking on shifting sand, riding dragons and summoning demons. It's a bit bewildering how quickly documentation and the shape of the code changes while you're working on it.

Relevant:
https://x.com/owenthcarey/status/2118788099547509085

## Musings

I kept a running log of musings while I worked. Here are a few of them:

- Define spec, architecture, style guidelines. Then letting an agent crank on it. Oh... oh my god.
- It's weird to look at generated code that.. isn't wrong, but feel in my gut that it's definitely not right.
- 80 Tickets... the thrash is real.
- Ok, so I invented my own issue tracker instead of using an existing one. Beads.. Beans.. Ticket.. Backlog.md. I think I want to switch to Backlog.md. Next time.
- It seems like they're bad at changing code. They seem to want code to persist and flourish and multiply.
- I have essentially created myself a legacy codebase to refactor.
- This has been an exercise in deleting code more than one in making it.
- Convinced that the cost of letting an agent write the wrong code is far more significant than not having that code at all.
- Always knew markdown was the language of the gods.
- What an exhausting way to write code. The ground never stops moving.
