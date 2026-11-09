import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, Maximize2, MessageSquare, Minimize2, Plus, X } from "lucide-react";

import type { AgentContext, Artifact } from "../api/types";
import { useWfoAgent } from "../hooks/useWfoAgent";
import { textOf } from "../lib/artifacts";
import { saveFile } from "../lib/download";
import { ChatList } from "./ChatList";
import { Composer } from "./Composer";
import { Mark } from "./Mark";
import { Messages } from "./Messages";
import { Shadow } from "./Shadow";
import { StopCard } from "./StopCard";
import { ICON_BUTTON, PRIMARY } from "./classes";

/**
 * The popup's colours, each a CSS colour. A host with a theme of its own passes the ones it has; the rest keep
 * the popup's own values, which follow the WFO UI.
 */
export interface WfoChatColors {
  /** The panel's background. */
  bg: string;
  /** A surface on it: a hover, a chip, a code block. */
  surface: string;
  /** Borders and dividers. */
  line: string;
  /** Text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** The brand colour as a fill: buttons, the working dot. */
  accent: string;
  /** The fill's hover. */
  accentStrong: string;
  /** The brand colour for words and icons, dark enough to read. */
  accentText: string;
  /** A field tinted in the brand colour. */
  accentSoft: string;
  /** Text on the fill. */
  onAccent: string;
  /** The field behind the mark: the header's badge, the launcher. */
  mark: string;
  /** What is drawn on that field, such as the launcher's close icon. */
  onMark: string;
  /** Waiting for the person: a form open, a step paused. */
  wait: string;
  waitSoft: string;
  /** An error. */
  danger: string;
  dangerSoft: string;
}

export interface WfoChatProps {
  /** The agent's AG-UI route; same origin by default (a proxy in front of the page forwards it). */
  agentUrl?: string;
  /** The agent's chats API; by default next to the AG-UI route (``/chats``). */
  chatsUrl?: string;
  /** How many of a chat's last messages are loaded when it is opened. */
  historyLimit?: number;
  /** The person's bearer token: the agent forwards it to orchestrator-core. */
  token?: string;
  /** Extra headers sent with every run. */
  headers?: Record<string, string>;
  /** What the host page knows: the subscription on screen, the customer selected, ... */
  context?: AgentContext[];
  /** The assistant's name in the header; inside a chat, the chat's own title heads the panel. */
  title?: string;
  /** Opening lines offered in an empty chat; a click sends one. */
  suggestions?: string[];
  /** Light or dark; by default the popup follows the system. */
  theme?: "auto" | "light" | "dark";
  /**
   * The host's own theme, for the mode `theme` names: each colour given wins over the popup's own, in light
   * and dark alike. A host whose mode can change passes the colours of the current one.
   */
  colors?: Partial<WfoChatColors>;
  /** Namespace of the thread in session storage; one popup per key. */
  threadKey?: string;
  defaultOpen?: boolean;
}

/** Each colour's custom property in the stylesheet, less the `--color-wfo-` it starts with. */
const TOKENS: Record<keyof WfoChatColors, string> = {
  bg: "bg",
  surface: "surface",
  line: "line",
  ink: "ink",
  muted: "muted",
  accent: "accent",
  accentStrong: "accent-strong",
  accentText: "accent-text",
  accentSoft: "accent-soft",
  onAccent: "on-accent",
  mark: "mark",
  onMark: "on-mark",
  wait: "wait",
  waitSoft: "wait-soft",
  danger: "danger",
  dangerSoft: "danger-soft",
};

/**
 * The colours as the custom properties the stylesheet reads, to set inline on the popup's root: there they
 * beat the theme's own values, the dark ones included, which the stylesheet sets on that same element.
 */
function variablesOf(colors: Partial<WfoChatColors> | undefined): CSSProperties | undefined {
  if (!colors) return undefined;
  const style: Record<string, string> = {};
  for (const [key, token] of Object.entries(TOKENS) as [keyof WfoChatColors, string][]) {
    const value = colors[key];
    if (value) style[`--color-wfo-${token}`] = value;
  }
  return style as CSSProperties;
}

const SUGGESTIONS = ["What products are there?", "Show the latest processes", "Create a new service port"];
const LAYER = "fixed z-[2147483000]";

/** A chat's title as the list shows it: its first question, on one line. */
function titleOf(messages: { role: string; content?: unknown }[]): string | null {
  const first = messages.find((m) => m.role === "user");
  const line = first ? textOf(first.content).trim().split("\n")[0] : "";
  if (!line) return null;
  return line.length > 80 ? `${line.slice(0, 79)}…` : line;
}

/** The WFO agent as a chat popup in the bottom-right corner of whatever page hosts it. */
export function WfoChat({
  agentUrl = "/agui/",
  chatsUrl,
  historyLimit,
  token,
  headers,
  context,
  title = "Workflow Orchestrator",
  suggestions = SUGGESTIONS,
  theme = "auto",
  colors,
  threadKey,
  defaultOpen = false,
}: WfoChatProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [wide, setWide] = useState(false);
  const [view, setView] = useState<"chats" | "chat">("chats"); // the person's chats are the first screen
  const [unread, setUnread] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);

  const allHeaders = useMemo(
    () => ({ ...(headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }),
    [headers, token],
  );
  const chat = useWfoAgent({ url: agentUrl, chatsUrl, headers: allHeaders, context, threadKey, historyLimit });
  const { listChats } = chat;
  const inChat = view === "chat";

  // The list is fetched each time it comes on screen, so a chat that just started is on it.
  useEffect(() => {
    if (open && !inChat) void listChats();
  }, [open, inChat, listChats]);

  const openChat = (id: string) => {
    setView("chat");
    if (id !== chat.threadId) void chat.openChat(id);
  };
  const newChat = () => {
    setView("chat");
    chat.newChat();
  };

  // A reply that lands while the panel is closed marks the launcher.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !chat.running && !open) setUnread(true);
    wasRunning.current = chat.running;
  }, [chat.running, open]);
  useEffect(() => {
    if (open && inChat) input.current?.focus();
  }, [open, inChat]);

  const send = (text: string) => void chat.send(text);
  const { downloadExport } = chat;
  // An export the agent prepared: fetched through the chat, as the person asking, and saved as the file it is.
  const download = useCallback(
    async (artifact: Artifact) => {
      if (artifact.download_url) saveFile(await downloadExport(artifact.download_url));
    },
    [downloadExport],
  );

  const chatTitle =
    titleOf(chat.messages) ?? chat.chats.find((c) => c.thread_id === chat.threadId)?.title ?? "New chat";
  const status = chat.running
    ? { text: "Working…", tone: "bg-wfo-accent motion-safe:animate-wfo-blink" }
    : chat.interrupts.length
      ? { text: "Waiting for your answer", tone: "bg-wfo-wait" }
      : chat.loading
        ? { text: "Loading…", tone: "bg-wfo-muted" }
        : null;

  return (
    <Shadow>
      <div
        className="wfo-chat contents scheme-light dark:scheme-dark"
        data-theme={theme === "auto" ? undefined : theme}
        style={variablesOf(colors)}
      >
        {open && (
          <section
            className={`${LAYER} right-4 bottom-20 flex origin-bottom-right flex-col overflow-hidden rounded-[20px] border border-wfo-line bg-wfo-bg font-wfo text-wfo-ink shadow-wfo-panel motion-safe:animate-wfo-pop ${
              wide ? "w-[min(900px,calc(100vw-2rem))]" : "w-[min(380px,calc(100vw-2rem))]"
            } h-[min(640px,calc(100vh-6rem))]`}
            role="dialog"
            aria-label={title}
          >
            <header className="flex items-center gap-2 border-b border-wfo-line px-3 py-2.5">
              {inChat ? (
                <button type="button" className={ICON_BUTTON} title="Your chats" onClick={() => setView("chats")}>
                  <ChevronLeft size={18} />
                </button>
              ) : (
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wfo-mark text-wfo-on-mark">
                  <Mark size={20} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm leading-5 font-semibold">{inChat ? chatTitle : title}</div>
                <div className="flex items-center gap-1.5 text-xs leading-4 text-wfo-muted">
                  {inChat && status ? (
                    <>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.tone}`} />
                      {status.text}
                    </>
                  ) : inChat ? (
                    title
                  ) : (
                    "Your chats"
                  )}
                </div>
              </div>
              {inChat && (
                <button type="button" className={ICON_BUTTON} title="New chat" onClick={newChat}>
                  <Plus size={18} />
                </button>
              )}
              <button
                type="button"
                className={ICON_BUTTON}
                title={wide ? "Narrow" : "Widen"}
                onClick={() => setWide((w) => !w)}
              >
                {wide ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button type="button" className={ICON_BUTTON} title="Close" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </header>

            {/* Keyed per screen: the list starts at the top and a chat at its end, never where the other screen left off. */}
            <div
              key={inChat ? "chat" : "chats"}
              className="flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-wfo-line)_transparent] overflow-y-auto px-4 py-3"
            >
              {inChat ? (
                <>
                  <Messages
                    messages={chat.messages}
                    running={chat.running}
                    suggestions={suggestions}
                    onSuggest={send}
                    onDownload={download}
                  />
                  {chat.interrupts.map((interrupt) => (
                    <div key={interrupt.id} className="mt-3">
                      <StopCard
                        interrupt={interrupt}
                        busy={chat.running}
                        search={chat.searchOptions}
                        onResolve={(payload) =>
                          void chat.respond([{ interruptId: interrupt.id, status: "resolved", payload }])
                        }
                        onCancel={() => void chat.respond([{ interruptId: interrupt.id, status: "cancelled" }])}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <ChatList
                  chats={chat.chats}
                  loading={chat.loading}
                  onOpen={openChat}
                  onDelete={(id) => void chat.deleteChat(id)}
                  onNew={newChat}
                />
              )}
            </div>

            {chat.error && (
              <div className="mx-3 mb-2 rounded-lg bg-wfo-danger-soft px-3 py-2 text-xs leading-4 text-wfo-danger">
                {chat.error}
              </div>
            )}

            {inChat ? (
              <div className="border-t border-wfo-line p-3">
                <Composer
                  inputRef={input}
                  placeholder={
                    chat.interrupts.length
                      ? "Answer above, or type to leave the form"
                      : "Ask the Workflow Orchestrator…"
                  }
                  running={chat.running}
                  onSend={send}
                  onStop={chat.stop}
                />
              </div>
            ) : (
              <div className="border-t border-wfo-line p-3">
                <button type="button" className={`${PRIMARY} w-full`} onClick={newChat}>
                  <Plus size={16} /> New chat
                </button>
              </div>
            )}
          </section>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            setUnread(false);
          }}
          title={open ? `Close ${title}` : `Open ${title}`}
          className={`${LAYER} right-4 bottom-4 flex h-14 w-14 cursor-pointer items-center justify-center border-0 bg-transparent p-0 pb-1.5 text-wfo-on-mark drop-shadow-wfo-launcher hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wfo-accent`}
        >
          {/* The button is lucide's speech bubble, filled and stroked in the mark's colour; the logo sits on its body. */}
          <MessageSquare className="absolute inset-0 h-full w-full fill-wfo-mark stroke-wfo-mark" />
          <span className="relative inline-flex">{open ? <X size={22} /> : <Mark size={28} />}</span>
          {unread && !open && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-wfo-wait ring-2 ring-wfo-bg" />
          )}
        </button>
      </div>
    </Shadow>
  );
}
