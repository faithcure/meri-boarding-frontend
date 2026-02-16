"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/getLocale";
import { useLocale } from "@/i18n/useLocale";
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/messages";

type Message = {
  role: "assistant" | "user";
  text: string;
  html?: string;
};

const initialMessages = (t: Messages["chatWidget"]): Message[] => [
  {
    role: "assistant",
    text: t.intro,
  },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type ChatWidgetProps = {
  locale?: Locale;
};

export default function ChatWidget({ locale: localeProp }: ChatWidgetProps) {
  const activeLocale = useLocale();
  const locale = activeLocale ?? localeProp ?? "de";
  const t = getMessages(locale).chatWidget;
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => initialMessages(t));
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<"collect" | "ready">("collect");
  const [contactDraft, setContactDraft] = useState({ name: "", email: "" });
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (stage === "collect") {
      nameRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [isOpen, stage]);

  useEffect(() => {
    if (isOpen) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = () => {
    if (stage !== "ready") return;
    const trimmed = input.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: t.thanks,
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  const handleContactSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = contactDraft.name.trim();
    const email = contactDraft.email.trim();

    setContactDraft({ name, email });
    setStage("ready");
    setIsTyping(true);
    window.setTimeout(() => {
      const safeName = escapeHtml(name || t.fallbackName);
      const greetingText = t.greeting.replace("{{name}}", name || t.fallbackName);
      const greetingHtml = t.greeting.replace("{{name}}", `<strong>${safeName}</strong>`);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: greetingText,
          html: greetingHtml,
        },
      ]);
      setIsTyping(false);
    }, 500);
  };

  return (
    <div className={`chat-widget ${isOpen ? "is-open" : ""} ${isExpanded ? "is-expanded" : ""}`}>
      <button
        type="button"
        className="chat-toggle"
        aria-expanded={isOpen}
        aria-controls="meri-chat-panel"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="chat-toggle-label">{t.toggle}</span>
        <span className="chat-toggle-badge">{t.badge}</span>
        <i className="fa fa-comments" aria-hidden="true"></i>
      </button>

      <div id="meri-chat-panel" className="chat-panel" role="dialog" aria-label={t.panelTitle}>
        <div className="chat-panel-header">
          <div className="chat-header-brand">
            <div className="chat-avatar" aria-hidden="true">
              M
            </div>
            <div>
            <div className="chat-panel-title">
              <i className="fa fa-headset chat-title-icon" aria-hidden="true"></i>
              {t.panelTitle}
            </div>
            </div>
          </div>
          <div className="chat-header-actions">
            <span className="chat-status-dot is-online" aria-label={t.badge}></span>
            <button
              type="button"
              className="chat-expand"
              aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
              aria-pressed={isExpanded}
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              <i className={`fa ${isExpanded ? "fa-compress" : "fa-expand"}`} aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className="chat-close"
              aria-label="Close chat"
              onClick={() => setIsOpen(false)}
            >
              <i className="fa fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div className="chat-panel-body" ref={listRef}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
              {message.role === "assistant" && message.html ? (
                <span dangerouslySetInnerHTML={{ __html: message.html }} />
              ) : (
                message.text
              )}
            </div>
          ))}
          {stage === "collect" && (
            <form className="chat-contact-card" onSubmit={handleContactSubmit}>
              <label htmlFor="chat-name">{t.fullName}</label>
              <input
                ref={nameRef}
                id="chat-name"
                type="text"
                value={contactDraft.name}
                onChange={(event) =>
                  setContactDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t.namePlaceholder}
              />
              <label htmlFor="chat-email">{t.email}</label>
              <input
                id="chat-email"
                type="email"
                value={contactDraft.email}
                onChange={(event) =>
                  setContactDraft((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder={t.emailPlaceholder}
              />
              <button type="submit">{t.continue}</button>
            </form>
          )}
          {isTyping && (
            <div className="chat-typing" aria-live="polite">
              <span className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
              {t.typing}
            </div>
          )}
        </div>

        {stage === "ready" && (
          <div className="chat-panel-footer">
            <input
              ref={inputRef}
              type="text"
              value={input}
              placeholder={t.placeholder}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <button type="button" onClick={handleSend}>
              {t.send}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
