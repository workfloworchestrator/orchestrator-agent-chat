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
import "@workfloworchestrator/wfo-chat/style.css";

<WfoChat agentUrl="/agui/" token={accessToken} context={[{ description: "The subscription on screen", value: id }]} />;
```

On a page that is not React, `mountWfoChat(props)` renders the same popup and returns the function that
removes it again.

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

The look is a Tailwind theme (`src/styles/theme.css`) compiled into the stylesheet: a few colour tokens,
a typeface, two shadows and two animations. A host page retunes it by overriding the variables on `:root`,
and gives it its own typeface through `--font-wfo`:

```css
:root {
  --color-wfo-accent: #1d4ed8;
  --font-wfo: "Inter", sans-serif;
}
```

The stylesheet carries no reset and no element rules, so it does not restyle the page it is dropped into.

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

`npm run build` writes the package to `dist/` (one ES module, one stylesheet, type declarations; React is a
peer dependency and the other dependencies stay the host's). It also runs as the `prepare` script, so the
package installs straight from git: `npm install github:workfloworchestrator/orchestrator-agent-chat`.

## Licence

Apache 2.0, see `LICENSE`.
