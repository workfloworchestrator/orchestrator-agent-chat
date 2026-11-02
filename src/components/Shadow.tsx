import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import css from "../styles/theme.css?inline";

/** The popup's stylesheet as one sheet per page, adopted by every root the popup opens. */
let shared: CSSStyleSheet | null = null;

function stylesheet(): CSSStyleSheet | null {
  if (shared) return shared;
  if (typeof CSSStyleSheet === "undefined" || !("replaceSync" in CSSStyleSheet.prototype)) return null;
  shared = new CSSStyleSheet();
  shared.replaceSync(css);
  registerProperties(shared);
  return shared;
}

/**
 * Register the sheet's ``@property`` rules from the document.
 *
 * Tailwind gives its own variables defaults through ``@property`` (``--tw-border-style: solid`` is what makes
 * ``border`` draw a line), and a registration is page-wide by definition: a browser does not apply one it finds
 * inside a shadow root. Registering the same properties from the document is what the sheet would do on a page
 * of its own, and styles nothing. A browser without ``@property`` uses the fallbacks the sheet carries.
 */
function registerProperties(sheet: CSSStyleSheet): void {
  if (typeof CSSPropertyRule === "undefined" || !("registerProperty" in CSS)) return;
  const walk = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSPropertyRule) {
        try {
          CSS.registerProperty({
            name: rule.name,
            syntax: rule.syntax,
            inherits: rule.inherits,
            ...(rule.initialValue === null ? {} : { initialValue: rule.initialValue }),
          });
        } catch {
          /* registered already, by this sheet on another root or by the page: the same definition */
        }
      } else if ("cssRules" in rule) {
        walk((rule as CSSGroupingRule).cssRules);
      }
    }
  };
  walk(sheet.cssRules);
}

/**
 * A shadow root around the popup: the page's stylesheets stop at its edge, and the popup's stay inside.
 *
 * To the page the popup is its host element, `wfo-chat-host`; custom properties set on it (`--color-wfo-accent`,
 * `--font-wfo`, ...) are inherited inside, which is how a page retunes the popup. The root opens on mount, so
 * on a server the popup renders as its empty host.
 */
export function Shadow({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);

  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    const sheet = stylesheet();
    if (sheet) {
      shadow.adoptedStyleSheets = [sheet];
    } else if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = css;
      shadow.appendChild(style);
    }
    setRoot(shadow);
  }, []);

  return (
    <div ref={host} className="wfo-chat-host" style={{ display: "contents" }}>
      {root && createPortal(children, root)}
    </div>
  );
}
