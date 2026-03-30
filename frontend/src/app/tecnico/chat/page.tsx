'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Send, Bot, User, Sparkles, AlertCircle, Tag,
  FileText, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import {
  streamChat, sendFeedback as apiFeedback, getHistory, getSuggestions,
  type ChatSource,
} from '@/lib/api/chat'
import { getCategories, type Category } from '@/lib/api/categories'

// ── Tipos de mensaje ──────────────────────────────────────────────────────────

interface UserMessage {
  id:         number
  sender:     'user'
  text:       string
  time:       Date
  isHistory?: boolean
}

interface BotMessage {
  id:               number
  sender:           'bot'
  text:             string
  time:             Date
  isStreaming?:     boolean
  isError?:         boolean
  isAdvanced?:      boolean
  isHistory?:       boolean
  sources:          ChatSource[]
  interactionId:    number | null
  detectedCategory: string | null
  initialFeedback?: string | null
}

type ChatMessage = UserMessage | BotMessage

function isBot(msg: ChatMessage): msg is BotMessage {
  return msg.sender === 'bot'
}

// ── FeedbackButtons ───────────────────────────────────────────────────────────

function FeedbackButtons({
  interactionId,
  initialFeedback = null,
}: {
  interactionId:  number
  initialFeedback?: string | null
}) {
  const [selected, setSelected] = useState<string | null>(initialFeedback)

  const handleFeedback = async (value: 'positive' | 'negative') => {
    if (selected) return
    setSelected(value)
    await apiFeedback(interactionId, value)
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">¿Útil?</span>
      <button
        onClick={() => handleFeedback('positive')}
        disabled={!!selected}
        title="Útil"
        className={`text-base leading-none transition-all disabled:cursor-default ${
          selected === 'positive'
            ? 'opacity-100 scale-110'
            : selected
            ? 'opacity-25'
            : 'opacity-50 hover:opacity-100 hover:scale-110'
        }`}
      >👍</button>
      <button
        onClick={() => handleFeedback('negative')}
        disabled={!!selected}
        title="No útil"
        className={`text-base leading-none transition-all disabled:cursor-default ${
          selected === 'negative'
            ? 'opacity-100 scale-110'
            : selected
            ? 'opacity-25'
            : 'opacity-50 hover:opacity-100 hover:scale-110'
        }`}
      >👎</button>
    </div>
  )
}

// ── SourcesBlock ──────────────────────────────────────────────────────────────

function SourcesBlock({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
      >
        <FileText className="w-3.5 h-3.5 mr-1" />
        Fuentes consultadas ({sources.length})
        {open
          ? <ChevronUp   className="w-3.5 h-3.5 ml-1" />
          : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-3"
            >
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
  )
}

// ── TypingIndicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

// ── ChatContent ───────────────────────────────────────────────────────────────
// Separado en subcomponente para envolver useSearchParams en Suspense

function ChatContent() {
  const searchParams   = useSearchParams()
  const urlSessionId   = searchParams.get('session')

  // activeSessionId: arranca desde la URL (historial) o se rellena con el
  // session_id que devuelve el backend en el primer mensaje de una conversación nueva.
  const [activeSessionId, setActiveSessionId] = useState<number | null>(
    urlSessionId ? parseInt(urlSessionId, 10) : null,
  )

  const [messages, setMessages]           = useState<ChatMessage[]>([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [categories, setCategories]       = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [suggestions, setSuggestions]     = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => { scrollToBottom() }, [messages])

  // Cargar historial si hay session en URL
  useEffect(() => {
    if (!urlSessionId) return
    setHistoryLoading(true)
    getHistory(urlSessionId)
      .then(result => {
        if (!result.success) return
        const history = [...result.data!].reverse()
        const msgs: ChatMessage[] = []
        history.forEach(item => {
          msgs.push({
            id:        Date.now() + Math.random(),
            sender:    'user',
            text:      item.query,
            time:      new Date(item.created_at),
            isHistory: true,
          })
          msgs.push({
            id:               Date.now() + Math.random(),
            sender:           'bot',
            text:             item.response,
            time:             new Date(item.created_at),
            interactionId:    item.id,
            sources:          [],
            detectedCategory: null,
            isHistory:        true,
            initialFeedback:  item.feedback,
          })
        })
        setMessages(msgs)
      })
      .finally(() => setHistoryLoading(false))
  }, [urlSessionId])

  // Cargar categorías
  useEffect(() => {
    getCategories({ per_page: 100 })
      .then(r => { if (r.success) setCategories(r.data!.items) })
      .catch(() => {})
  }, [])

  // Cargar sugerencias
  useEffect(() => {
    getSuggestions().then(setSuggestions).catch(() => {})
  }, [])

  // ── handleSend ──────────────────────────────────────────────────────────────

  const handleSend = async (
    e:        React.FormEvent | null,
    text:     string | null = null,
    advanced  = false,
  ) => {
    if (e) e.preventDefault()
    const messageText = text ?? input
    if (!messageText.trim() || loading) return

    const now       = Date.now()
    const botMsgId  = now + 1

    const userMsg: UserMessage = {
      id:     now,
      sender: 'user',
      text:   messageText,
      time:   new Date(),
    }

    const botPlaceholder: BotMessage = {
      id:               botMsgId,
      sender:           'bot',
      text:             '',
      time:             new Date(),
      isStreaming:      true,
      isAdvanced:       advanced,
      sources:          [],
      interactionId:    null,
      detectedCategory: null,
    }

    setMessages(prev => [...prev, userMsg, botPlaceholder])
    setInput('')
    setLoading(true)

    try {
      const categoryIds = selectedCategory === 'all' ? [] : [selectedCategory]

      await streamChat(
        {
          question:   messageText,
          categoryIds,
          advanced,
          sessionId:  activeSessionId,
        },
        {
          onChunk: chunk => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === botMsgId
                  ? { ...msg, text: msg.text + chunk }
                  : msg,
              ),
            )
          },
          onMeta: (sources, interactionId, detectedCategory, newSessionId) => {
            if (newSessionId != null) setActiveSessionId(newSessionId)
            setMessages(prev =>
              prev.map(msg =>
                msg.id === botMsgId
                  ? { ...msg, sources, interactionId, detectedCategory }
                  : msg,
              ),
            )
          },
          onDone: () => {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === botMsgId
                  ? { ...msg, isStreaming: false }
                  : msg,
              ),
            )
          },
        },
      )
    } catch {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === botMsgId
            ? {
                ...msg,
                text:        'Lo siento, ha ocurrido un error al procesar tu consulta. Por favor, intenta de nuevo.',
                isError:     true,
                isStreaming: false,
              }
            : msg,
        ),
      )
    } finally {
      setLoading(false)
      // Asegurar que isStreaming quede en false aunque no llegue [DONE]
      setMessages(prev =>
        prev.map(msg =>
          msg.id === botMsgId && (msg as BotMessage).isStreaming
            ? { ...msg, isStreaming: false }
            : msg,
        ),
      )
      inputRef.current?.focus()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-4">

      {/* Selector de categoría */}
      <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-x-auto no-scrollbar">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400 flex-shrink-0">
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

      {/* Área de chat */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {historyLoading ? (
            <div className="h-full flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Cargando conversación...
            </div>
          ) : messages.length === 0 ? (
            // Estado vacío con sugerencias
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Hola, soy tu asistente técnico
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  ¿En qué puedo ayudarte hoy? Selecciona una categoría o haz una pregunta directamente.
                </p>
              </div>
              {suggestions.length > 0 && (
                <div className="grid grid-cols-1 gap-2 w-full">
                  {suggestions.map((q, idx) => (
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
            messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white ml-3'
                      : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 mr-3 border border-gray-100 dark:border-gray-600'
                  }`}>
                    {msg.sender === 'user'
                      ? <User className="w-5 h-5" />
                      : <Bot  className="w-5 h-5" />}
                  </div>

                  <div className="flex flex-col">
                    {/* Burbuja */}
                    <div className={`p-4 rounded-2xl shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none'
                    }`}>
                      {isBot(msg) ? (
                        <div className="prose-chat text-sm leading-relaxed">
                          {msg.isAdvanced && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full mb-2">
                              ⚡ Sonnet
                            </span>
                          )}
                          {msg.isStreaming && !msg.text ? (
                            <TypingIndicator />
                          ) : (
                            <>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.text}
                              </ReactMarkdown>
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

                    {/* Feedback + categoría detectada + fuentes (solo bots con interactionId) */}
                    {isBot(msg) && msg.interactionId != null && (
                      <FeedbackButtons
                        interactionId={msg.interactionId}
                        initialFeedback={msg.initialFeedback}
                      />
                    )}
                    {isBot(msg) && msg.detectedCategory && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <Tag className="w-3 h-3" />
                        Categoría detectada: {msg.detectedCategory}
                      </span>
                    )}
                    {isBot(msg) && msg.sources.length > 0 && (
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
              ref={inputRef}
              type="text"
              placeholder="Escribe tu consulta técnica aquí..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all disabled:opacity-60"
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
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Send className="w-5 h-5" />}
            </button>
          </form>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Las respuestas son generadas por IA basadas en manuales oficiales. Verifique siempre la seguridad eléctrica.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Page (con Suspense para useSearchParams) ──────────────────────────────────

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
