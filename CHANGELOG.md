# Changelog

## Unreleased

- An export downloads: the step's button fetches the chat's export from the agent, as the person asking, and
  saves the CSV file. The reference used to be a link to core's own path, which no page could follow.
- `colors` hands the popup a host's own theme, for the mode `theme` names: each colour given wins over the
  popup's own, in light and dark alike. The WFO UI passes EUI's theme through it.
- The theme follows the WFO UI: its colours in light and dark, Inter, and its 4px corners on controls and
  cards. `--color-wfo-accent-text` is new, for words and icons in the accent.
- The popup wears the Workflow Orchestrator logo, in its header, its empty chats list and its launcher, and
  the launcher is a speech bubble.
- The popup renders in a shadow root and carries its stylesheet: a page's own styles no longer reach it, and
  there is no `style.css` to import. A page retunes it on `.wfo-chat-host` instead of `:root`.
- Moved out of orchestrator-agent's `demos/web` into this repository; the demo page stays there and
  installs this package.
- First version: the popup with its chats list, the transcript with the agent's steps and artifacts, charts
  drawn from the agent's chart data, and workflow forms as AG-UI interrupts.
