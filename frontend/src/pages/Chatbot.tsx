import React, { useState, useRef, useEffect } from "react";
import type { AnalysisResult, SarcasmClass } from "../context/AnalysisContext";
import { useAnalysis } from "../context/AnalysisContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type Classification = "sarcasm" | "not_sarcasm" | "unknown" | "error";

interface SentenceResult {
    text:         string;
    cls:          Classification;
    type:         string;
    confidence:   number;
    indicators?:  string[];
    intent_words?: string[];
    emojis?:      string[];
    punctuations?: string[];
    keywords?:    string[];
    error?:       string;
}

interface TextApiResponse {
    source:       "text";
    text:         string;
    cls:          Classification;
    type:         string;
    confidence:   number;
    indicators:   string[];
    intent_words: string[];
    emojis:       string[];
    punctuations: string[];
    keywords:     string[];
}

interface FileApiResponse {
    source:            "file";
    count:             number;
    cls:               Classification;
    type:              string;
    confidence:        number;
    sarcasm_count:     number;
    not_sarcasm_count: number;
    results:           SentenceResult[];
}

type ApiResponse = TextApiResponse | FileApiResponse;

// ─── Message payload kinds ────────────────────────────────────────────────────
interface TextMessage  { kind: "text";   text: string; }
interface SingleResult {
    kind:         "single";
    cls:          Classification;
    type:         string;
    confidence:   number;
    inputText:    string;
    indicators:   string[];
    intent_words: string[];
    emojis:       string[];
    keywords:     string[];
}
interface MultiResult  {
    kind:              "multi";
    filename:          string;
    count:             number;
    cls:               Classification;
    type:              string;
    confidence:        number;
    sarcasm_count:     number;
    not_sarcasm_count: number;
    results:           SentenceResult[];
}
interface ErrorMessage { kind: "error"; text: string; }

type MessagePayload = TextMessage | SingleResult | MultiResult | ErrorMessage;
type Message = { role: "user" | "bot"; payload: MessagePayload; timestamp: Date; };

interface ChatSession {
    id:       string;
    title:    string;
    date:     Date;
    messages: Message[];
    preview:  string;
}

// ─── API ──────────────────────────────────────────────────────────────────────
const API_BASE = "http://127.0.0.1:8000/api/chatbot";

async function classifyText(text: string): Promise<ApiResponse> {
    const res = await fetch(`${API_BASE}/analyze/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function classifyFile(file: File): Promise<ApiResponse> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/analyze/`, { method: "POST", body: form });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconSend    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IconUpload  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IconPlus    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTrash   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>;
const IconBrain   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.66z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.66z"/></svg>;
const IconChat    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconChevron = ({ open }: { open: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
         style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s" }}>
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

// ─── Bubble components ────────────────────────────────────────────────────────
function SingleResultBubble({ p }: { p: SingleResult }) {
    const isSarcasm = p.cls === "sarcasm";
    const color     = isSarcasm ? "var(--amber)" : "var(--green)";
    const emoji     = isSarcasm ? "🟡" : "🟢";
    return (
        <div className="cb-result-single">
            <div className="cb-result-label" style={{ color }}>{emoji} {p.type}</div>
            <div className="cb-result-conf">
                <div className="cb-conf-bar-wrap">
                    <div className="cb-conf-bar" style={{ width: `${p.confidence}%`, background: color }}/>
                </div>
                <span style={{ color, fontWeight: 700, minWidth: 48, textAlign: "left" }}>{p.confidence}%</span>
            </div>
            {/* كلمات النية */}
            {p.intent_words?.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                    {p.intent_words.map((w,i) => (
                        <span key={i} style={{
                            background:"rgba(255,107,138,0.15)", border:"1px solid #ff6b8a55",
                            color:"#ff6b8a", borderRadius:12, padding:"1px 9px", fontSize:12, fontWeight:600
                        }}>{w}</span>
                    ))}
                </div>
            )}
            {/* الإيموجيات */}
            {p.emojis?.length > 0 && (
                <div style={{ marginTop:6 }}>
                    {p.emojis.map((e,i) => <span key={i} style={{ fontSize:18, marginLeft:4 }}>{e}</span>)}
                </div>
            )}
            {/* أول مؤشر */}
            {p.indicators?.length > 0 && p.indicators[0] !== "لا توجد مؤشرات واضحة" && (
                <div style={{ marginTop:6, color:"rgba(160,179,217,0.75)", fontSize:12, fontStyle:"italic" }}>
                    {p.indicators[0]}
                </div>
            )}
            <div className="cb-result-src">"{p.inputText.slice(0, 80)}{p.inputText.length > 80 ? "..." : ""}"</div>
        </div>
    );
}

function MultiResultBubble({ p }: { p: MultiResult }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="cb-result-multi">
            <div className="cb-multi-header">
                <span className="cb-multi-filename">📄 {p.filename}</span>
                <span className="cb-multi-count">{p.count} جمل</span>
            </div>
            <div className="cb-multi-summary">
                <span className="cb-pill sarcasm">🟡 سخرية: {p.sarcasm_count}</span>
                <span className="cb-pill normal">🟢 عادي: {p.not_sarcasm_count}</span>
                <span className="cb-pill conf">⚡ متوسط الثقة: {p.confidence}%</span>
            </div>
            <button className="cb-multi-toggle" onClick={() => setOpen(v => !v)}>
                <IconChevron open={open}/>
                {open ? "إخفاء التفاصيل" : "عرض كل الجمل"}
            </button>
            {open && (
                <div className="cb-sentences">
                    {p.results.map((r, i) => {
                        const color = r.cls === "sarcasm" ? "var(--amber)" : "var(--green)";
                        const emoji = r.cls === "sarcasm" ? "🟡" : "🟢";
                        return (
                            <div key={i} className="cb-sentence-row" style={{ borderColor: color + "55" }}>
                                <div className="cb-sentence-text">{r.text}</div>
                                <div className="cb-sentence-meta">
                                    <span style={{ color }}>{emoji} {r.type}</span>
                                    <span className="cb-sentence-conf" style={{ color, fontWeight: 700 }}>{r.confidence}%</span>
                                </div>
                                <div className="cb-conf-bar-wrap" style={{ marginTop: 6 }}>
                                    <div className="cb-conf-bar" style={{ width: `${r.confidence}%`, background: color }}/>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function BotBubbleContent({ payload }: { payload: MessagePayload }) {
    if (payload.kind === "single") return <SingleResultBubble p={payload as SingleResult}/>;
    if (payload.kind === "multi")  return <MultiResultBubble  p={payload as MultiResult}/>;
    if (payload.kind === "error")  return <span style={{ color: "var(--red)" }}>{(payload as ErrorMessage).text}</span>;
    return <span>{(payload as TextMessage).text}</span>;
}

function MessageRow({ msg }: { msg: Message }) {
    const isUser  = msg.role === "user";
    const time    = msg.timestamp.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" });
    const isError = msg.payload.kind === "error";
    const userText =
        msg.payload.kind === "text"   ? (msg.payload as TextMessage).text :
            msg.payload.kind === "single" ? (msg.payload as SingleResult).inputText :
                msg.payload.kind === "multi"  ? `📄 ${(msg.payload as MultiResult).filename}` : "";
    return (
        <div className={`cb-msg ${isUser ? "user" : "bot"}${isError ? " error" : ""}`}>
            <div className="cb-bubble">
                {isUser ? <span>{userText}</span> : <BotBubbleContent payload={msg.payload}/>}
            </div>
            <div className="cb-msg-time">{time}</div>
        </div>
    );
}

// ─── Session helpers ──────────────────────────────────────────────────────────
function saveSessions(s: ChatSession[]) {
    try { localStorage.setItem("chat_sessions_v5", JSON.stringify(s)); } catch {}
}
function loadSessions(): ChatSession[] | null {
    try {
        const raw = localStorage.getItem("chat_sessions_v5");
        if (!raw) return null;
        return JSON.parse(raw).map((s: any) => ({
            ...s, date: new Date(s.date),
            messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
    } catch { return null; }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const Chatbot: React.FC = () => {
    // ربط Context المشترك مع Dashboard
    const { addResult } = useAnalysis();

    const defaultMsg: Message = {
        role: "bot",
        payload: { kind: "text", text: "مرحباً! أرسل نصاً عربياً أو ارفع ملفاً (txt / pdf / csv) وسأحلل كل جملة فيه. النتائج ستظهر أيضاً في لوحة التحكم 📊" },
        timestamp: new Date(),
    };

    const makeSession = (id = Date.now().toString()): ChatSession => ({
        id, title: "محادثة جديدة", date: new Date(),
        messages: [defaultMsg], preview: "مرحباً!",
    });

    const [sessions,    setSessions]    = useState<ChatSession[]>(() => loadSessions() ?? [makeSession()]);
    const [currentId,   setCurrentId]   = useState<string>(() => (loadSessions() ?? [makeSession()])[0].id);
    const [messages,    setMessages]    = useState<Message[]>(() => (loadSessions() ?? [makeSession()])[0].messages);
    const [input,       setInput]       = useState("");
    const [loading,     setLoading]     = useState(false);
    const [sidebar,     setSidebar]     = useState(true);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);
    const endRef  = useRef<HTMLDivElement>(null);

    useEffect(() => { saveSessions(sessions); }, [sessions]);
    useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
    useEffect(() => {
        const s = sessions.find(s => s.id === currentId);
        if (s) setMessages(s.messages);
    }, [currentId, sessions]);

    const pushMessages = (newMessages: Message[]) => {
        setMessages(newMessages);
        setSessions(prev => prev.map(s => s.id === currentId
            ? { ...s, messages: newMessages, preview: newMessages.at(-1)?.payload.kind === "text" ? (newMessages.at(-1)!.payload as TextMessage).text.slice(0, 50) : "...", date: new Date() }
            : s
        ));
    };

    const newSession = () => {
        const s = makeSession();
        setSessions(prev => [s, ...prev]);
        setCurrentId(s.id);
        setMessages([defaultMsg]);
        setPendingFile(null);
        setInput("");
    };

    const delSession = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        if (currentId === id) {
            if (updated.length > 0) { setCurrentId(updated[0].id); setMessages(updated[0].messages); }
            else newSession();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setPendingFile(f);
        if (fileRef.current) fileRef.current.value = "";
    };

    const handleSend = async () => {
        if (loading) return;
        const isFile = !!pendingFile;
        if (!isFile && !input.trim()) return;

        const userPayload: MessagePayload = { kind: "text", text: isFile ? `📄 ${pendingFile!.name}` : input.trim() };
        const userMsg: Message = { role: "user", payload: userPayload, timestamp: new Date() };
        const withUser = [...messages, userMsg];
        pushMessages(withUser);

        const textToSend = input.trim();
        const fileToSend = pendingFile;
        setInput("");
        setPendingFile(null);
        setLoading(true);

        try {
            const data = isFile ? await classifyFile(fileToSend!) : await classifyText(textToSend);
            let botPayload: MessagePayload;

            if (data.source === "text") {
                const r = data as TextApiResponse;
                botPayload = {
                    kind:         "single",
                    cls:          r.cls,
                    type:         r.type,
                    confidence:   r.confidence,
                    inputText:    r.text ?? textToSend,
                    indicators:   r.indicators   ?? [],
                    intent_words: r.intent_words ?? [],
                    emojis:       r.emojis       ?? [],
                    keywords:     r.keywords     ?? [],
                };


                addResult({
                    text:         r.text ?? textToSend,
                    cls:          r.cls  as SarcasmClass,
                    type:         r.type,
                    conf:         r.confidence,
                    indicators:   r.indicators   ?? [],
                    intent_words: r.intent_words ?? [],
                    emojis:       r.emojis       ?? [],
                    punctuations: r.punctuations ?? [],
                    keywords:     r.keywords     ?? [],
                } as AnalysisResult);

            } else {
                const r = data as FileApiResponse;
                if (r.count === 0) {
                    botPayload = { kind: "error", text: "⚠️ لم يتم استخراج أي جملة صالحة." };
                } else if (r.count === 1) {
                    const s = r.results[0];
                    botPayload = {
                        kind:         "single",
                        cls:          s.cls,
                        type:         s.type,
                        confidence:   s.confidence,
                        inputText:    s.text,
                        indicators:   s.indicators   ?? [],
                        intent_words: s.intent_words ?? [],
                        emojis:       s.emojis       ?? [],
                        keywords:     s.keywords     ?? [],
                    };

                    addResult({
                        text:         s.text,
                        cls:          s.cls as SarcasmClass,
                        type:         s.type,
                        conf:         s.confidence,
                        indicators:   s.indicators   ?? [],
                        intent_words: s.intent_words ?? [],
                        emojis:       s.emojis       ?? [],
                        punctuations: s.punctuations ?? [],
                        keywords:     s.keywords     ?? [],
                    } as AnalysisResult);
                } else {
                    botPayload = {
                        kind:              "multi",
                        filename:          fileToSend?.name ?? "ملف",
                        count:             r.count,
                        cls:               r.cls,
                        type:              r.type,
                        confidence:        r.confidence,
                        sarcasm_count:     r.sarcasm_count,
                        not_sarcasm_count: r.not_sarcasm_count,
                        results:           r.results,
                    };

                    r.results.forEach(s => {
                        if (s.cls !== "error") {
                            addResult({
                                text:         s.text,
                                cls:          s.cls as SarcasmClass,
                                type:         s.type,
                                conf:         s.confidence,
                                indicators:   s.indicators   ?? [],
                                intent_words: s.intent_words ?? [],
                                emojis:       s.emojis       ?? [],
                                punctuations: s.punctuations ?? [],
                                keywords:     s.keywords     ?? [],
                            } as AnalysisResult);
                        }
                    });
                }
            }

            pushMessages([...withUser, { role: "bot", payload: botPayload, timestamp: new Date() }]);

        } catch (err: any) {
            pushMessages([...withUser, {
                role: "bot",
                payload: { kind: "error", text: `⚠️ خطأ: ${err.message || "فشل الاتصال بالخادم"}` },
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#020b18;--card:rgba(0,200,255,.03);--card-h:rgba(0,200,255,.07);
          --border:rgba(0,200,255,.13);--teal:#00c8ff;--teal-d:#0090b8;
          --teal-glow:rgba(0,200,255,.32);--blue:#0070ff;--blue-glow:rgba(0,112,255,.32);
          --txt:#e2f4ff;--txt-m:rgba(160,220,240,.65);--txt-d:rgba(100,170,200,.38);
          --red:#ff6b8a;--amber:#ffcc44;--green:#00ffc8;
        }
        .chatbot-page{display:flex;height:100vh;overflow:hidden;font-family:'Tajawal',sans-serif;direction:rtl;background:var(--bg);color:var(--txt)}
        .cb-sidebar{width:300px;min-width:300px;background:rgba(4,16,32,.97);border-left:1px solid var(--border);display:flex;flex-direction:column;transition:width .3s,min-width .3s,opacity .3s;overflow:hidden}
        .cb-sidebar.closed{width:0;min-width:0;opacity:0;border:none}
        .cb-sidebar-header{padding:18px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
        .cb-sidebar-title{font-size:.82rem;font-weight:700;color:var(--teal);letter-spacing:.12em;text-transform:uppercase}
        .cb-new-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:50px;border:1px solid rgba(0,200,255,.28);background:rgba(0,200,255,.06);color:var(--teal);font-family:'Tajawal',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;transition:all .25s;white-space:nowrap}
        .cb-new-btn:hover{background:rgba(0,200,255,.14);border-color:var(--teal);transform:translateY(-1px)}
        .cb-sessions{flex:1;overflow-y:auto;padding:10px 10px 20px}
        .cb-sessions::-webkit-scrollbar{width:4px}.cb-sessions::-webkit-scrollbar-thumb{background:rgba(0,200,255,.2);border-radius:4px}
        .cb-session-item{display:flex;align-items:center;gap:10px;padding:12px 14px;margin-bottom:6px;border-radius:10px;cursor:pointer;transition:all .22s;border:1px solid transparent;background:rgba(0,200,255,.02);animation:sessionIn .28s ease forwards}
        @keyframes sessionIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        .cb-session-item:hover{background:var(--card-h);border-color:var(--border)}
        .cb-session-item.active{background:linear-gradient(135deg,rgba(0,112,255,.13),rgba(0,200,255,.08));border-color:rgba(0,200,255,.25);border-right:2px solid var(--teal)}
        .cb-session-icon{width:36px;height:36px;border-radius:9px;background:rgba(0,200,255,.08);display:flex;align-items:center;justify-content:center;color:var(--teal);flex-shrink:0}
        .cb-session-info{flex:1;overflow:hidden}
        .cb-session-title{font-size:.86rem;font-weight:600;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px}
        .cb-session-preview{font-size:.72rem;color:var(--txt-m);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cb-del-btn{background:rgba(255,107,138,.08);border:1px solid rgba(255,107,138,.18);border-radius:7px;padding:5px 7px;color:var(--red);cursor:pointer;opacity:0;transition:all .2s;display:flex;align-items:center;flex-shrink:0}
        .cb-session-item:hover .cb-del-btn{opacity:1}
        .cb-del-btn:hover{background:rgba(255,107,138,.2);transform:scale(1.08)}
        .cb-main{flex:1;display:flex;flex-direction:column;overflow:hidden}
        .cb-header{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:rgba(2,11,24,.92);border-bottom:1px solid var(--border);backdrop-filter:blur(16px);flex-shrink:0}
        .cb-header-left{display:flex;align-items:center;gap:12px}
        .cb-toggle{width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--teal);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s}
        .cb-toggle:hover{background:var(--card-h);border-color:var(--teal)}
        .cb-header-title{font-size:1.05rem;font-weight:700;color:var(--txt);display:flex;align-items:center;gap:8px}
        .cb-header-title svg{color:var(--teal)}
        .cb-header-badge{font-size:.68rem;padding:3px 9px;border-radius:20px;background:rgba(0,200,255,.1);border:1px solid rgba(0,200,255,.2);color:var(--teal);font-weight:600;letter-spacing:.06em}
        .cb-window{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:12px}
        .cb-window::-webkit-scrollbar{width:4px}.cb-window::-webkit-scrollbar-thumb{background:rgba(0,200,255,.15);border-radius:4px}
        .cb-msg{display:flex;flex-direction:column;max-width:74%;animation:msgIn .28s ease}
        @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .cb-msg.user{align-self:flex-start;align-items:flex-start}
        .cb-msg.bot{align-self:flex-end;align-items:flex-end}
        .cb-bubble{padding:12px 18px;border-radius:18px;font-size:.93rem;line-height:1.65;word-break:break-word}
        .cb-msg.user .cb-bubble{background:linear-gradient(135deg,var(--blue),var(--teal-d));color:#fff;border-bottom-right-radius:5px;box-shadow:0 4px 18px var(--blue-glow)}
        .cb-msg.bot .cb-bubble{background:rgba(0,200,255,.04);color:var(--teal);border:1px solid rgba(0,200,255,.14);border-bottom-left-radius:5px;padding:16px 18px}
        .cb-msg.bot.error .cb-bubble{background:rgba(255,107,138,.06);border-color:rgba(255,107,138,.22)}
        .cb-msg-time{font-size:.67rem;color:rgba(100,170,200,.38);margin-top:4px;padding:0 4px}
        .cb-result-single{display:flex;flex-direction:column;gap:10px}
        .cb-result-label{font-size:1.08rem;font-weight:700}
        .cb-result-conf{display:flex;align-items:center;gap:10px;font-size:.88rem}
        .cb-result-src{font-size:.78rem;color:rgba(100,170,200,.38);font-style:italic;border-right:2px solid rgba(0,200,255,.2);padding-right:10px;margin-top:2px}
        .cb-conf-bar-wrap{flex:1;height:6px;border-radius:10px;background:rgba(255,255,255,.08);overflow:hidden}
        .cb-conf-bar{height:100%;border-radius:10px;transition:width .7s cubic-bezier(.4,0,.2,1)}
        .cb-result-multi{display:flex;flex-direction:column;gap:12px;min-width:260px}
        .cb-multi-header{display:flex;align-items:center;justify-content:space-between}
        .cb-multi-filename{font-size:.88rem;font-weight:700;color:var(--txt)}
        .cb-multi-count{font-size:.72rem;padding:3px 9px;border-radius:20px;background:rgba(0,200,255,.1);border:1px solid rgba(0,200,255,.2);color:var(--teal)}
        .cb-multi-summary{display:flex;flex-wrap:wrap;gap:7px}
        .cb-pill{font-size:.75rem;padding:4px 10px;border-radius:20px;font-weight:600}
        .cb-pill.sarcasm{background:rgba(255,204,68,.1);border:1px solid rgba(255,204,68,.25);color:var(--amber)}
        .cb-pill.normal{background:rgba(0,255,200,.08);border:1px solid rgba(0,255,200,.2);color:var(--green)}
        .cb-pill.conf{background:rgba(0,200,255,.08);border:1px solid rgba(0,200,255,.2);color:var(--teal)}
        .cb-multi-toggle{display:flex;align-items:center;gap:6px;font-family:'Tajawal',sans-serif;font-size:.8rem;font-weight:600;color:var(--teal);background:rgba(0,200,255,.06);border:1px solid rgba(0,200,255,.2);border-radius:8px;padding:7px 12px;cursor:pointer;transition:all .2s;align-self:flex-start}
        .cb-multi-toggle:hover{background:rgba(0,200,255,.12)}
        .cb-sentences{display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto;padding-left:2px}
        .cb-sentences::-webkit-scrollbar{width:3px}.cb-sentences::-webkit-scrollbar-thumb{background:rgba(0,200,255,.2);border-radius:4px}
        .cb-sentence-row{padding:10px 14px;border-radius:10px;border:1px solid;background:rgba(0,200,255,.025);animation:msgIn .22s ease}
        .cb-sentence-text{font-size:.85rem;color:var(--txt);line-height:1.55;margin-bottom:6px}
        .cb-sentence-meta{display:flex;align-items:center;justify-content:space-between;font-size:.77rem}
        .cb-sentence-conf{font-weight:700}
        .cb-typing{align-self:flex-end;display:flex;align-items:center;gap:5px;padding:12px 18px;background:rgba(0,200,255,.05);border:1px solid rgba(0,200,255,.14);border-radius:18px;border-bottom-left-radius:5px;animation:msgIn .28s ease}
        .cb-dot{width:7px;height:7px;border-radius:50%;background:var(--teal);animation:dotBounce .9s infinite}
        .cb-dot:nth-child(2){animation-delay:.2s}.cb-dot:nth-child(3){animation-delay:.4s}
        @keyframes dotBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}
        .cb-input-area{padding:16px 24px 20px;border-top:1px solid var(--border);background:rgba(2,11,24,.85);backdrop-filter:blur(16px);flex-shrink:0}
        .cb-file-badge{display:flex;align-items:center;gap:8px;padding:7px 14px;margin-bottom:10px;background:rgba(0,200,255,.07);border:1px solid rgba(0,200,255,.22);border-radius:10px;font-size:.8rem;color:var(--teal);animation:msgIn .2s ease}
        .cb-file-badge-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .cb-file-badge-close{background:none;border:none;color:var(--red);cursor:pointer;font-size:.9rem;flex-shrink:0;padding:0 4px}
        .cb-input-row{display:flex;align-items:center;gap:10px}
        .cb-input-box{flex:1;padding:13px 20px;border-radius:50px;border:1px solid var(--border);background:rgba(0,200,255,.03);color:var(--txt);font-family:'Tajawal',sans-serif;font-size:.93rem;outline:none;transition:all .25s;direction:rtl}
        .cb-input-box:focus{border-color:var(--teal);background:rgba(0,200,255,.055);box-shadow:0 0 0 3px rgba(0,200,255,.09)}
        .cb-input-box::placeholder{color:rgba(100,170,200,.38)}.cb-input-box:disabled{opacity:.5;cursor:not-allowed}
        .cb-upload-btn{position:relative;width:48px;height:48px;border-radius:14px;border:1px solid rgba(0,200,255,.28);background:rgba(0,200,255,.06);color:var(--teal);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s;flex-shrink:0;overflow:hidden}
        .cb-upload-btn:hover{background:rgba(0,200,255,.14);border-color:var(--teal);transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,200,255,.32)}
        .cb-upload-btn input[type="file"]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
        .cb-send-btn{display:flex;align-items:center;gap:8px;padding:0 24px;height:48px;border-radius:50px;border:none;background:linear-gradient(135deg,var(--blue),var(--teal-d));color:#fff;font-family:'Tajawal',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;transition:all .25s;white-space:nowrap;flex-shrink:0;box-shadow:0 4px 20px rgba(0,112,255,.32)}
        .cb-send-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,112,255,.55)}
        .cb-send-btn:active:not(:disabled){transform:scale(.96)}.cb-send-btn:disabled{opacity:.45;cursor:not-allowed}
        .cb-input-hint{font-size:.7rem;color:rgba(100,170,200,.38);text-align:center;margin-top:10px}
        @media(max-width:768px){
          .cb-sidebar{position:fixed;right:0;top:0;height:100vh;z-index:100}
          .cb-send-btn .cb-btn-label{display:none}.cb-send-btn{padding:0 16px}
          .cb-window{padding:16px 14px}.cb-msg{max-width:92%}
        }
      `}</style>

            <div className="chatbot-page">
                <div className={`cb-sidebar${sidebar ? "" : " closed"}`}>
                    <div className="cb-sidebar-header">
                        <span className="cb-sidebar-title">السجل</span>
                        <button className="cb-new-btn" onClick={newSession}><IconPlus /> جديد</button>
                    </div>
                    <div className="cb-sessions">
                        {sessions.length === 0
                            ? <div style={{ padding:"30px 16px", textAlign:"center", color:"rgba(100,170,200,.38)", fontSize:".82rem" }}>لا توجد محادثات</div>
                            : sessions.map(s => (
                                <div key={s.id} className={`cb-session-item${s.id === currentId ? " active" : ""}`}
                                     onClick={() => { setCurrentId(s.id); setMessages(s.messages); }}>
                                    <div className="cb-session-icon"><IconChat /></div>
                                    <div className="cb-session-info">
                                        <div className="cb-session-title">{s.title}</div>
                                        <div className="cb-session-preview">{s.preview || "..."}</div>
                                    </div>
                                    <button className="cb-del-btn" onClick={e => delSession(s.id, e)}><IconTrash /></button>
                                </div>
                            ))
                        }
                    </div>
                </div>

                <div className="cb-main">
                    <div className="cb-header">
                        <div className="cb-header-left">
                            <button className="cb-toggle" onClick={() => setSidebar(v => !v)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                                </svg>
                            </button>
                            <div className="cb-header-title"><IconBrain />محلل النصوص العربية</div>
                        </div>
                        <span className="cb-header-badge">AI · NLP</span>
                    </div>

                    <div className="cb-window">
                        {messages.map((m, i) => <MessageRow key={i} msg={m}/>)}
                        {loading && (
                            <div className="cb-typing">
                                <div className="cb-dot"/><div className="cb-dot"/><div className="cb-dot"/>
                            </div>
                        )}
                        <div ref={endRef}/>
                    </div>

                    <div className="cb-input-area">
                        {pendingFile && (
                            <div className="cb-file-badge">
                                <span>📄</span>
                                <span className="cb-file-badge-name">{pendingFile.name}</span>
                                <button className="cb-file-badge-close" onClick={() => setPendingFile(null)}>✕</button>
                            </div>
                        )}
                        <div className="cb-input-row">
                            <label className="cb-upload-btn" title="رفع ملف">
                                <IconUpload/>
                                <input ref={fileRef} type="file" accept=".txt,.csv,.pdf" onChange={handleFileSelect} disabled={loading}/>
                            </label>
                            <input className="cb-input-box"
                                   value={input}
                                   onChange={e => setInput(e.target.value)}
                                   onKeyDown={onKey}
                                   placeholder={pendingFile ? "اضغط إرسال لتحليل الملف..." : "اكتب نصاً عربياً للتحليل..."}
                                   disabled={loading}
                            />
                            <button className="cb-send-btn" onClick={handleSend} disabled={loading || (!input.trim() && !pendingFile)}>
                                <span style={{ display:"flex", alignItems:"center" }}><IconSend/></span>
                                <span className="cb-btn-label">إرسال</span>
                            </button>
                        </div>
                        <div className="cb-input-hint">Enter للإرسال · يدعم txt, csv, pdf · النتائج تُحفظ في لوحة التحكم 📊</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chatbot;