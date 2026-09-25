import { ChatWidget } from '../../../widgets/chat-widget'

export function CitizenChatPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-0 sm:p-6">
      <div className="flex h-screen w-full flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/10 sm:h-[85vh] sm:max-w-2xl sm:rounded-[2rem]">
        <ChatWidget />
      </div>
    </div>
  )
}
