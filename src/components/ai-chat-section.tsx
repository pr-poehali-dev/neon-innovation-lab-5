import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Icon from "@/components/ui/icon"
import * as webllm from "@mlc-ai/web-llm"

type Message = {
  role: "user" | "assistant"
  content: string
}

const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC"

const SYSTEM_PROMPT = `Ты — умный и дружелюбный AI-ассистент SynapseAI. 
Ты помогаешь пользователям с любыми вопросами: от науки и технологий до кулинарии и советов по жизни.
Всегда отвечай на русском языке. Отвечай развёрнуто, но по делу — без лишней воды.
Используй структуру (списки, абзацы), когда это помогает восприятию.`

const SUGGESTIONS = [
  "Что такое нейроинтерфейсы?",
  "Как работает искусственный интеллект?",
  "Расскажи о технологиях будущего",
  "Напиши короткое стихотворение",
]

export function AIChatSection() {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadModel = async () => {
    setStatus("loading")
    setProgress(0)
    try {
      const newEngine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          setProgress(Math.round(report.progress * 100))
          setProgressText(report.text)
        },
      })
      setEngine(newEngine)
      setStatus("ready")
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (e) {
      console.error(e)
      setStatus("error")
    }
  }

  const sendMessage = async (text?: string) => {
    const query = (text ?? input).trim()
    if (!query || !engine || isGenerating) return

    const userMessage: Message = { role: "user", content: query }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsGenerating(true)

    const assistantPlaceholder: Message = { role: "assistant", content: "" }
    setMessages((prev) => [...prev, assistantPlaceholder])

    try {
      const chunks = await engine.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...newMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 512,
      })

      let reply = ""
      for await (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta?.content || ""
        reply += delta
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: "assistant", content: reply }
          return copy
        })
      }
    } catch (e) {
      console.error(e)
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Произошла ошибка при генерации. Попробуйте ещё раз.",
        }
        return copy
      })
    } finally {
      setIsGenerating(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const clearChat = () => {
    setMessages([])
    setInput("")
    inputRef.current?.focus()
  }

  return (
    <section id="ai-chat" className="py-24 px-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/8 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="bg-red-500/20 text-red-400 border border-red-500/30 mb-4 px-4 py-1">
            🧠 Работает в браузере · Без сервера · Приватно
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-sans">
            Живая нейросеть на сайте
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Настоящая языковая модель Llama 3.2 — загружается один раз в браузер и работает офлайн. Ваши данные никуда не уходят.
          </p>
        </div>

        <Card className="border border-red-500/20 bg-card/80 backdrop-blur overflow-hidden shadow-2xl shadow-red-500/5">
          {status !== "ready" ? (
            <div className="p-10 md:p-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 mb-8">
                <Icon name="BrainCircuit" size={40} className="text-red-500" />
              </div>

              {status === "idle" && (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Запустить нейросеть</h3>
                  <p className="text-muted-foreground mb-2 max-w-sm mx-auto">
                    Модель <span className="text-white font-medium">Llama 3.2 3B</span> загрузится прямо в браузер (~1.8 ГБ).
                  </p>
                  <p className="text-sm text-muted-foreground/70 mb-8 max-w-sm mx-auto">
                    После первой загрузки — работает мгновенно и без интернета. Требует Chrome или Edge.
                  </p>
                  <Button
                    size="lg"
                    onClick={loadModel}
                    className="bg-red-500 hover:bg-red-600 text-white border-0 text-lg px-10 py-6 rounded-xl shadow-lg shadow-red-500/25 transition-all hover:shadow-red-500/40 hover:scale-105"
                  >
                    <Icon name="Sparkles" size={20} className="mr-2" />
                    Запустить нейросеть
                  </Button>
                </>
              )}

              {status === "loading" && (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Загружаю модель...</h3>
                  <p className="text-muted-foreground mb-8 text-sm">Это займёт пару минут при первом запуске</p>
                  <div className="max-w-sm mx-auto">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="text-red-400 font-mono font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-red-600 to-red-400 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-3 truncate">{progressText || "Инициализация..."}</p>
                  </div>
                </>
              )}

              {status === "error" && (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Не удалось запустить</h3>
                  <p className="text-muted-foreground mb-2 max-w-sm mx-auto">
                    Нейросеть требует браузер с поддержкой <span className="text-white">WebGPU</span>.
                  </p>
                  <p className="text-sm text-muted-foreground/70 mb-8">Используйте Chrome или Edge последней версии.</p>
                  <Button
                    size="lg"
                    onClick={loadModel}
                    variant="outline"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Icon name="RefreshCw" size={16} className="mr-2" />
                    Попробовать снова
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-[560px]">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-muted-foreground font-medium">Llama 3.2 · Локально</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  <Icon name="Trash2" size={14} className="mr-1" />
                  Очистить
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-muted-foreground mb-1">Нейросеть готова к разговору</p>
                      <p className="text-sm text-muted-foreground/60">Выберите вопрос или напишите свой</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => sendMessage(s)}
                          className="text-left px-4 py-3 rounded-xl border border-border/60 hover:border-red-500/40 bg-muted/30 hover:bg-red-500/5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="BrainCircuit" size={14} className="text-red-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-red-500 text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.content ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <span className="flex gap-1 items-center py-1">
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name="User" size={14} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border/50 p-4">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Напишите вопрос..."
                    disabled={isGenerating}
                    className="flex-1 bg-muted/60 text-foreground rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 placeholder:text-muted-foreground/50 transition-all"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={isGenerating || !input.trim()}
                    className="bg-red-500 hover:bg-red-600 text-white border-0 px-4 rounded-xl h-auto disabled:opacity-40 transition-all"
                  >
                    <Icon
                      name={isGenerating ? "Loader2" : "SendHorizonal"}
                      size={18}
                      className={isGenerating ? "animate-spin" : ""}
                    />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}
