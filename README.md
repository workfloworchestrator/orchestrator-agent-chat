# wfo-chat

The Workflow Orchestrator agent as a chat popup in the bottom-right corner of any page. A React component
that talks to the agent over [AG-UI](https://docs.ag-ui.com): it lists the person's chats, streams the
agent's replies with the steps it takes, draws the charts the agent attaches to a result, and walks a
workflow's form page by page, with nothing started until the person approves.

## Use it

```bash
npm install @workfloworchestrator/wfo-chat
```

```tsx
import { WfoChat } from "@workfloworchestrator/wfo-chat";

<WfoChat agentUrl="/agui/" token={accessToken} context={[{ description: "The subscription on screen", value: id }]} />;
```

On a page that is not React, `mountWfoChat(props)` renders the same popup and returns the function that
removes it again.

The popup renders inside a shadow root with its stylesheet, so the page's styles (a reset, a focus ring on
every element) do not reach it, and nothing of its own reaches the page. There is no stylesheet to import.

The popup needs the agent's AG-UI route and its chats API, by default `/agui/` and `/chats` on the page's
own origin: put a proxy in front of the page (the demo's nginx config is one), or point `agentUrl` at the
agent and allow the origin there.

| Prop           | What it does                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------- |
| `agentUrl`     | The agent's AG-UI route (`/agui/`).                                                            |
| `chatsUrl`     | The agent's chats API; by default next to the AG-UI route.                                     |
| `token`        | The person's bearer token; the agent forwards it to orchestrator-core.                         |
| `headers`      | Extra headers sent with every request.                                                         |
| `context`      | What the host page knows, sent as AG-UI context: the subscription on screen, the customer, ... |
| `title`        | The assistant's name in the header (`Workflow Orchestrator`).                                  |
| `suggestions`  | Opening lines offered in an empty chat; a click sends one.                                     |
| `theme`        | `auto` follows the system; `light` or `dark` pins it.                                          |
| `colors`       | The host's own theme, for the mode `theme` names; each colour given wins over the popup's own. |
| `threadKey`    | Namespace of the current thread in session storage; one popup per key.                         |
| `historyLimit` | How many of a chat's last messages are loaded when it is opened (50).                          |
| `defaultOpen`  | Open on load.                                                                                  |

`useWfoAgent` is the hook behind the component, for a host that wants its own chat surface: the thread,
its interrupts, and `send`, `respond`, `stop`, `newChat`, `listChats`, `openChat`, `deleteChat`,
`searchOptions`.

A form question with many options (a customer among hundreds) is searchable: the card shows a search box,
the words typed fetch the options they fit from the agent (`GET /chats/{thread}/options/{field}?q=`), and
the pick is the answer. A list question keeps every pick as a chip.

### Theming

The look is a Tailwind theme (`src/styles/theme.css`): colour tokens whose values follow the WFO UI in light and
dark, a typeface, two shadows and a few animations. A host with a theme of its own passes its colours with
`colors`, naming the mode with `theme`; each colour given wins over the popup's own, in light and dark alike.
This is how the WFO UI hands the popup EUI's theme, overrides and all:

```tsx
<WfoChat theme={isDark ? "dark" : "light"} colors={{ accent: colors.primary, accentText: colors.textPrimary }} />
```

A page without React sets the same as custom properties on the popup's element, `.wfo-chat-host`, which are
inherited into its shadow root. They reach the light theme; in the dark the popup's own dark values stand.
`--font-wfo` gives it a typeface either way:

```css
.wfo-chat-host {
  --color-wfo-accent: #1d4ed8;
  --font-wfo: "Inter", sans-serif;
}
```

## Develop it

```bash
npm install          # installs, then builds the package (the prepare script)
npm run check        # lint, format, types, build
```

The package is `src/`: `components/` the popup, its parts and their shared class strings (`classes.ts`), `hooks/` the thread over AG-UI (`useWfoAgent` composes the client binding, the chats API, the thread state and the stored thread id),
`api/` the agent's wire contract and the client for its chats API, `lib/` small helpers,
`styles/theme.css` the theme.

The page that hosts the popup the way the WFO UI would lives with the agent, in
[`orchestrator-agent/demos/web`](https://github.com/workfloworchestrator/orchestrator-agent/tree/main/demos/web):
it installs this package from this repository. To see a change there before it is pushed, link the two
checkouts and rebuild on every change:

```bash
npm link && npm run build -- --watch                           # here
cd ../orchestrator-agent/demos/web && npm link @workfloworchestrator/wfo-chat && npm run dev
```

### The contract with the agent

`src/api/openapi.ts` is generated from the agent's OpenAPI document, never edited. The agent is FastAPI, and
its document also names what travels inside AG-UI messages (a tool result's artifact reference with its chart
data, the metadata and answers of a form stop), so everything the popup reads from the agent beyond AG-UI
itself comes from `/openapi.json`. `src/api/types.ts` picks the schemas the popup uses out of it and adds
the AG-UI pieces (`Message`, `Interrupt`, `Context`).

```bash
npm run contract:pull    # from a running agent (AGENT_URL, default http://127.0.0.1:8085), then generate
npm run contract         # from the checked-in copy, src/api/openapi.json
```

The copy is checked in so the package builds without an agent. It is not checked against the agent
automatically: when a route or a model the popup reads changes there, pull the document again. Without a
running agent, the agent checkout writes it directly:

```bash
(cd ../orchestrator-agent && uv run python -m orchestrator_agent.adapters.ag_ui.contract ../orchestrator-agent-chat/src/api/openapi.json)
npm run contract
```

`npm run build` writes the package to `dist/` (one ES module with the stylesheet inside, type declarations;
React is a peer dependency and the other dependencies stay the host's). It also runs as the `prepare` script, so the
package installs straight from git: `npm install github:workfloworchestrator/orchestrator-agent-chat`.

## Release

The package is published to npm by CI: every merge to `main` publishes the version `package.json` names, once.
To release, in the pull request: set the version (`npm version minor --no-git-tag-version`, or edit it), move
the changelog's _Unreleased_ entries under that version, and merge. A merge that leaves the version as it is
publishes nothing. Published versions carry [provenance](https://docs.npmjs.com/generating-provenance-statements)
linking them to the workflow run that built them.

Authentication is npm's [trusted publishing](https://docs.npmjs.com/trusted-publishers), so no token is kept
in the repository. It is configured once, by an owner of the `@workfloworchestrator` organisation on npm, after
the first version is published by hand from a logged-in checkout (`npm publish`): on the package's page on
npmjs.com, _Settings_ → _Trusted publisher_ → GitHub Actions, organisation `workfloworchestrator`, repository
`orchestrator-agent-chat`, workflow `ci.yml`. From then on the `publish` job of that workflow publishes.

## Licence

Apache 2.0, see `LICENSE`.
