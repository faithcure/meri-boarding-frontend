"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/getLocale";
import { useLocale } from "@/i18n/useLocale";
import type { Messages } from "@/i18n/messages";
import { getMessages } from "@/i18n/messages";
import { withPublicApiBaseIfNeeded } from "@/lib/apiBaseUrl";

type Message = {
  role: "assistant" | "user";
  text: string;
  html?: string;
  variant?: "default" | "meta" | "error";
};

type ChatApiSource = {
  sourceId?: string;
  title?: string;
  url?: string;
};

type ChatApiResponse = {
  answer?: string;
  sources?: ChatApiSource[];
  model?: string;
  error?: string;
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

const chatApiUrl = withPublicApiBaseIfNeeded("/api/v1/chat");

function getSourcesLabel(locale: Locale) {
  if (locale === "tr") return "Kaynaklar";
  if (locale === "de") return "Quellen";
  return "Sources";
}

function getChatErrorText(locale: Locale) {
  if (locale === "tr") return "Mesaj gonderilemedi. Lutfen tekrar deneyin.";
  if (locale === "de") return "Nachricht konnte nicht gesendet werden. Bitte erneut versuchen.";
  return "Message could not be sent. Please try again.";
}

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
  const [contactError, setContactError] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const normalizedName = contactDraft.name.trim();
  const normalizedEmail = contactDraft.email.trim();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

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

  useEffect(() => {
    const localeMessages = getMessages(locale).chatWidget;
    setMessages(initialMessages(localeMessages));
    setInput("");
    setStage("collect");
    setContactDraft({ name: "", email: "" });
    setContactError("");
    setIsTyping(false);
  }, [locale]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsExpanded(false);
      setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const handleSend = async () => {
    if (stage !== "ready" || isTyping) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setIsTyping(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          locale,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat API failed (${response.status})`);
      }

      const payload = (await response.json()) as ChatApiResponse;
      const answer = String(payload?.answer || "").trim() || t.thanks;
      const nextMessages: Message[] = [
        {
          role: "assistant",
          text: answer,
          variant: "default",
        },
      ];

      const sourceLines = (Array.isArray(payload?.sources) ? payload.sources : [])
        .slice(0, 3)
        .map((source, index) => {
          const title = String(source?.title || source?.sourceId || "").trim();
          if (!title) return "";
          const url = String(source?.url || "").trim();
          return url ? `${index + 1}. ${title} (${url})` : `${index + 1}. ${title}`;
        })
        .filter(Boolean);

      if (sourceLines.length > 0) {
        nextMessages.push({
          role: "assistant",
          text: `${getSourcesLabel(locale)}:\n${sourceLines.join("\n")}`,
          variant: "meta",
        });
      }

      setMessages((prev) => [...prev, ...nextMessages]);
    } catch (_error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: getChatErrorText(locale),
          variant: "error",
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setIsTyping(false);
    }
  };

  const handleContactSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const name = normalizedName;
    const email = normalizedEmail;
    if (!name) return;
    if (!isEmailValid) {
      setContactError(t.emailInvalid);
      return;
    }

    setContactError("");
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
        aria-label={t.toggle}
      >
        <span className="chat-toggle-label">{t.toggle}</span>
        <span className="chat-toggle-badge">{t.badge}</span>
        <i className="fa fa-comments" aria-hidden="true"></i>
      </button>

      <div id="meri-chat-panel" className="chat-panel" role="dialog" aria-modal={false} aria-label={t.panelTitle}>
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
              aria-label={isExpanded ? t.collapse : t.expand}
              aria-pressed={isExpanded}
              onClick={() => setIsExpanded((prev) => !prev)}
            >
              <i className={`fa ${isExpanded ? "fa-compress" : "fa-expand"}`} aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className="chat-close"
              aria-label={t.close}
              onClick={() => {
                setIsExpanded(false);
                setIsOpen(false);
              }}
            >
              <i className="fa fa-times" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div className="chat-panel-body" ref={listRef} role="log" aria-live="polite" aria-relevant="additions text">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chat-bubble ${message.role} ${message.variant || "default"}`}
            >
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
                onChange={(event) => {
                  setContactDraft((prev) => ({ ...prev, name: event.target.value }));
                  if (contactError) setContactError("");
                }}
                placeholder={t.namePlaceholder}
                autoComplete="name"
                required
              />
              <label htmlFor="chat-email">{t.email}</label>
              <input
                id="chat-email"
                type="email"
                value={contactDraft.email}
                onChange={(event) => {
                  setContactDraft((prev) => ({ ...prev, email: event.target.value }));
                  if (contactError) setContactError("");
                }}
                placeholder={t.emailPlaceholder}
                autoComplete="email"
                required
              />
              {contactError ? (
                <p className="chat-contact-error" role="alert">
                  {contactError}
                </p>
              ) : null}
              <button type="submit" disabled={!normalizedName || !isEmailValid}>
                {t.continue}
              </button>
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
              disabled={isTyping}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            <button type="button" onClick={() => void handleSend()} disabled={isTyping}>
              {t.send}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
