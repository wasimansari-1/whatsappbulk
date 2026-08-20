import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useSocket } from '../hooks/useSocket';
import {
  Search,
  Filter,
  Check,
  CheckCheck,
  Send,
  Paperclip,
  Smile,
  Bot,
  User,
  ChevronDown,
  Phone,
  Video,
  MoreVertical,
  CornerDownRight,
  Pin
} from 'lucide-react';

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [selectedChannel, setSelectedChannel] = useState('WHATSAPP');
  const [filterPill, setFilterPill] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');

  // 1. Fetch Conversations
  const { data: convData, isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', selectedChannel, filterPill],
    queryFn: () =>
      api.get('/conversations', {
        params: {
          channel: selectedChannel === 'ALL' ? undefined : selectedChannel,
          filterType: filterPill
        }
      })
  });

  const conversations = convData?.data || [];
  const activeConv = selectedConversation || conversations[0] || null;

  // 2. Fetch Messages for active conversation
  const { data: messagesData, isLoading: isLoadingMsgs } = useQuery({
    queryKey: ['messages', activeConv?.contactId?._id],
    queryFn: () => api.get(`/conversations/${activeConv?.contactId?._id}/messages`),
    enabled: Boolean(activeConv?.contactId?._id)
  });

  const messages = messagesData?.data || [];

  // 3. Socket.IO Real-time Updates
  useSocket({
    'conversation.message': (payload) => {
      queryClient.invalidateQueries({ queryKey: ['messages', payload.contactId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    'message.status': () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  // 4. Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: (text) =>
      api.post('/conversations/messages', {
        contactId: activeConv?.contactId?._id,
        text
      }),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeConv?.contactId?._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConv) return;
    sendMutation.mutate(messageText);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white overflow-hidden">
      {/* 1. Channel Filter Tabs */}
      <div className="px-6 py-2 border-b border-slate-200 bg-white flex items-center space-x-3">
        <button
          onClick={() => setSelectedChannel('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            selectedChannel === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span># All</span>
        </button>

        <button
          onClick={() => setSelectedChannel('WHATSAPP')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            selectedChannel === 'WHATSAPP' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>WhatsApp</span>
        </button>

        <button
          onClick={() => setSelectedChannel('INSTAGRAM')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            selectedChannel === 'INSTAGRAM' ? 'bg-pink-50 text-pink-700 border border-pink-300' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Instagram</span>
          <span className="text-[9px] bg-rose-500 text-white px-1 rounded uppercase font-bold">BETA</span>
        </button>

        <button
          onClick={() => setSelectedChannel('MESSENGER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            selectedChannel === 'MESSENGER' ? 'bg-blue-50 text-blue-700 border border-blue-300' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Messenger</span>
          <span className="text-[9px] bg-blue-500 text-white px-1 rounded uppercase font-bold">BETA</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 2. Left Conversation Sidebar */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-white">
          {/* Search bar & Filter */}
          <div className="p-3 border-b border-slate-100 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100/70 border border-transparent focus:border-brand-500 focus:bg-white rounded-lg text-xs outline-none transition"
              />
            </div>
            <button className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 transition">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px] font-semibold text-slate-600 scrollbar-none">
            {['ALL', 'PINNED', 'UNREAD', 'ACTIVE', 'ARCHIVED', 'TEXT'].map((pill) => (
              <button
                key={pill}
                onClick={() => setFilterPill(pill)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                  filterPill === pill ? 'bg-brand-500 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {pill.charAt(0) + pill.slice(1).toLowerCase()}
                {pill === 'UNREAD' && <span className="ml-1 bg-white/20 px-1 rounded-full text-[9px]">8</span>}
              </button>
            ))}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoadingConvs ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No conversations found</div>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConv?._id === conv._id;
                const contact = conv.contactId || { name: 'Customer', phone: '+919953107052' };
                const initials = contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-3.5 flex items-start space-x-3 hover:bg-slate-50 transition ${
                      isSelected ? 'bg-emerald-50/60 border-l-4 border-brand-500' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-800 truncate">{contact.name}</p>
                        <span className="text-[10px] text-slate-400">
                          {conv.lastMessage?.sentAt ? new Date(conv.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '1:19 PM'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center space-x-1">
                        {conv.lastMessage?.sender === 'AGENT' && <CheckCheck className="w-3 h-3 text-brand-600 inline" />}
                        <span>{conv.lastMessage?.text || 'Respected Mr./Ms. ...'}</span>
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Right Active Chat Thread */}
        {activeConv ? (
          <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            {/* Chat Top Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                  {activeConv.contactId?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-none">{activeConv.contactId?.name || 'Admin / Owner'}</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">India · {activeConv.contactId?.phone || '+91 9953107052'}</p>
                </div>
              </div>

              {/* Agent Assignee Dropdown */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 hidden sm:inline">Assigned To:</span>
                <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition">
                  <span>{activeConv.assignedTo?.name || 'Wasim Ansari'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto whatsapp-chat-bg space-y-4">
              {/* Date divider */}
              <div className="text-center my-2">
                <span className="px-3 py-1 bg-white/90 shadow-sm rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Today
                </span>
              </div>

              {/* System Opt-in pill */}
              <div className="text-center my-2">
                <span className="px-4 py-1.5 bg-slate-200/90 shadow-sm rounded-lg text-[11px] font-medium text-slate-700">
                  Customer Opt-In, You can now initiate conversation at 09:40 AM
                </span>
              </div>

              {/* Message Bubbles */}
              {messages.map((msg) => {
                const isOutbound = msg.direction === 'OUTBOUND';

                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl p-3.5 shadow-sm text-xs space-y-2 ${
                        isOutbound
                          ? 'bg-emerald-50/95 border border-emerald-200/70 text-slate-800 rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {/* Message Content */}
                      <p className="whitespace-pre-line leading-relaxed">{msg.content?.text}</p>

                      {/* Interactive Buttons (e.g. Raise a Request, Product Feedback) */}
                      {msg.content?.buttons && msg.content.buttons.length > 0 && (
                        <div className="pt-2 border-t border-emerald-200/50 space-y-1.5">
                          {msg.content.buttons.map((btn, idx) => (
                            <button
                              key={idx}
                              onClick={() => alert(`Customer clicked: ${btn.text}`)}
                              className="w-full py-1.5 px-3 bg-white/80 hover:bg-white border border-emerald-300 text-emerald-800 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
                            >
                              <CornerDownRight className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{btn.text}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Bubble Footer: Timestamp, Chatbot badge, Status ticks */}
                      <div className="flex items-center justify-end space-x-1 text-[10px] text-slate-400 pt-0.5">
                        {msg.isChatbotResponse && (
                          <span className="text-emerald-700 font-bold flex items-center space-x-0.5 mr-1">
                            <Bot className="w-3 h-3 inline" />
                            <span>Chatbot ·</span>
                          </span>
                        )}
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOutbound && (
                          <CheckCheck className={`w-3.5 h-3.5 ${msg.status === 'READ' ? 'text-brand-600' : 'text-slate-400'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chat Input Composer */}
            <form onSubmit={handleSendMessage} className="p-3.5 bg-white border-t border-slate-200 flex items-center space-x-3">
              <button type="button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition">
                <Paperclip className="w-4 h-4" />
              </button>
              <button type="button" className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition">
                <Smile className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-100/70 border border-transparent focus:border-brand-500 focus:bg-white rounded-xl text-xs outline-none transition"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sendMutation.isPending}
                className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-500/20 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <Bot className="w-12 h-12 stroke-[1.2] mb-3 text-slate-300" />
            <p className="text-sm font-semibold">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
