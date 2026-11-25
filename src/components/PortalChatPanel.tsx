import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageSquare, Send, ShieldCheck, User, Wifi, WifiOff } from 'lucide-react';
import type { Language } from '../utils/coachingMath';
import type { PortalChatMessage } from '../utils/portalPlanning';

interface PortalChatPanelProps {
  lang: Language;
  role: 'admin' | 'portal';
  token: string;
  accountId: string;
  peerLabel: string;
  onAuthExpired?: () => void;
  onMessagesLoaded?: (messages: PortalChatMessage[]) => void;
}

export function PortalChatPanel({
  lang,
  role,
  token,
  accountId,
  peerLabel,
  onAuthExpired,
  onMessagesLoaded,
}: PortalChatPanelProps) {
  const [messages, setMessages] = useState<PortalChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorText, setErrorText] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const onAuthExpiredRef = useRef(onAuthExpired);
  onAuthExpiredRef.current = onAuthExpired;
  const onMessagesLoadedRef = useRef(onMessagesLoaded);
  onMessagesLoadedRef.current = onMessagesLoaded;

  const t =
    lang === 'en'
      ? {
          title: role === 'admin' ? `Direct Chat · ${peerLabel}` : `Live Coach Chat · ${peerLabel}`,
          liveBadge: 'Live WebSocket',
          reconnectingBadge: 'Syncing...',
          empty:
            'No messages yet. Start a conversation to coordinate workouts, nutrition tweaks, or weekly check-ins.',
          placeholder: 'Write your message here...',
          sendBtn: 'Send',
          youLabel: 'You',
          adminTag: 'Coach / Admin',
          athleteTag: 'Athlete',
          sendErr: 'Could not send message. Please check your connection.',
        }
      : {
          title:
            role === 'admin'
              ? `الشات المباشر مع المتدرب · ${peerLabel}`
              : `المحادثة المباشرة مع إدارة التدريب · ${peerLabel}`,
          liveBadge: 'اتصال مباشر لحظي',
          reconnectingBadge: 'جارٍ المزامنة...',
          empty:
            'لا توجد رسائل حتى الآن. ابدأ المحادثة للتنسيق حول التمارين، التغذية، أو التقييم الأسبوعي.',
          placeholder: 'اكتب رسالتك هنا...',
          sendBtn: 'إرسال',
          youLabel: 'أنت',
          adminTag: 'الإدارة / المدرب',
          athleteTag: 'المتدرب',
          sendErr: 'تعذر إرسال الرسالة. يرجى التحقق من الاتصال والمحاولة مجدداً.',
        };

  const mergeIncomingMessage = useCallback((incoming: PortalChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming];
    });
  }, []);

  useEffect(() => {
    onMessagesLoadedRef.current?.(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const restEndpoint =
    role === 'admin'
      ? `/api/admin/portal-accounts/${encodeURIComponent(accountId)}/chat`
      : '/api/portal/chat';

  useEffect(() => {
    let active = true;
    setMessages([]);
    setErrorText('');

    fetch(restEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          onAuthExpiredRef.current?.();
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: PortalChatMessage[] };
        if (active && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      })
      .catch(() => {
        // WebSocket handshake will also provide history
      });

    return () => {
      active = false;
    };
  }, [restEndpoint, token]);

  useEffect(() => {
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let consecutiveFailures = 0;

    const connect = () => {
      if (disposed || !token || !accountId) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws/chat?token=${encodeURIComponent(
        token
      )}&accountId=${encodeURIComponent(accountId)}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!disposed) {
          consecutiveFailures = 0;
          setConnected(true);
          setErrorText('');
        }
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        try {
          const payload = JSON.parse(String(event.data)) as {
            type?: string;
            accountId?: string;
            messages?: PortalChatMessage[];
            message?: PortalChatMessage;
          };
          if (payload.type === 'chat:history' && Array.isArray(payload.messages)) {
            if (!payload.accountId || payload.accountId === accountId) {
              setMessages(payload.messages);
            }
          } else if (payload.type === 'chat:message' && payload.message) {
            if (payload.message.accountId === accountId) {
              mergeIncomingMessage(payload.message);
            }
          }
        } catch {
          // Ignore invalid payloads
        }
      };

      ws.onclose = (event) => {
        if (disposed) return;
        setConnected(false);

        if (event.code === 4401 || event.code === 4403) {
          onAuthExpiredRef.current?.();
          return;
        }

        consecutiveFailures += 1;
        if (consecutiveFailures >= 4) {
          fetch(restEndpoint, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
              if (!disposed && (res.status === 401 || res.status === 403)) {
                onAuthExpiredRef.current?.();
              }
            })
            .catch(() => {
              // Stop hammering unreachable socket
            });
          return;
        }

        reconnectTimer = setTimeout(connect, 2500);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [token, accountId, restEndpoint, mergeIncomingMessage]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setErrorText('');

    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'chat:send',
          accountId,
          body: trimmed,
        })
      );
      setDraft('');
      return;
    }

    // Fallback to REST if WS is reconnecting
    setSending(true);
    try {
      const res = await fetch(restEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.status === 401) {
        onAuthExpiredRef.current?.();
        return;
      }
      if (!res.ok) {
        setErrorText(t.sendErr);
        return;
      }
      const data = (await res.json()) as { message?: PortalChatMessage };
      if (data.message) {
        mergeIncomingMessage(data.message);
      }
      setDraft('');
    } catch {
      setErrorText(t.sendErr);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl bg-[#12161F] border border-white/10 overflow-hidden flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#161B26] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-5 h-5 text-[#E2F124]" aria-hidden="true" />
          <h3 className="text-sm sm:text-base font-bold text-white">{t.title}</h3>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${
            connected
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-white/10 text-[#CBD5E1]'
          }`}
        >
          {connected ? (
            <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{connected ? t.liveBadge : t.reconnectingBadge}</span>
        </div>
      </div>

      <div
        ref={scrollRef}
        data-testid={`chat-messages-${accountId}`}
        className="p-4 sm:p-5 space-y-3 h-80 sm:h-96 overflow-y-auto bg-[#0f131c]"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-md leading-relaxed">{t.empty}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderRole === role;
            const timeStr = new Date(msg.createdAt).toLocaleTimeString(
              lang === 'en' ? 'en-GB' : 'ar-EG',
              { hour: '2-digit', minute: '2-digit' }
            );
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm border ${
                    isMine
                      ? 'bg-[#E2F124]/15 border-[#E2F124]/40 text-white'
                      : 'bg-[#161B26] border-white/10 text-[#dfe2ef]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold mb-1">
                    {msg.senderRole === 'admin' ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-[#E2F124]" aria-hidden="true" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-[#CBD5E1]" aria-hidden="true" />
                    )}
                    <span className={isMine ? 'text-[#E2F124]' : 'text-[#CBD5E1]'}>
                      {isMine ? `${msg.senderName} (${t.youLabel})` : msg.senderName}
                    </span>
                    <span className="text-white/30">·</span>
                    <span className="text-[#94A3B8] font-normal">
                      {msg.senderRole === 'admin' ? t.adminTag : t.athleteTag}
                    </span>
                    <span className="text-white/30">·</span>
                    <span className="tabular-metric text-[#94A3B8] font-normal">{timeStr}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {errorText && (
        <div className="px-4 py-2 bg-[#ffb4ab]/10 border-t border-[#ffb4ab]/30 text-xs text-[#ffb4ab]">
          {errorText}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 bg-[#161B26] border-t border-white/10 flex items-center gap-2.5"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          maxLength={2000}
          className="flex-1 rounded-xl bg-[#12161F] border border-white/15 px-4 py-2.5 text-sm text-white placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#E2F124]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold btn-kinetic-primary cursor-pointer disabled:opacity-50"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>{t.sendBtn}</span>
        </button>
      </form>
    </div>
  );
}
