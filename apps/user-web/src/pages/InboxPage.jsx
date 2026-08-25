import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useSocket, getSocket } from '../hooks/useSocket';
import { useMetaEmbeddedSignup } from '../hooks/useMetaEmbeddedSignup';
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
  Pin,
  Smartphone,
  ShieldCheck,
  Key,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
  MessageSquare,
  Facebook,
  Zap,
  Globe,
  Sliders,
  Unlink,
  CheckCircle2,
  Plus,
  X,
  UserPlus,
  Clock,
  Image as ImageIcon,
  FileText,
  Download,
  Trash2,
  Edit3,
  Copy,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Loader2,
  FileSpreadsheet,
  MapPin,
  Mic,
  Volume2
} from 'lucide-react';

import { useAuthStore } from '../stores/authStore';

// Helper: Format WhatsApp Markdown text (*bold*, _italic_, ~strike~, ```code```, urls)
function renderWhatsAppFormattedText(text) {
  if (!text) return null;
  
  // Escape HTML tags to prevent XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // URLs -> clickable links
  escaped = escaped.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-medium hover:text-blue-800 break-all">$1</a>'
  );

  // Bold *text*
  escaped = escaped.replace(/\*([^\*]+)\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  
  // Italic _text_
  escaped = escaped.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');
  
  // Strikethrough ~text~
  escaped = escaped.replace(/~([^~]+)~/g, '<del class="line-through text-slate-400">$1</del>');
  
  // Code ```code```
  escaped = escaped.replace(/```([^`]+)```/g, '<code class="bg-slate-800/10 px-1.5 py-0.5 rounded font-mono text-[11px] text-emerald-950">$1</code>');
  
  // Line breaks
  escaped = escaped.replace(/\n/g, '<br/>');

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const phoneParam = searchParams.get('phone');
  const contactIdParam = searchParams.get('contactId');

  const { user, activeOrganization } = useAuthStore();
  const [selectedChannel, setSelectedChannel] = useState('WHATSAPP');
  const [filterPill, setFilterPill] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');

  // Optimistic Messages State for Instant Zero-Delay UI
  const [optimisticMessages, setOptimisticMessages] = useState([]);

  // Attachment & Media State
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Lightbox Modal for Images
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  // Message Editing State
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');

  // Delete Message Modal State (Delete for everyone / Delete for me)
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Typing Indicator State
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);

  // New Manual Chat Modal State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');

  // 1. Fetch Business Profile & Live WhatsApp Status
  const { data: profileRes, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/whatsapp/profile')
  });

  const profileData = profileRes?.data?.profile || null;
  const isWhatsAppConnected = profileData?.status === 'CONNECTED' && Boolean(profileData?.displayPhoneNumber);

  // 2. Fetch Conversations
  const { data: convData, isLoading: isLoadingConvs } = useQuery({
    queryKey: ['conversations', selectedChannel, filterPill],
    queryFn: () =>
      api.get('/conversations', {
        params: {
          channel: selectedChannel === 'ALL' ? undefined : selectedChannel,
          filterType: filterPill
        }
      }),
    enabled: Boolean(isWhatsAppConnected),
    refetchInterval: 3000
  });

  const rawConversations = convData?.data || [];

  // Sort conversations dynamically by latest message timestamp (Newest on Top)
  const sortedConversations = [...rawConversations].sort((a, b) => {
    const timeA = new Date(a.lastMessage?.sentAt || a.lastMessageAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.lastMessage?.sentAt || b.lastMessageAt || b.updatedAt || 0).getTime();
    return timeB - timeA;
  });

  // Filter conversations by search query
  const filteredConversations = sortedConversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (conv.contactId?.name || '').toLowerCase();
    const phone = (conv.contactId?.phone || '').toLowerCase();
    const lastTxt = (conv.lastMessage?.text || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || lastTxt.includes(q);
  });

  const activeConv = selectedConversation || filteredConversations[0] || null;

  // 2b. Initiate / Open Conversation Mutation
  const initiateMutation = useMutation({
    mutationFn: (data) => api.post('/conversations/initiate', data),
    onSuccess: (res) => {
      const conv = res?.data;
      if (conv) {
        setSelectedConversation(conv);
        setIsNewChatOpen(false);
        setNewChatPhone('');
        setNewChatName('');
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to start chat';
      alert(msg);
    }
  });

  // 2c. Automatically select / initiate conversation when coming from Contacts/Leads page with ?phone= or ?contactId=
  useEffect(() => {
    if (phoneParam || contactIdParam) {
      const match = sortedConversations.find(
        (c) =>
          (contactIdParam && c.contactId?._id === contactIdParam) ||
          (phoneParam && c.contactId?.phone?.replace(/\D/g, '') === phoneParam.replace(/\D/g, ''))
      );
      if (match) {
        setSelectedConversation(match);
      } else if (isWhatsAppConnected && (phoneParam || contactIdParam)) {
        initiateMutation.mutate({
          phone: phoneParam,
          contactId: contactIdParam
        });
      }
    }
  }, [phoneParam, contactIdParam, sortedConversations.length, isWhatsAppConnected]);

  // 3. Fetch Messages for active conversation
  const { data: messagesData, isLoading: isLoadingMsgs } = useQuery({
    queryKey: ['messages', activeConv?.contactId?._id],
    queryFn: () => api.get(`/conversations/${activeConv?.contactId?._id}/messages`),
    enabled: Boolean(isWhatsAppConnected && activeConv?.contactId?._id),
    refetchInterval: 2000
  });

  const serverMessages = messagesData?.data || [];

  // Combine server messages with active optimistic messages (filtered so no duplicate/stuck pending message remains)
  const messages = [
    ...serverMessages,
    ...optimisticMessages.filter(
      (opt) =>
        opt.contactId === activeConv?.contactId?._id &&
        !serverMessages.some(
          (srv) =>
            srv._id === opt._id ||
            srv.providerMessageId === opt._id ||
            (srv.content?.text === opt.content?.text && Math.abs(new Date(srv.createdAt).getTime() - new Date(opt.createdAt).getTime()) < 30000)
        )
    )
  ];

  // Auto-cleanup stale optimistic messages older than 15s
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setOptimisticMessages((prev) => prev.filter((opt) => now - new Date(opt.createdAt).getTime() < 15000));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConv?.contactId?._id]);

  // 3b. Fetch Approved Meta Templates for 24-hour window re-engagement
  const { data: templatesRes } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/whatsapp/templates'),
    enabled: Boolean(isWhatsAppConnected)
  });
  const templates = templatesRes?.data || [];

  // 4. Socket.IO Real-time Updates (New messages, status updates, typing)
  useSocket({
    'conversation.message': (payload) => {
      console.log('[Inbox] Incoming Live Realtime Message:', payload);

      if (payload?.message) {
        // 1. Clear matching optimistic message immediately
        setOptimisticMessages((prev) =>
          prev.filter(
            (opt) =>
              opt._id !== payload.message._id &&
              opt.content?.text !== payload.message?.content?.text
          )
        );

        // 2. Direct optimistic cache injection for 0ms render
        const msgContactId = (payload.contactId || payload.message?.contactId)?._id || payload.contactId || payload.message?.contactId;
        const cleanId = msgContactId?.toString ? msgContactId.toString() : msgContactId;

        if (cleanId) {
          setTypingUsers((prev) => ({ ...prev, [cleanId]: false }));
          queryClient.setQueryData(['messages', cleanId], (old) => {
            const prevList = old?.data || (Array.isArray(old) ? old : []);
            const alreadyExists = prevList.some(
              (m) => m._id === payload.message._id || (m.providerMessageId && m.providerMessageId === payload.message.providerMessageId)
            );
            if (alreadyExists) return old;
            const updated = [...prevList, payload.message];
            return old?.data ? { ...old, data: updated } : updated;
          });
        }
      }

      // 3. Invalidate queries across the entire inbox
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    'message.status': () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    'message.edited': () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    'message.deleted': () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    'message.deleted_for_everyone': () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    'conversation.typing': ({ contactId, isTyping, userId }) => {
      // Never show typing indicator in the header when the current logged-in agent is typing
      const currentUserId = user?._id || user?.id;
      if (userId && currentUserId && userId.toString() === currentUserId.toString()) {
        return;
      }
      setTypingUsers((prev) => ({ ...prev, [contactId]: isTyping }));
    }
  });

  // 5. Send Message Mutation (with Instant Zero-Delay Optimistic UI)
  const sendMutation = useMutation({
    mutationFn: (payload) => {
      const data = typeof payload === 'string' ? { text: payload } : payload;
      return api.post('/conversations/messages', {
        contactId: activeConv?.contactId?._id,
        ...data
      });
    },
    onSuccess: (res) => {
      const savedMsg = res?.data || res;
      if (savedMsg) {
        setOptimisticMessages((prev) =>
          prev.filter(
            (opt) =>
              opt._id !== savedMsg._id &&
              opt.content?.text !== savedMsg.content?.text &&
              opt.content?.mediaUrl !== savedMsg.content?.mediaUrl
          )
        );
      }
      queryClient.invalidateQueries({ queryKey: ['messages', activeConv?.contactId?._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Error sending message';
      alert(msg);
      // Remove failed optimistic message
      setOptimisticMessages((prev) => prev.filter((opt) => opt.contactId !== activeConv?.contactId?._id));
    }
  });

  // 6. Edit Message Mutation
  const editMutation = useMutation({
    mutationFn: ({ messageId, text }) => api.put(`/conversations/messages/${messageId}`, { text }),
    onSuccess: () => {
      setEditingMessage(null);
      setEditText('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeConv?.contactId?._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      alert(`Edit Failed: ${err.response?.data?.message || err.message}`);
    }
  });

  // 7. Delete Message Mutation (Supports delete for everyone & delete for me)
  const deleteMutation = useMutation({
    mutationFn: ({ messageId, deleteForEveryone }) =>
      api.delete(`/conversations/messages/${messageId}`, {
        data: { deleteForEveryone }
      }),
    onSuccess: () => {
      setDeletingMessage(null);
      queryClient.invalidateQueries({ queryKey: ['messages', activeConv?.contactId?._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err) => {
      alert(`Delete Failed: ${err.response?.data?.message || err.message}`);
    }
  });

  // 8. Meta Embedded Signup Hook
  const { launchEmbeddedSignup, isConnecting: isMetaConnecting } = useMetaEmbeddedSignup({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      alert('🎉 WhatsApp Business connected with Meta Embedded Signup successfully!');
    },
    onError: (err) => {
      alert(`Meta Signup: ${err.message}`);
    }
  });

  // Handle typing indicator trigger
  const handleTextChange = (e) => {
    const text = e.target.value;
    setMessageText(text);

    const socket = getSocket();
    if (socket && activeConv?.contactId?._id) {
      socket.emit('typing.start', { contactId: activeConv.contactId._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing.stop', { contactId: activeConv.contactId._id });
      }, 1500);
    }
  };

  // Handle File Selection (Images or Documents)
  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile({ file, type });
    if (type === 'IMAGE' || file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
    } else {
      setFilePreviewUrl(null);
    }
    setAttachmentMenuOpen(false);
  };

  // Instant Outbound Send Handler
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!messageText.trim() && !selectedFile) || !activeConv) return;

    const currentText = messageText.trim();
    const currentFile = selectedFile;
    const currentPreview = filePreviewUrl;

    // Reset input fields instantly
    setMessageText('');
    setSelectedFile(null);
    setFilePreviewUrl(null);

    // Stop typing indicator
    const socket = getSocket();
    if (socket && activeConv?.contactId?._id) {
      socket.emit('typing.stop', { contactId: activeConv.contactId._id });
    }

    // ⚡ 1. Show optimistic message on screen IMMEDIATELY
    const tempId = `temp-${Date.now()}`;
    const optimisticItem = {
      _id: tempId,
      contactId: activeConv.contactId?._id,
      direction: 'OUTBOUND',
      type: currentFile ? (currentFile.type === 'IMAGE' ? 'IMAGE' : (currentFile.type === 'DOCUMENT' ? 'DOCUMENT' : 'IMAGE')) : 'TEXT',
      content: {
        text: currentText,
        mediaUrl: currentPreview,
        filename: currentFile?.file?.name
      },
      isUploading: Boolean(currentFile),
      uploadProgress: currentFile ? 15 : 100,
      status: 'PENDING',
      createdAt: new Date()
    };

    setOptimisticMessages((prev) => [...prev, optimisticItem]);

    let uploadedMedia = null;

    if (currentFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', currentFile.file);
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percent);
              setOptimisticMessages((prev) =>
                prev.map((m) => (m._id === tempId ? { ...m, uploadProgress: percent } : m))
              );
            }
          }
        });
        uploadedMedia = uploadRes?.data || uploadRes;
      } catch (upErr) {
        setIsUploading(false);
        setUploadProgress(0);
        setOptimisticMessages((prev) => prev.filter((m) => m._id !== tempId));
        alert(`File upload failed: ${upErr.response?.data?.message || upErr.message}`);
        return;
      }
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Send payload
    if (uploadedMedia) {
      sendMutation.mutate({
        text: currentText,
        mediaUrl: uploadedMedia.relativeUrl || uploadedMedia.url,
        mediaType: uploadedMedia.mediaType || currentFile?.type || 'IMAGE',
        filename: uploadedMedia.filename || currentFile?.file?.name
      });
    } else {
      sendMutation.mutate(currentText);
    }
  };

  // Format Text Shortcut Injector
  const applyTextFormat = (prefix, suffix) => {
    setMessageText((prev) => `${prev}${prefix}text${suffix}`);
  };

  // IF WHATSAPP IS NOT CONNECTED: SHOW CLEAN EXPLICIT CONNECT GATE
  if (!isLoadingProfile && !isWhatsAppConnected) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50/70 p-4 md:p-8">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <MessageSquare className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">WhatsApp Inbox</h2>
            <p className="text-xs font-bold text-rose-600">No WhatsApp Business number connected.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed pt-1">
              To send and receive WhatsApp messages, connect your official WhatsApp Business account through Meta first.
            </p>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex items-start space-x-2.5 text-left text-xs font-semibold text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Connect your WhatsApp Business account via Meta Cloud API to send broadcast messages and manage live conversations.
            </p>
          </div>

          <Link
            to="/integrations"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2"
          >
            <Smartphone className="w-4 h-4" />
            <span>Connect WhatsApp (Manual Setup)</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-white overflow-hidden">
      {/* 1. Channel Filter Tabs & WhatsApp Live Status Header */}
      <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSelectedChannel('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              selectedChannel === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span># All Channels</span>
          </button>

          <button
            onClick={() => setSelectedChannel('WHATSAPP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              selectedChannel === 'WHATSAPP'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>WhatsApp ({profileData?.displayPhoneNumber || '+91 91555 34309'})</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 text-xs font-bold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Cloud API v25.0 Live</span>
          </div>
        </div>
      </div>

      {/* 2. Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1: Conversation List (Automatically Sorted by Latest Message) */}
        <div className="w-80 md:w-96 border-r border-slate-200 flex flex-col bg-white">
          {/* Top Actions: Start New Chat & Search */}
          <div className="p-3 border-b border-slate-100 space-y-2.5">
            <button
              onClick={() => setIsNewChatOpen(!isNewChatOpen)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Start Chat with Number / Customer</span>
            </button>

            {/* New Chat Inline Form */}
            {isNewChatOpen && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-emerald-950 flex items-center space-x-1">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>New WhatsApp Conversation</span>
                  </span>
                  <button
                    onClick={() => setIsNewChatOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Phone Number (with Country Code):</label>
                  <input
                    type="text"
                    value={newChatPhone}
                    onChange={(e) => setNewChatPhone(e.target.value)}
                    placeholder="e.g. 918292463648"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Customer Name (Optional):</label>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={() => {
                    if (!newChatPhone.trim()) {
                      alert('Please enter a valid phone number');
                      return;
                    }
                    initiateMutation.mutate({
                      phone: newChatPhone,
                      name: newChatName
                    });
                  }}
                  disabled={initiateMutation.isPending || !newChatPhone.trim()}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 disabled:opacity-50 shadow-xs"
                >
                  <span>{initiateMutation.isPending ? 'Opening Chat...' : '🚀 Open Live Chat'}</span>
                </button>
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats by name or number..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex space-x-1 text-[11px] font-semibold text-slate-500">
              {['ALL', 'OPEN', 'BOT_ACTIVE', 'RESOLVED'].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setFilterPill(pill)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    filterPill === pill ? 'bg-slate-100 text-slate-900 font-bold' : 'hover:text-slate-800'
                  }`}
                >
                  {pill.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoadingConvs ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No chats found</p>
                <p className="text-[11px] text-slate-400">
                  {searchQuery ? 'Try another search term.' : 'Click "Start Chat" above to test messaging any customer.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = activeConv?._id === conv._id;
                const isContactTyping = typingUsers[conv.contactId?._id];

                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3.5 flex items-start space-x-3 text-left transition ${
                      isActive ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        {conv.contactId?.name?.[0] || 'C'}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-emerald-500" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{conv.contactId?.name || 'Customer'}</h4>
                        <span className="text-[10px] text-slate-400">
                          {conv.lastMessage?.sentAt || conv.lastMessageAt
                            ? new Date(conv.lastMessage?.sentAt || conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono">+{conv.contactId?.phone}</p>
                      
                      {isContactTyping ? (
                        <p className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1 mt-0.5 animate-pulse">
                          <span>typing...</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {conv.lastMessage?.text || 'Started conversation'}
                        </p>
                      )}
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[9px] font-black shrink-0 shadow-xs">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: WhatsApp Authentic Chat Area */}
        <div className="flex-1 flex flex-col bg-[#efeae2]/50 relative">
          {/* Subtle Authentic WhatsApp Wallpaper Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(#075e54 1px, transparent 1px), radial-gradient(#128c7e 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px'
            }}
          />

          {activeConv ? (
            (() => {
              const lastCustomerReply = activeConv.contactId?.lastRepliedAt
                ? new Date(activeConv.contactId.lastRepliedAt).getTime()
                : null;
              const isWindowActive = lastCustomerReply ? (Date.now() - lastCustomerReply < 24 * 60 * 60 * 1000) : false;
              const windowRemainingMs = isWindowActive ? Math.max(0, (lastCustomerReply + 24 * 60 * 60 * 1000) - Date.now()) : 0;
              const windowHours = Math.floor(windowRemainingMs / (1000 * 60 * 60));
              const windowMinutes = Math.floor((windowRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
              const isContactTyping = typingUsers[activeConv.contactId?._id];

              return (
                <div className="flex-1 flex flex-col h-full z-10">
                  {/* Chat Header */}
                  <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          {activeConv.contactId?.name?.[0] || 'C'}
                        </div>
                        {isContactTyping && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-ping" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{activeConv.contactId?.name || 'Customer'}</span>
                        </h3>
                        {isContactTyping ? (
                          <div className="flex items-center space-x-1 text-[11px] text-emerald-600 font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
                            <span className="ml-1">typing...</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">+{activeConv.contactId?.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isWindowActive ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-300 flex items-center space-x-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>🟢 24h Window Active: {windowHours}h {windowMinutes}m remaining</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-300 flex items-center space-x-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>⚠️ 24h Window Closed</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Reply & Formatting Bar */}
                  <div className="px-6 py-1 bg-white/95 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                    {/* Quick Replies */}
                    <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
                      <span className="text-slate-400 text-[10px]">Quick:</span>
                      <button
                        type="button"
                        onClick={() => setMessageText('Hello! Thanks for reaching out to us. How can we assist you today?')}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md hover:border-emerald-500 hover:text-emerald-700 transition text-[10px]"
                      >
                        👋 /welcome
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageText('Here are our services & plans: Starter ₹999, Business ₹2,499, Enterprise ₹4,999.')}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md hover:border-emerald-500 hover:text-emerald-700 transition text-[10px]"
                      >
                        💰 /pricing
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageText('Our support team is available 24/7. An executive will assist you shortly.')}
                        className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md hover:border-emerald-500 hover:text-emerald-700 transition text-[10px]"
                      >
                        🛠️ /support
                      </button>
                    </div>

                    {/* Text Formatting Shortcuts */}
                    <div className="hidden sm:flex items-center space-x-1 pl-2 border-l border-slate-200 text-slate-500">
                      <button
                        type="button"
                        onClick={() => applyTextFormat('*', '*')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-700"
                        title="Bold (*text*)"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat('_', '_')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-700"
                        title="Italic (_text_)"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat('~', '~')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-700"
                        title="Strikethrough (~text~)"
                      >
                        <Strikethrough className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTextFormat('```', '```')}
                        className="p-1 hover:bg-slate-100 rounded text-slate-700"
                        title="Code (```code```)"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Message Feed */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {/* Date Pill */}
                    <div className="flex justify-center my-2">
                      <span className="px-3 py-1 bg-white/80 shadow-xs border border-slate-200/60 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Today
                      </span>
                    </div>

                    {isLoadingMsgs ? (
                      <div className="p-4 text-center text-xs text-slate-400">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-16 space-y-2">
                        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">No messages in this chat yet</p>
                        <p className="text-[11px] text-slate-400">Type a message below to start chatting with +{activeConv.contactId?.phone}</p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isOutbound = msg.direction === 'OUTBOUND';
                        const isPending = msg.status === 'PENDING';
                        const isImage = msg.type === 'IMAGE' || (msg.content?.mediaUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.content.mediaUrl));
                        const isAudio = msg.type === 'AUDIO' || msg.type === 'VOICE' || (msg.content?.mediaUrl && /\.(ogg|opus|mp3|wav|m4a)$/i.test(msg.content.mediaUrl));
                        const isVideo = msg.type === 'VIDEO' || (msg.content?.mediaUrl && /\.(mp4|mov|webm)$/i.test(msg.content.mediaUrl));
                        const isLocation = msg.type === 'LOCATION' || Boolean(msg.content?.location?.latitude);
                        const isDocument = (msg.type === 'DOCUMENT' || msg.content?.mediaUrl) && !isImage && !isAudio && !isVideo && !isLocation;

                        return (
                          <div key={msg._id} className={`flex group ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`relative max-w-lg rounded-2xl p-3 shadow-xs space-y-1.5 transition ${
                                isOutbound
                                  ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none border border-emerald-200/50'
                                  : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                              }`}
                            >
                              {/* Media Image Rendering with Live Circular Upload Progress Ring */}
                              {isImage && msg.content?.mediaUrl && (
                                <div className="relative rounded-xl overflow-hidden cursor-pointer mb-1 border border-slate-200/60 shadow-xs">
                                  <img
                                    src={msg.content.mediaUrl.startsWith('http') || msg.content.mediaUrl.startsWith('blob:') ? msg.content.mediaUrl : (msg.content.mediaUrl.startsWith('/') ? msg.content.mediaUrl : `/${msg.content.mediaUrl}`)}
                                    alt="Attached Media"
                                    onClick={() => !msg.isUploading && setLightboxImageUrl(msg.content.mediaUrl.startsWith('http') || msg.content.mediaUrl.startsWith('blob:') ? msg.content.mediaUrl : (msg.content.mediaUrl.startsWith('/') ? msg.content.mediaUrl : `/${msg.content.mediaUrl}`))}
                                    className="max-h-64 w-full object-cover rounded-xl hover:scale-[1.01] transition duration-200"
                                  />

                                  {/* WhatsApp-Grade Circular Progress Overlay */}
                                  {(msg.isUploading || (isPending && msg.uploadProgress !== undefined && msg.uploadProgress < 100)) && (
                                    <div className="absolute inset-0 bg-black/55 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center space-y-2 text-white z-10 animate-in fade-in">
                                      <div className="relative flex items-center justify-center">
                                        <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 36 36">
                                          <path
                                            className="text-white/20"
                                            strokeWidth="3.5"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                          />
                                          <path
                                            className="text-emerald-400 transition-all duration-200 ease-out"
                                            strokeDasharray={`${msg.uploadProgress || 15}, 100`}
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                          />
                                        </svg>
                                        <span className="absolute text-xs font-black text-white">{msg.uploadProgress || 15}%</span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-white/90 tracking-wide">Sending to WhatsApp...</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Audio / Voice Note Player */}
                              {isAudio && msg.content?.mediaUrl && (
                                <div className="p-2 bg-emerald-50/80 rounded-xl border border-emerald-200/70 space-y-1">
                                  <div className="flex items-center space-x-2 text-[11px] font-bold text-emerald-800">
                                    <Mic className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                    <span>Voice Message</span>
                                  </div>
                                  <audio
                                    src={msg.content.mediaUrl.startsWith('http') || msg.content.mediaUrl.startsWith('blob:') ? msg.content.mediaUrl : (msg.content.mediaUrl.startsWith('/') ? msg.content.mediaUrl : `/${msg.content.mediaUrl}`)}
                                    controls
                                    className="w-64 max-w-full h-8 rounded-lg"
                                  />
                                </div>
                              )}

                              {/* Video Player */}
                              {isVideo && msg.content?.mediaUrl && (
                                <div className="rounded-xl overflow-hidden mb-1 border border-slate-200/60 shadow-xs">
                                  <video
                                    src={msg.content.mediaUrl.startsWith('http') || msg.content.mediaUrl.startsWith('blob:') ? msg.content.mediaUrl : (msg.content.mediaUrl.startsWith('/') ? msg.content.mediaUrl : `/${msg.content.mediaUrl}`)}
                                    controls
                                    className="max-h-64 w-full object-cover rounded-xl"
                                  />
                                </div>
                              )}

                              {/* Location Card */}
                              {isLocation && msg.content?.location && (
                                <a
                                  href={`https://www.google.com/maps?q=${msg.content.location.latitude},${msg.content.location.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-3 bg-emerald-50/80 hover:bg-emerald-100/80 rounded-xl border border-emerald-200/80 flex items-start space-x-3 transition block text-left"
                                >
                                  <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                                    <MapPin className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {msg.content.location.name || 'Shared Location'}
                                    </p>
                                    <p className="text-[10px] text-slate-600 line-clamp-2 mt-0.5">
                                      {msg.content.location.address || `${msg.content.location.latitude}, ${msg.content.location.longitude}`}
                                    </p>
                                    <span className="text-[10px] text-emerald-700 font-bold underline mt-1 inline-block">
                                      📍 Open in Google Maps
                                    </span>
                                  </div>
                                </a>
                              )}

                              {/* Document / PDF Card */}
                              {isDocument && msg.content?.mediaUrl && (
                                <a
                                  href={msg.content.mediaUrl.startsWith('http') || msg.content.mediaUrl.startsWith('blob:') ? msg.content.mediaUrl : (msg.content.mediaUrl.startsWith('/') ? msg.content.mediaUrl : `/${msg.content.mediaUrl}`)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 bg-black/5 hover:bg-black/10 rounded-xl flex items-center space-x-3 transition block text-left border border-slate-200/40"
                                >
                                  <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {msg.content?.filename || 'Document.pdf'}
                                    </p>
                                    <span className="text-[10px] text-slate-500 uppercase">Click to download / view</span>
                                  </div>
                                  <Download className="w-4 h-4 text-slate-600" />
                                </a>
                              )}

                              {/* Message Text Content */}
                              {(msg.content?.text || (!msg.content?.mediaUrl && !msg.content?.filename)) && (
                                <div className="text-xs leading-relaxed break-words">
                                  {renderWhatsAppFormattedText(msg.content?.text || (msg.type === 'INTERACTIVE' ? 'Selected an option' : msg.type === 'BUTTON' ? 'Clicked button' : 'Message'))}
                                </div>
                              )}

                              {/* Footer: Timestamp, Edited badge, Status Checkmarks */}
                              <div className={`flex items-center justify-end space-x-1 text-[9px] pt-0.5 ${isOutbound ? 'text-slate-500' : 'text-slate-400'}`}>
                                {msg.isEdited && <span className="italic text-[8px] mr-1">edited</span>}
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                                {isOutbound && (
                                  <span>
                                    {isPending ? (
                                      <Clock className="w-3 h-3 text-slate-400 animate-pulse" title="Sending..." />
                                    ) : msg.status === 'READ' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" title="Read by customer" />
                                    ) : msg.status === 'DELIVERED' ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-slate-500" title="Delivered to phone" />
                                    ) : msg.status === 'FAILED' ? (
                                      <span className="px-1 py-0.2 bg-rose-500 text-white rounded text-[8px] font-bold" title="Failed">FAILED</span>
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-slate-500" title="Sent via Meta Cloud API" />
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Hover Quick Action Buttons */}
                              <div className={`absolute top-1 ${isOutbound ? '-left-16' : '-right-16'} opacity-0 group-hover:opacity-100 transition flex items-center space-x-1 bg-white/95 shadow-sm border border-slate-200 rounded-lg p-1 z-20`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (msg.content?.text) {
                                      navigator.clipboard.writeText(msg.content.text);
                                      alert('Message copied to clipboard!');
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-600"
                                  title="Copy text"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                {isOutbound && !isPending && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setEditText(msg.content?.text || '');
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded text-slate-600"
                                    title="Edit message"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                )}
                                {!isPending && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingMessage(msg)}
                                    className="p-1 hover:bg-rose-50 rounded text-rose-600"
                                    title="Delete message"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* 24-Hour Window Expired Notice & Quick Template Action */}
                  {!isWindowActive && (
                    <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="font-semibold text-[11px]">
                          24-hour window closed. Meta requires an approved template message to re-engage.
                        </span>
                      </div>
                      {templates.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <select
                            onChange={(e) => {
                              const tplName = e.target.value;
                              if (tplName) {
                                const tpl = templates.find((t) => t.name === tplName);
                                const bodyText = tpl?.components?.find((c) => c.type === 'BODY')?.text || `[Template: ${tplName}]`;
                                sendMutation.mutate({
                                  templateName: tplName,
                                  templateLanguage: tpl?.language || 'en_US',
                                  text: bodyText
                                });
                                e.target.value = '';
                              }
                            }}
                            defaultValue=""
                            className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 cursor-pointer shadow-xs"
                          >
                            <option value="" disabled>⚡ Send Template</option>
                            {templates.map((t) => (
                              <option key={t._id || t.name} value={t.name}>
                                {t.name} ({t.category || 'MARKETING'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Attachment Preview Banner before Sending */}
                  {selectedFile && (
                    <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center space-x-3">
                        {filePreviewUrl ? (
                          <img src={filePreviewUrl} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 font-bold">
                            <FileText className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{selectedFile.file.name}</p>
                          <span className="text-[10px] text-slate-400">{(selectedFile.file.size / 1024).toFixed(1)} KB &bull; Ready to send</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreviewUrl(null);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Chat Input Bar */}
                  <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 relative">
                    {/* Attachment Picker Menu Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                        className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition"
                        title="Attach Media / Document"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>

                      {/* Attachment Dropdown Menu */}
                      {attachmentMenuOpen && (
                        <div className="absolute bottom-12 left-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 w-44 z-50 animate-in fade-in slide-in-from-bottom-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full px-3 py-2 text-left hover:bg-emerald-50 rounded-xl flex items-center space-x-2 text-xs font-bold text-slate-700 transition"
                          >
                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                            <span>Photo & Video</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => docInputRef.current?.click()}
                            className="w-full px-3 py-2 text-left hover:bg-purple-50 rounded-xl flex items-center space-x-2 text-xs font-bold text-slate-700 transition"
                          >
                            <FileText className="w-4 h-4 text-purple-600" />
                            <span>Document / PDF</span>
                          </button>
                        </div>
                      )}

                      {/* Hidden File Inputs */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleFileSelect(e, 'IMAGE')}
                        className="hidden"
                      />
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.xlsx,.txt"
                        onChange={(e) => handleFileSelect(e, 'DOCUMENT')}
                        className="hidden"
                      />
                    </div>

                    {/* Message Input Box */}
                    <input
                      type="text"
                      value={messageText}
                      onChange={handleTextChange}
                      placeholder={selectedFile ? 'Add a caption...' : 'Type a WhatsApp message (use *bold*, _italic_, ~strike~)...'}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />

                    {/* Send Button with % Progress Circle */}
                    <button
                      type="submit"
                      disabled={(!messageText.trim() && !selectedFile) || sendMutation.isPending || isUploading}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition disabled:opacity-40 flex items-center justify-center min-w-[44px]"
                    >
                      {isUploading ? (
                        <div className="flex items-center space-x-1.5 text-[11px] font-bold">
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>{uploadProgress}%</span>
                        </div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
              );
            })()
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Select a conversation from the left to view messages
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp-Style Delete Message Modal */}
      {deletingMessage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete message?</h3>
              <p className="text-xs text-slate-500 mt-1">
                {deletingMessage.direction === 'OUTBOUND'
                  ? 'Choose whether to delete this message for everyone in the chat or only for yourself.'
                  : 'This message will be removed from your chat.'}
              </p>
            </div>
            <div className="space-y-2 pt-2">
              {deletingMessage.direction === 'OUTBOUND' && (
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate({ messageId: deletingMessage._id, deleteForEveryone: true })}
                  disabled={deleteMutation.isPending}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1"
                >
                  {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🗑️ Delete for everyone</span>}
                </button>
              )}
              <button
                type="button"
                onClick={() => deleteMutation.mutate({ messageId: deletingMessage._id, deleteForEveryone: false })}
                disabled={deleteMutation.isPending}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🗑️ Delete for me</span>}
              </button>
              <button
                type="button"
                onClick={() => setDeletingMessage(null)}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Edit WhatsApp Message</h3>
              <button onClick={() => setEditingMessage(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setEditingMessage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editText.trim()) {
                    editMutation.mutate({ messageId: editingMessage._id, text: editText });
                  }
                }}
                disabled={editMutation.isPending || !editText.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Edit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox Modal */}
      {lightboxImageUrl && (
        <div 
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2">
            <img src={lightboxImageUrl} alt="Enlarged view" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
