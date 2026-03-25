'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Send, Bot, User, Sparkles, AlertCircle, Tag, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function FeedbackButtons({ interactionId, initialFeedback = null }) {
  const [selected, setSelected] = useState(initialFeedback);

  const sendFeedback = async (value) => {
    if (selected) return;
    setSelected(value);
    try {
      await api.post(`/interactions/${interactionId}/feedback`, { feedback: value });
    } catch { /* silently ignore */ }
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">¿Útil?</span>
      <button
        onClick={() => sendFeedback('positive')}
        disabled={!!selected}
        title="Útil"
        className={`text-base leading-none transition-all disabled:cursor-default ${
          selected === 'positive' ? 'opacity-100 scale-110' : selected ? 'opacity-25' : 'opacity-50 hover:opacity-100 hover:scale-110'
        }`}
      >👍</button>
      <button
        onClick={() => sendFeedback('negative')}
        disabled={!!selected}
        title="No útil"
        className={`text-base leading-none transition-all disabled:cursor-default ${
          selected === 'negative' ? 'opacity-100 scale-110' : selected ? 'opacity-25' : 'opacity-50 hover:opacity-100 hover:scale-110'
        }`}
      >👎</button>
    </div>
  );
}

function SourcesBlock({ sources }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
      >
        <FileText className="w-3.5 h-3.5 mr-1" />
        Fuentes consultadas ({sources.length})
        {open ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, idx) => (
            <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-3">
              <div className="flex items-center text-xs font-semibold text-blue-700 dark:text-blue-400">
                <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span>[Fuente {idx + 1}] {src.title}</span>
                {src.page && (
                  <span className="ml-2 bg-blue-100 dark:bg-blue-800/50 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px]">
                    Pág. {src.page}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
                {src.preview}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (!sessionId) return;
    setHistoryLoading(true);
    api.get(`/interactions?session_id=${sessionId}`)
      .then(res => {
        const history = res.data.slice().reverse();
        const msgs = [];
        history.forEach((item) => {
          msgs.push({ id: `hist-user-${item.id}`, text: item.query, sender: 'user', time: new Date(item.created_at), isHistory: true });
          msgs.push({ id: `hist-bot-${item.id}`, text: item.response, sender: 'bot', time: new Date(item.created_at), interactionId: item.id, sources: [], isHistory: true, initialFeedback: item.feedback });
        });
        setMessages(msgs);
      })
      .finally(() => setHistoryLoading(false));
  }, [sessionId]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/chat/suggestions')
      .then(res => setSuggestedQuestions(res.data.map(s => s.query)))
      .catch(() => {});
  }, []);

  const handleSend = async (e, text = null, advanced = false) => {
    if (e) e.preventDefault();
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    const userMessage = { id: Date.now(), text: messageText, sender: 'user', time: new Date() };
    const botMsgId = Date.now() + 1;
    const botPlaceholder = { id: botMsgId, text: '', sender: 'bot', time: new Date(), isStreaming: true, sources: [], interactionId: null, isAdvanced: advanced };

    setMessages(prev => [...prev, userMessage, botPlaceholder]);
    setInput('');
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const categoryIds = selectedCategory === 'all' ? [] : [selectedCategory];
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          question: messageText,
          category_ids: categoryIds,
          ...(advanced ? { advanced: true } : {}),
          ...(sessionId ? { session_id: parseInt(sessionId) } : {}),
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') {
            setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, isStreaming: false } : msg));
            break;
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.chunk !== undefined) {
              setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: msg.text + parsed.chunk } : msg));
            } else if (parsed.sources !== undefined) {
              setMessages(prev => prev.map(msg => msg.id === botMsgId ? {
                ...msg,
                sources: parsed.sources,
                interactionId: parsed.interaction_id,
                detectedCategory: parsed.detected_category ?? null,
              } : msg));
            }
          } catch { /* malformed line */ }
        }
      }
    } catch {
      setMessages(prev => prev.map(msg =>
        msg.id === botMsgId
          ? { ...msg, text: 'Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.', isError: true, isStreaming: false }
          : msg
      ));
    } finally {
      setLoading(false);
      setMessages(prev => prev.map(msg => msg.id === botMsgId && msg.isStreaming ? { ...msg, isStreaming: false } : msg));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Selector de Categoría */}
      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
          <Tag className="w-4 h-4" />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {historyLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">Cargando conversación...</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Hola, soy tu asistente técnico</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">¿En qué puedo ayudarte hoy? Selecciona una categoría o haz una pregunta directamente.</p>
              </div>
              {suggestedQuestions.length > 0 && (
                <div className="grid grid-cols-1 gap-2 w-full">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(null, q)}
                      className="text-left p-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white ml-3'
                      : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 mr-3 border border-gray-100 dark:border-gray-600'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none'
                    }`}>
                      {msg.sender === 'bot' ? (
                        <div className="prose-chat text-sm leading-relaxed">
                          {msg.isAdvanced && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full mb-2">
                              ⚡ Sonnet
                            </span>
                          )}
                          {msg.isStreaming && !msg.text ? (
                            <div className="flex items-center gap-1 py-0.5">
                              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                              {msg.isStreaming && (
                                <span className="inline-block w-0.5 h-3.5 bg-gray-500 dark:bg-gray-400 ml-0.5 align-middle animate-pulse" />
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      )}
                      <p className={`text-[10px] mt-2 opacity-60 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {msg.sender === 'bot' && msg.interactionId && (
                      <FeedbackButtons interactionId={msg.interactionId} initialFeedback={msg.initialFeedback ?? null} />
                    )}
                    {msg.sender === 'bot' && msg.detectedCategory && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <Tag className="w-3 h-3" />
                        Categoría detectada: {msg.detectedCategory}
                      </span>
                    )}
                    {msg.sender === 'bot' && msg.sources?.length > 0 && (
                      <SourcesBlock sources={msg.sources} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Escribe tu consulta técnica aquí..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            />
            <button
              type="button"
              onClick={() => handleSend(null, null, true)}
              disabled={!input.trim() || loading}
              title="Respuesta avanzada con Sonnet"
              className="flex-shrink-0 px-3 py-2.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-xl hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              ⚡ Avanzada
            </button>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex-shrink-0 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center flex items-center justify-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            Las respuestas son generadas por IA basadas en manuales oficiales. Verifique siempre la seguridad eléctrica.
          </p>
        </div>
      </div>
    </div>
  );
}
