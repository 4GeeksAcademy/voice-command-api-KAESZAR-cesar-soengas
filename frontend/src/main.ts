import './style.css'

type SupportedMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type MessageRole = 'assistant' | 'user' | 'error'

interface InstructionResponse {
  endpoint: string
  method: SupportedMethod
  params: Record<string, unknown>
}

interface InstructionFlowResult {
  transcription: string
  instruction: InstructionResponse
  result: unknown
}

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

interface ChatMessage {
  id: number
  role: MessageRole
  heading: string
  body: string
  instruction?: InstructionResponse | null
  response?: unknown
  timestamp: string
}

interface AppState {
  transcription: string
  microphoneState: string
  isRecording: boolean
  isLoading: boolean
  supportsSpeechRecognition: boolean
  manualFallbackEnabled: boolean
  chat: ChatMessage[]
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '')
const REQUEST_TIMEOUT_MS = 45000
const speechRecognitionWindow = window as SpeechRecognitionWindow
const SpeechRecognitionConstructor =
  speechRecognitionWindow.SpeechRecognition ?? speechRecognitionWindow.webkitSpeechRecognition
const supportsSpeechRecognition = Boolean(SpeechRecognitionConstructor)

const state: AppState = {
  transcription: '',
  microphoneState: supportsSpeechRecognition
    ? 'Press the button and speak your task command.'
    : 'Speech recognition is unavailable in this browser. Use manual transcription.',
  isRecording: false,
  isLoading: false,
  supportsSpeechRecognition,
  manualFallbackEnabled: !supportsSpeechRecognition,
  chat: [
    {
      id: Date.now(),
      role: 'assistant',
      heading: 'Voice Task Assistant',
      body: 'Speak a command on the right. Your browser transcribes it, then the backend routes it to the task API.',
      timestamp: formatTime(),
    },
  ],
}

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App root not found')
}

app.innerHTML = `
  <main class="app-shell">
    <section class="workspace">
      <section class="chat-column panel">
        <header class="section-header">
          <div>
            <span class="section-kicker">Conversation</span>
            <h1>API chat transcript</h1>
          </div>
          <p>The assistant logs the transcription returned by the backend and the final task response for each command.</p>
        </header>
        <div id="chat-thread" class="chat-thread"></div>
      </section>

      <aside class="voice-column panel">
        <header class="section-header compact">
          <div>
            <span class="section-kicker">Recorder</span>
            <h2>Voice command</h2>
          </div>
          <p class="status-copy" id="microphone-state"></p>
        </header>

        <div class="listen-stage">
          <div class="pulse-ring" id="pulse-ring">
            <div class="pulse-core"></div>
          </div>
          <div class="listen-copy">
            <span class="section-kicker">Live status</span>
            <h3 id="listening-chip"></h3>
            <p>
              Speech is transcribed in your browser. The resulting text is sent to the backend for task routing.
            </p>
          </div>
        </div>

        <label class="field-label" for="transcribe-lang">Speech recognition language</label>
        <select id="transcribe-lang" class="transcribe-lang-select" aria-label="Speech recognition language">
          <option value="">Auto-detect</option>
          <option value="es">Español</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="pt">Português</option>
          <option value="de">Deutsch</option>
          <option value="it">Italiano</option>
        </select>

        <div class="actions-row">
          <button id="listen-toggle" class="primary-button" type="button"></button>
        </div>

        <section id="manual-fallback" class="manual-panel" hidden>
          <label class="field-label" for="transcription-input">Manual transcription</label>
          <textarea
            id="transcription-input"
            name="transcription-input"
            rows="5"
            placeholder="Type a command such as: add buy groceries to my list"
          ></textarea>
          <button id="run-manual" class="secondary-button" type="button">Send manual transcription</button>
        </section>
      </aside>
    </section>
  </main>
`

const listenToggleButton = mustQuery<HTMLButtonElement>('#listen-toggle')
const transcribeLangSelect = mustQuery<HTMLSelectElement>('#transcribe-lang')
const manualFallbackPanel = mustQuery<HTMLElement>('#manual-fallback')
const runManualButton = mustQuery<HTMLButtonElement>('#run-manual')
const transcriptionInput = mustQuery<HTMLTextAreaElement>('#transcription-input')
const microphoneState = mustQuery<HTMLParagraphElement>('#microphone-state')
const listeningChip = mustQuery<HTMLHeadingElement>('#listening-chip')
const pulseRing = mustQuery<HTMLDivElement>('#pulse-ring')
const chatThread = mustQuery<HTMLDivElement>('#chat-thread')

let speechRecognition: SpeechRecognitionLike | null = null

listenToggleButton.addEventListener('click', async () => {
  if (!SpeechRecognitionConstructor) {
    state.manualFallbackEnabled = true
    state.microphoneState = 'Speech recognition is unavailable. Use manual transcription.'
    render()
    return
  }

  if (state.isRecording) {
    speechRecognition?.stop()
    return
  }

  state.transcription = ''
  render()
  startSpeechRecognition()
})

runManualButton.addEventListener('click', async () => {
  await submitManualTranscription(transcriptionInput.value)
})

transcriptionInput.addEventListener('input', () => {
  state.transcription = transcriptionInput.value
})

render()

function startSpeechRecognition(): void {
  if (!SpeechRecognitionConstructor) return

  try {
    const recognition = new SpeechRecognitionConstructor()
    speechRecognition = recognition
    recognition.lang = transcribeLangSelect.value || navigator.language || 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => {
      state.isRecording = true
      state.microphoneState = 'Listening. Speak your task command now.'
      render()
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (!result) continue
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? ''
        } else {
          interimTranscript += result[0]?.transcript ?? ''
        }
      }

      if (finalTranscript.trim()) {
        state.transcription = `${state.transcription} ${finalTranscript}`.trim()
      } else if (interimTranscript.trim()) {
        transcriptionInput.value = `${state.transcription} ${interimTranscript}`.trim()
      }
      render()
    }

    recognition.onerror = (event) => {
      state.isRecording = false
      speechRecognition = null
      state.microphoneState = `Speech recognition error: ${event.error}. You can try again or enter the transcription manually.`
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        state.manualFallbackEnabled = true
      }
      render()
    }

    recognition.onend = async () => {
      state.isRecording = false
      speechRecognition = null
      const transcription = state.transcription.trim()
      if (!transcription) {
        state.microphoneState = 'No speech was recognized. Try again or enter a transcription manually.'
        render()
        return
      }

      await processTranscription(transcription)
    }

    recognition.start()
  } catch (error) {
    state.isRecording = false
    speechRecognition = null
    state.manualFallbackEnabled = true
    state.microphoneState = toErrorMessage(error)
    render()
  }
}

async function processTranscription(transcription: string): Promise<void> {
  try {
    state.isLoading = true
    state.microphoneState = 'Sending transcription for routing and task execution...'
    render()

    const payload = await runInstructionFlow(transcription)
    state.transcription = payload.transcription
    appendUserAndAssistantMessages(payload.transcription, payload.instruction, payload.result)
    state.microphoneState = 'Command completed successfully.'
  } catch (error) {
    registerFailure(toErrorMessage(error))
  } finally {
    state.isLoading = false
    render()
  }
}

async function submitManualTranscription(rawValue: string): Promise<void> {
  const transcription = rawValue.trim()

  if (!transcription) {
    appendMessage({
      role: 'error',
      heading: 'Manual transcription',
      body: 'Type a command before sending it.',
    })
    render()
    return
  }

  try {
    await processTranscription(transcription)
  } finally {
    transcriptionInput.value = ''
  }
}

function registerFailure(message: string): void {
  state.isRecording = false
  speechRecognition = null
  state.isLoading = false
  state.microphoneState = 'The command failed. You can try again or enter the transcription manually.'

  appendMessage({
    role: 'error',
    heading: 'Voice flow failed',
    body: message,
  })
  render()
}

async function runInstructionFlow(transcription: string): Promise<InstructionFlowResult> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/instruction`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcription }),
    },
    REQUEST_TIMEOUT_MS,
    'Instruction routing took too long. Check the backend server and Groq integration.',
  )

  if (!response.ok) {
    throw new Error(`Instruction routing failed (${response.status}): ${stringifyData(await safeReadJson(response))}`)
  }

  const instruction = validateInstructionResponse(await safeReadJson(response))
  const result = await executeTaskInstruction(instruction)

  return { transcription: transcription.trim(), instruction, result }
}

function validateInstructionResponse(data: unknown): InstructionResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('The /instruction endpoint did not return a valid JSON object.')
  }

  const instruction = data as Partial<InstructionResponse>
  if (
    typeof instruction.endpoint !== 'string' ||
    typeof instruction.method !== 'string' ||
    !instruction.params ||
    typeof instruction.params !== 'object' ||
    Array.isArray(instruction.params)
  ) {
    throw new Error('The /instruction response returned an invalid instruction payload.')
  }

  return {
    endpoint: instruction.endpoint,
    method: instruction.method.toUpperCase() as SupportedMethod,
    params: instruction.params,
  }
}

async function executeTaskInstruction(instruction: InstructionResponse): Promise<unknown> {
  const method = instruction.method
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    throw new Error(`Unsupported task API method: ${method}`)
  }

  const rawTaskId = instruction.params.task_id
  let endpoint = instruction.endpoint
  if (endpoint.includes('{task_id}')) {
    if (typeof rawTaskId !== 'number' || !Number.isInteger(rawTaskId) || rawTaskId < 1) {
      throw new Error('The routed task operation is missing a valid task_id.')
    }
    endpoint = endpoint.replace('{task_id}', String(rawTaskId))
  }

  if (endpoint !== '/tasks' && !/^\/tasks\/\d+$/.test(endpoint)) {
    throw new Error(`Unsupported task API endpoint: ${endpoint}`)
  }

  const params = { ...instruction.params }
  delete params.task_id
  const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH'
  const response = await fetchWithTimeout(
    `${API_BASE_URL}${endpoint}`,
    {
      method,
      ...(hasBody
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          }
        : {}),
    },
    REQUEST_TIMEOUT_MS,
    'Task request took too long. Check the backend server.',
  )
  const result = await safeReadJson(response)

  if (!response.ok) {
    throw new Error(`Task request failed (${response.status}): ${stringifyData(result)}`)
  }

  return result
}

function appendUserAndAssistantMessages(
  transcription: string,
  _instruction: InstructionResponse,
  result: unknown,
): void {
  appendMessage({
    role: 'user',
    heading: 'You',
    body: transcription,
  })

  appendMessage({
    role: 'assistant',
    heading: 'API response',
    body: `Routing: ${_instruction.method} ${_instruction.endpoint}. The frontend called the matching task endpoint.`,
    instruction: _instruction,
    response: result,
  })
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(timeoutMessage)
    }

    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

async function safeReadJson(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`The server returned non-JSON content: ${text}`)
  }
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error('Missing VITE_API_BASE_URL. Add it to frontend/.env.')
  }

  return trimmed.replace(/\/+$/, '')
}

function stringifyData(data: unknown): string {
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}

function appendMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): void {
  state.chat = [
    ...state.chat,
    {
      ...message,
      id: Date.now() + state.chat.length,
      timestamp: formatTime(),
    },
  ]
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred.'
}

function render(): void {
  listeningChip.textContent = state.isLoading ? 'Working...' : state.isRecording ? 'Recording' : 'Stand by'
  listenToggleButton.textContent = state.isRecording ? 'Stop listening' : 'Speak a command'
  listenToggleButton.disabled = !state.supportsSpeechRecognition || state.isLoading
  transcribeLangSelect.disabled = state.isLoading || state.isRecording
  runManualButton.disabled = state.isLoading
  transcriptionInput.disabled = state.isLoading
  manualFallbackPanel.hidden = !state.manualFallbackEnabled

  pulseRing.dataset.active = state.isRecording ? 'true' : 'false'
  pulseRing.dataset.blocked = state.supportsSpeechRecognition ? 'false' : 'true'

  transcriptionInput.value = state.transcription
  microphoneState.textContent = state.microphoneState
  chatThread.innerHTML = state.chat.map(renderMessage).join('')
  chatThread.scrollTop = chatThread.scrollHeight
}

function renderMessage(message: ChatMessage): string {
  const hasResponse = typeof message.response !== 'undefined'

  return `
    <article class="message-row ${message.role}">
      <div class="message-bubble">
        <div class="message-meta">
          <span>${escapeHtml(message.heading)}</span>
          <span>${escapeHtml(message.timestamp)}</span>
        </div>
        <p class="message-body">${escapeHtml(message.body)}</p>
        ${
          hasResponse
            ? `
              <div class="message-block">
                <span class="message-label">Final API response</span>
                <pre>${escapeHtml(JSON.stringify(message.response, null, 2))}</pre>
              </div>
            `
            : ''
        }
      </div>
    </article>
  `
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function mustQuery<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing required element: ${selector}`)
  return element
}
