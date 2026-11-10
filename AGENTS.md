# Agents

Brevity is wit, and the best code is no code at all. Don't worry about every edge case or things that might happen. Mention them, but don't code for every single potential eventuality.

I aim for code that has a very low cognitive load. I switch context constantly, so I need to understand code quickly when I come back to it. If code takes effort to parse, it's taking away from other things which are important, like higher-level understanding. Code should be very easy to read, and pleasant to look at. How it looks is part of whether it’s readable.

A useful test I like to think of is the “return from a meeting” check: can I open the file cold, after an hour on something else, and say what it does within a few seconds?

My personal code style is minimal and easy to read, with pretty whitespace. I put effort into organizing the order of things so it reads naturally, so the size of elements lines up. It should almost look like a nicely structured picture that you can take in at a glance, without needing to parse line by line.

Things I care about most: readability, code aesthetics, composition, self-describing code, the least code that does the job, and one source of truth. Generated code can be correct and still not be right. More code isn't better. If you can solve it with less, and it still reads well, do that.

Write code for the next developer who has to understand it.

## Architecture boundaries

These are the rules I care about most. If a task seems to need breaking one, stop and ask.

- **Simulated machines are machines.** Physics and motion stay inside the simulated device. Coordination, shared messages, the supervisor, and the browser only deal with commands and reported measurements. They don't assume simulation steps, never look at simulation data, and never run another device's physics. Estimating from reports is fine, like smoothing a drawing between them or working out when an impact probably happened.
- **Machines own their properties and settings.** The supervisor can request changes and keeps what machines report back. Values nobody has reported yet stay unknown.
- **Machine persistence stays behind an address.** Machines can save accepted property changes through a settings address supplied at startup. They don't know how the settings are stored or which service stores them.
- **Applications don't import each other.** Code that `supervisor`, `sim-manager` and `sim-machine` share lives in a package under `packages/`, and the packages know nothing about the apps. Sim Manager runs Sim Machine as a separate program, found by package name.
- **Each part keeps its own job.** Machines coordinate collisions and restarts with each other; the supervisor introduces them and passes along group and machine commands. Sim Manager manages simulated processes and their saved definitions. It never talks to the supervisor, and the supervisor doesn't know it exists. Swapping in a real machine shouldn't touch the supervisor or its client.
- **Use HTTP for request and response, server-sent events for live data to browsers, and Socket.IO between services.**

## Self-documenting code

Prefer descriptive names, explicit intermediate values, and straightforward control flow over comments. Name the individual ideas in a calculation. Instead of:

```typescript
const total = calculateSubtotal(items) * (1 - discountRate) + shippingCost;
```

Do this:

```typescript
const subtotal = calculateSubtotal(items);
const discountAmount = subtotal * discountRate;
const discountedSubtotal = subtotal - discountAmount;
const total = discountedSubtotal + shippingCost;
```

The goal isn't more variables. It's code that reads almost like a description of the problem.

Same goes for arguments. Work out config, defaults, and calculations first, then pass them in. Don't bury them in the call or hide them in default parameters:

```typescript
const groupPath = CONFIG.SETUP.GROUP_PATH ?? DEFAULT_GROUP_PATH;
const group = readGroup(groupPath);
```

Name compound conditions too, so the `if` reads as an intention:

```typescript
const dimensionMismatch =
  element.width !== pixelWidth || element.height !== pixelHeight;

if (dimensionMismatch) {
  element.width = pixelWidth;
  element.height = pixelHeight;
}
```

## Functions

- Keep each backend's HTTP routes and handlers in `api.ts`, and socket connections and event handlers in `sockets.ts`. Define small handlers as named variables, followed by one organised registration list with section comments. Keep these entry points easy to read without following chains of forwarding files.
- Clarity beats cleverness, and fewer concepts beats fewer lines. Don't pack decisions, parsing, or side effects into dense expressions.
- A higher-level function reads as a sequence of domain steps: what happens up top, how it happens further down.
- Each function does one thing, and its name says what. If one function holds state, process control, and HTTP routes, split it.
- Extract real responsibilities, not individual expressions. Skip one-line helpers, helpers that only forward arguments, and generic utilities.
- Keep related state and behaviour together. No parallel arrays or generic context bags. A long list of positional arguments means the design wants another look.
- Every abstraction has to earn its place. Don't build for requirements we don't have.
- Use early returns instead of deep nesting. Always use braces for control flow, except a short `if` that only returns, which goes on one line without them: `if (!ctx) return;`. Anything longer keeps its braces. Use `async`/`await`, not `.then` chains.
- Handle errors on purpose, without piling on defensive code.
- Reuse the types in `protocol` instead of redefining them. Validate data with Zod where it comes in from a file or the network, including in the browser. Check shapes only: no numeric ranges, string limits, or group size caps for this exercise. A machine can still refuse a command its device cannot accept, like a pendulum length of zero or less. Those rules belong on the machine.

**Whitespace.** Blank line before a `return`, unless it's the only thing in the block. Blank line after a block, before the next statement. Blank lines between the separate steps of a function. Prettier doesn't handle these for you.

**Comments.** Comment only to explain a non-obvious decision or constraint, a surprise, or a file's purpose when it isn't clear. If a comment repeats the code, delete it. Explain behaviour in plain English, with clear subjects.

## One source of truth

Every value, default, type, label, and fact lives in one place, and everything else reads it from there.

- Don't copy a default into a second file, rebuild a URL something else already knows, redefine a type that's in `protocol`, or write the same paragraph in two docs.
- If you find two copies, don't add a third. Fix it, or tell me.
- When sharing really would be awkward, a copy is fine. Don't parse a stylesheet to read a colour; repeat the value in a usable form. Keep the copies identical.

**Configuration.** Keep config small: the hosts and ports an app listens on, the addresses of services it connects to, update frequencies, and the collision threshold.

- Each app reads its config, including environment overrides, in one place: its `config.ts` or `config/` folder. Everything else imports `CONFIG` and never reads `process.env`.
- Timeouts, retries, heartbeats, transport options, and other internal constants go at the top of the file that uses them.
- Store another service's address as a full URL. Only build a URL yourself for the app's own listener.

## Vocabulary

Use one name for one thing, in code and in docs. Some existing code still uses older names. Don't copy them, and fix them when you're working in that code anyway. Say whose properties you mean: `device.properties` is fine, a bare `properties` floating in a function isn't.

| Say                | Meaning                                                  | Not                                |
| ------------------ | -------------------------------------------------------- | ---------------------------------- |
| supervisor         | The server that handles discovery and group commands     | coordinator, controller            |
| supervisor client  | The browser app that talks to the supervisor             | machine client, normal client      |
| machine            | One running instance, as everything else sees it         | instance, node                     |
| device             | What a machine drives: `Pendulum`, or real hardware      |                                    |
| Sim Manager        | The service that launches simulated machines             | simulation manager, manager        |
| Sim Machine        | The program that runs one simulated machine              | machine simulator, simulator       |
| group              | The machines that coordinate together                    | mesh, simulation                   |
| group file         | A saved group in `data/groups/`                          | preset, configuration, setup       |
| environment        | Gravity, wind, and air density. Never `process.env`      |                                    |
| machine properties | What a machine reports about itself: anchor, length, etc | object, configuration              |
| neighbour          | A machine close enough that it could collide with us     | neighbor                           |
| peer               | Any other machine in the group                           | neighbour, unless it really is one |
| Shut Down          | Stop a process, preserving its saved definition          | End                                |
| Delete             | Stop a process and remove its saved definition           | Self destruct                      |

## UI

Keep it bare: simple document flow, readable spacing, clear control boundaries. Only add what was asked for. No invented branding, slogans, decorative panels, or implementation commentary.

Each app has its own stylesheet, its `styles.css`. The supervisor is plain black and white; Sim Manager looks different on purpose ([decisions.md](docs/decisions.md) says why). Style elements, not classes: a page is a `main` with an `h1`, then a `section` or `form` per part, each opening with an `h2`. Don't add Tailwind or a component library.

Define handlers and meaningful JSX before the final layout, so the layout only shows how things are arranged. Use JSX variables as values (`{stopButton}`), not components defined inside a render function. Pull cohesive sections into their own components, but don't wrap single elements just to hide a class name.

## Tests

Write focused tests for behaviour that matters and for the edge cases that could really bite. I care about quality and relevance, not coverage. Passing tests don't replace the readability review.

## How we work

- Tickets live in [.tickets/](.tickets/README.md). Move them from `todo/` to `inprogress/` to `resolved/`, and follow the format in that README.
- Work one thing at a time, in this checkout. No worktrees.
- Other agents may be working here at the same time. Read a file right before you edit it, and check its modified time right before you save. If it changed, read it again and merge your change in. Never save an old copy over someone else's work.
- Stay in scope. Don't rewrite things you weren't asked to touch. If you spot a problem elsewhere, tell me.
- Don't commit unless I ask. I control the history.
- `.meta/` holds my own notes and the challenge brief. Don't edit it, and never link to it from code or from `docs/`. Keep test screenshots and other test artifacts out of the repo. Images the docs show go in `docs/images/`.
- Match verification to the change. For docs-only edits, read the changed text, check any affected links, and check formatting on the files touched. No builds or tests needed. For code changes, run the relevant tests and static checks. Use `npm run check` and `npm run format:check` for broader changes, such as shared protocol, dependencies, or build configuration. Always do the readability review, and report checks that failed or couldn't run.

## Documentation

When writing documentation, keep it short and plain. Don't force conversational language or explain what's already obvious.

Each doc has one job. Say a thing once, in the right place, and link to it from elsewhere. If you change behaviour, update the doc that describes it in the same piece of work. Agent instructions stay in this file.

| File                                       | Job                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `README.md`                                | For the reviewer: run it, overview, limits                                                            |
| `apps/*/README.md`, `packages/*/README.md` | What that part does and doesn't do, what's inside it, running it alone, and its environment variables |
| `docs/decisions.md`                        | Why it works that way, and the trade-offs                                                             |
| `docs/messaging.md`                        | The protocol between the parts                                                                        |
| `docs/development.md`                      | Running the whole stack locally                                                                       |
| `docs/testing.md`                          | What the tests cover                                                                                  |
| `docs/a-note-for-reviewers.md`             | How the work went, in my own words. Don't edit it.                                                    |
| `docs/notes/`                              | Focused notes on a constraint or an alternative                                                       |

## Readability review

Before finishing, read the whole functions you touched, not just the lines you added:

- Can someone follow the main sequence without digging through the details first?
- Does each function have one clear job, and does its name say exactly what it does?
- Does each extraction mean less to hold in your head, without a lot of jumping between files?
- Did you add a retry, cache, fallback, lifecycle flag, or abstraction? Keep it only if a requirement or a real failure justifies it. Keep necessary cleanup and correctness checks.
- Did you leave behind dead branches, duplicated decisions, or misleading names?
- Did you add something that already exists somewhere else in the repo?

When you're not sure what good looks like here, read [api.ts](apps/supervisor/src/server/api.ts) and [sockets.ts](apps/supervisor/src/server/sockets.ts) in the supervisor, and work the same way.
