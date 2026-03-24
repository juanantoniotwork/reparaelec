'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { Send, Bot, User, Sparkles, AlertCircle, Loader2, Tag, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function FeedbackButtons({ interactionId, initialFeedback = null }) {
  const [selected, setSelected] = useState(initialFeedback);

  const sendFeedback = async (value) => {
    if (selected) return;
    setSelected(value);
    try {
      await api.post(`/interactions/${interactionId}/feedback`, { feedback: value });
    } catch {
      // silently ignore
    }
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[10px] text-gray-400 mr-1">¿Útil?</span>
      <button
        onClick={() => sendFeedback('positive')}
        disabled={!!selected}
        title="Útil"
        className={`text-base leading-none transition-all disabled:cursor-default ${
          selected === 'positive'
            ? 'opacity-100 scale-110'
            : selected
            ? 'opacity-25'
            : 'opacity-50 hover:opacity-100 hover:scale-110'
        }`}
      >
        👍
      </button>
      <button
        onClick={() => sendFeedback('negative')}
        disabled={!!selected}
        title="No útil"
        className={`text-base leading-none transition-all disabled:cursor-default ${
          selected === 'negative'
            ? 'opacity-100 scale-110'
            : selected
            ? 'opacity-25'
            : 'opacity-50 hover:opacity-100 hover:scale-110'
        }`}
      >
        👎
      </button>
    </div>
  );
}

function SourcesBlock({ sources }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
      >
        <FileText className="w-3.5 h-3.5 mr-1" />
        Fuentes consultadas ({sources.length})
        {open ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, idx) => (
            <div key={idx} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-center text-xs font-semibold text-blue-700">
                <FileText className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span>[Fuente {idx + 1}] {src.title}</span>
                {src.page && (
                  <span className="ml-2 bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">
                    Pág. {src.page}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!sessionId) return;
    setHistoryLoading(true);
    api.get(`/interactions?session_id=${sessionId}`)
      .then(res => {
        const history = res.data.slice().reverse(); // API returns desc, we need asc
        const msgs = [];
        history.forEach((item) => {
          msgs.push({
            id: `hist-user-${item.id}`,
            text: item.query,
            sender: 'user',
            time: new Date(item.created_at),
            isHistory: true,
          });
          msgs.push({
            id: `hist-bot-${item.id}`,
            text: item.response,
            sender: 'bot',
            time: new Date(item.created_at),
            interactionId: item.id,
            sources: [],
            isHistory: true,
            initialFeedback: item.feedback,
          });
        });
        setMessages(msgs);
      })
      .finally(() => setHistoryLoading(false));
  }, [sessionId]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        console.log('[Chat] Categorías cargadas:', res.data);
        setCategories(res.data);
      } catch (err) {
        console.error('[Chat] Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await api.get('/chat/suggestions');
        setSuggestedQuestions(res.data.map(s => s.query));
      } catch {
        // silently ignore
      }
    };
    fetchSuggestions();
  }, []);

  const handleCategorySelect = (catId) => {
    console.log('[Chat] Categoría seleccionada:', catId);
    setSelectedCategory(catId);
  };

  const handleSend = async (e, text = null, advanced = false) => {
    if (e) e.preventDefault();
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    const userMessage = { id: Date.now(), text: messageText, sender: 'user', time: new Date() };
    const botMsgId = Date.now() + 1;
    const botPlaceholder = {
      id: botMsgId,
      text: '',
      sender: 'bot',
      time: new Date(),
      isStreaming: true,
      sources: [],
      interactionId: null,
      isAdvanced: advanced,
    };

    setMessages(prev => [...prev, userMessage, botPlaceholder]);
    setInput('');
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const categoryIds = selectedCategory === 'all' ? [] : [selectedCategory];
      console.log('[Chat] Enviando petición — category_ids:', categoryIds, '| selectedCategory:', selectedCategory);
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
        buffer = lines.pop(); // guardar línea incompleta

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);

          if (raw === '[DONE]') {
            setMessages(prev => prev.map(msg =>
              msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
            ));
            break;
          }

          try {
            const parsed = JSON.parse(raw);
            if (parsed.chunk !== undefined) {
              setMessages(prev => prev.map(msg =>
                msg.id === botMsgId ? { ...msg, text: msg.text + parsed.chunk } : msg
              ));
            } else if (parsed.sources !== undefined) {
              setMessages(prev => prev.map(msg =>
                msg.id === botMsgId
                  ? { ...msg, sources: parsed.sources, interactionId: parsed.interaction_id }
                  : msg
              ));
            }
          } catch { /* línea malformada, ignorar */ }
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(msg =>
        msg.id === botMsgId
          ? { ...msg, text: "Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.", isError: true, isStreaming: false }
          : msg
      ));
    } finally {
      setLoading(false);
      // Asegurar que isStreaming quede en false si el stream terminó sin [DONE]
      setMessages(prev => prev.map(msg =>
        msg.id === botMsgId && msg.isStreaming ? { ...msg, isStreaming: false } : msg
      ));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Selector de Categoría */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
          <Tag className="w-4 h-4" />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handleCategorySelect('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {historyLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">Cargando conversación...</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
              <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center text-blue-600 mb-2">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Hola, soy tu asistente técnico</h3>
                <p className="text-gray-500 mt-2">¿En qué puedo ayudarte hoy? Selecciona una categoría o haz una pregunta directamente.</p>
              </div>
              {suggestedQuestions.length > 0 && (
                <div className="grid grid-cols-1 gap-2 w-full">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(null, q)}
                      className="text-left p-3 text-sm text-gray-600 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all border border-transparent hover:border-blue-100"
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
                    msg.sender === 'user' ? 'bg-blue-600 text-white ml-3' : 'bg-white text-blue-600 mr-3 border border-gray-100'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className="flex flex-col">
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      {msg.sender === 'bot' ? (
                        <div className="prose-chat text-sm leading-relaxed">
                          {msg.isAdvanced && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mb-2">
                              ⚡ Sonnet
                            </span>
                          )}
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                          {msg.isStreaming && (
                            <span className="inline-block w-0.5 h-3.5 bg-gray-500 ml-0.5 align-middle animate-pulse" />
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
                    {msg.sender === 'bot' && msg.sources?.length > 0 && (
                      <SourcesBlock sources={msg.sources} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {loading && !messages.some(m => m.isStreaming) && (
            <div className="flex justify-start">
               <div className="flex max-w-[80%] flex-row">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-white text-blue-600 mr-3 border border-gray-100 shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                  <div className="p-4 rounded-2xl shadow-sm bg-gray-50 text-gray-400 rounded-tl-none border border-gray-100">
                    <p className="text-sm italic">Escribiendo...</p>
                  </div>
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input de Mensaje */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Escribe tu consulta técnica aquí..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            />
            <button
              type="button"
              onClick={() => handleSend(null, null, true)}
              disabled={!input.trim() || loading}
              title="Respuesta avanzada con Sonnet"
              className="flex-shrink-0 px-3 py-2.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
          <p className="text-[10px] text-gray-400 mt-2 text-center flex items-center justify-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            Las respuestas son generadas por IA basadas en manuales oficiales. Verifique siempre la seguridad eléctrica.
          </p>
        </div>
      </div>
    </div>
  );
}
