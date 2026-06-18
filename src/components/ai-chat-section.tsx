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

const MODEL_ID = "Llama-3.2-1B-Instruct-q4f32_1-MLC"

export function AIChatSection() {
  const [engine, setEngine] = useState<webllm.MLCEngine | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState("")
  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Привет! Я нейросеть SynapseAI, работающая прямо в вашем браузере. Задайте любой вопрос.",
    },
  ])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadModel = async () => {
    setStatus("loading")
    try {
      const newEngine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          setProgress(Math.round(report.progress * 100))
          setProgressText(report.text)
        },
      })
      setEngine(newEngine)
      setStatus("ready")
    } catch (e) {
      console.error(e)
      setStatus("error")
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !engine || isGenerating) return

    const userMessage: Message = { role: "user", content: input.trim() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput("")
    setIsGenerating(true)

    try {
      const chunks = await engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Ты — дружелюбный AI-ассистент SynapseAI. Отвечай кратко, полезно и на русском языке.",
          },
          ...newMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        temperature: 0.7,
      })

      let reply = ""
      setMessages((prev) => [...prev, { role: "assistant", content: "" }])
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Произошла ошибка. Попробуйте ещё раз." },
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section id="ai-chat" className="py-24 px-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-red-500/5 pointer-events-none" />
      <div className="max-w-4xl mx-auto relative">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="bg-accent text-accent-foreground mb-4">
            Локальная нейросеть
          </Badge>
          <h2 className="text-4xl font-bold text-foreground mb-4 font-sans">Задайте вопрос нейросети</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Настоящая языковая модель, работающая прямо в вашем браузере. Без серверов и без отправки данных наружу.
          </p>
        </div>

        <Card className="glow-border overflow-hidden">
          {status !== "ready" ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
                <Icon name="BrainCircuit" size={32} className="text-red-500" />
              </div>

              {status === "idle" && (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Запустить нейросеть</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    При первом запуске модель загрузится в браузер (~800 МБ). Дальше всё работает мгновенно и офлайн.
                  </p>
                  <Button
                    size="lg"
                    onClick={loadModel}
                    className="bg-red-500 hover:bg-red-600 text-white border-0 text-lg px-8"
                  >
                    <Icon name="Sparkles" size={20} className="mr-2" />
                    Запустить
                  </Button>
                </>
              )}

              {status === "loading" && (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Загрузка модели...</h3>
                  <div className="max-w-md mx-auto">
                    <div className="w-full bg-muted rounded-full h-2 mb-3 overflow-hidden">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{progressText || "Подготовка..."}</p>
                  </div>
                </>
              )}

              {status === "error" && (
                <>
                  <h3 className="text-2xl font-bold text-foreground mb-3">Не удалось запустить</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Нейросеть требует браузер с поддержкой WebGPU (Chrome или Edge последней версии).
                  </p>
                  <Button size="lg" onClick={loadModel} variant="outline" className="border-red-500 text-red-500">
                    Попробовать снова
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-red-500 text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.content || (isGenerating && i === messages.length - 1 ? "..." : "")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border p-4 flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Спросите что-нибудь..."
                  disabled={isGenerating}
                  className="flex-1 bg-muted text-foreground rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                />
                <Button
                  onClick={sendMessage}
                  disabled={isGenerating || !input.trim()}
                  className="bg-red-500 hover:bg-red-600 text-white border-0 px-5"
                >
                  <Icon name={isGenerating ? "Loader2" : "Send"} size={20} className={isGenerating ? "animate-spin" : ""} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}
