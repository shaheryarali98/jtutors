import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { MessageCircle, Send, ArrowLeft, Search } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../lib/api'
import { resolveImageUrl } from '../lib/media'

interface Conversation {
  id: string
  studentId: string
  tutorId: string
  lastMessageAt: string
  unreadCount: number
  student: {
    id: string
    firstName: string | null
    lastName: string | null
    profileImage: string | null
    user: { email: string }
  }
  tutor: {
    id: string
    firstName: string | null
    lastName: string | null
    profileImage: string | null
    user: { email: string }
  }
  messages: Array<{
    id: string
    content: string
    createdAt: string
  }>
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  senderRole: string
  content: string
  read: boolean
  createdAt: string
}

const Messages = () => {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Smart scroll tracking
  const isAtBottom = useRef(true)      // true when user is near the bottom
  const prevMessageCount = useRef(0)   // detect genuinely new messages vs same-data polls
  const justSentMessage = useRef(false) // force-scroll after the current user sends

  useEffect(() => {
    fetchConversations()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      // Reset scroll tracking when switching conversations
      prevMessageCount.current = 0
      isAtBottom.current = true
      fetchMessages(selectedConversation.id)
      // Poll for new messages every 5 seconds
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedConversation.id, true)
      }, 5000)
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [selectedConversation?.id])

  useEffect(() => {
    const newCount = messages.length
    const isFirstLoad = prevMessageCount.current === 0 && newCount > 0
    const hasNewMessages = newCount > prevMessageCount.current

    if (isFirstLoad) {
      // Jump to bottom instantly on first load — no animation
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    } else if (justSentMessage.current) {
      // User just sent a message — always scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      justSentMessage.current = false
    } else if (hasNewMessages && isAtBottom.current) {
      // New message arrived and user is already near bottom — follow it
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    // If poll returned same messages OR user scrolled up — do nothing

    prevMessageCount.current = newCount
  }, [messages])

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    // Consider "at bottom" if within 80px of the bottom
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/messages/conversations')
      setConversations(response.data)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string, silent = false) => {
    try {
      const response = await api.get(`/messages/conversations/${conversationId}/messages`)
      setMessages(response.data)
      if (!silent) {
        // Refresh conversations to update unread counts
        const convResponse = await api.get('/messages/conversations')
        setConversations(convResponse.data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return

    try {
      setSending(true)
      justSentMessage.current = true // force scroll after send
      isAtBottom.current = true
      await api.post(`/messages/conversations/${selectedConversation.id}/messages`, {
        content: newMessage.trim(),
      })
      setNewMessage('')
      await fetchMessages(selectedConversation.id)
    } catch (error) {
      console.error('Error sending message:', error)
      justSentMessage.current = false
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const getOtherParty = (conv: Conversation) => {
    if (user?.role === 'STUDENT') {
      return {
        name: [conv.tutor.firstName, conv.tutor.lastName].filter(Boolean).join(' ') || conv.tutor.user.email,
        image: conv.tutor.profileImage,
      }
    }
    return {
      name: [conv.student.firstName, conv.student.lastName].filter(Boolean).join(' ') || conv.student.user.email,
      image: conv.student.profileImage,
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true
    const other = getOtherParty(conv)
    return other.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-sky-100">
      <Navbar />
      <div className="flex-1 flex max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-10">
        <div className="flex-1 bg-white rounded-3xl shadow overflow-hidden" style={{ height: '70vh', minHeight: '500px' }}>
          <div className="flex h-full">
            {/* Conversation List */}
            <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-[#012c54] mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Messages
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">
                      {user?.role === 'STUDENT'
                        ? 'Message a tutor from their profile page'
                        : 'Students will message you when interested'}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const other = getOtherParty(conv)
                    const lastMsg = conv.messages[0]
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`w-full flex items-center gap-3 p-4 hover:bg-sky-50 transition-colors text-left border-b border-gray-100 ${
                          selectedConversation?.id === conv.id ? 'bg-sky-50' : ''
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                          {other.image ? (
                            <img src={resolveImageUrl(other.image)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                              {other.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-gray-800 truncate">{other.name}</p>
                            {lastMsg && (
                              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {formatTime(lastMsg.createdAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 truncate">
                              {lastMsg ? lastMsg.content : 'No messages yet'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="ml-2 bg-[#f5a11a] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Message Area */}
            <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-1 hover:bg-gray-100 rounded-full"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {getOtherParty(selectedConversation).image ? (
                        <img
                          src={resolveImageUrl(getOtherParty(selectedConversation).image!)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xs">
                          {getOtherParty(selectedConversation).name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {getOtherParty(selectedConversation).name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user?.role === 'STUDENT' ? 'Tutor' : 'Student'}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    ref={messagesContainerRef}
                    onScroll={handleMessagesScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-3"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-400 py-12 text-sm">
                        Start the conversation by sending a message below.
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.senderId === user?.id
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                                isMine
                                  ? 'bg-[#012c54] text-white rounded-br-md'
                                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-[10px] mt-1 ${isMine ? 'text-sky-200' : 'text-gray-400'}`}>
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012c54]/20"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="p-2.5 bg-[#012c54] text-white rounded-full hover:bg-[#012c54]/90 disabled:opacity-40 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium">Select a conversation</p>
                    <p className="text-sm mt-1">Choose from the list to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default Messages
