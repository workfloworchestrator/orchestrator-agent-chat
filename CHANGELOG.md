# Changelog

## Unreleased

- The popup renders in a shadow root and carries its stylesheet: a page's own styles no longer reach it, and
  there is no `style.css` to import. A page retunes it on `.wfo-chat-host` instead of `:root`.
- Moved out of orchestrator-agent's `demos/web` into this repository; the demo page stays there and
  installs this package.
- First version: the popup with its chats list, the transcript with the agent's steps and artifacts, charts
  drawn from the agent's chart data, and workflow forms as AG-UI interrupts.
