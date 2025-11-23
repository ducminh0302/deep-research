import React, { useState, useRef, useEffect } from 'react';
import { sendMessageToGemini } from './services/geminiService';
import { ChatMessage as ChatMessageType, Sender, ActivityLog, Attachment } from './types';
import { ChatMessage } from './components/ChatMessage';
import { ReportViewer } from './components/ReportViewer';
import { Content } from '@google/genai';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const isProcessingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<Content[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result as string;
      // Extract base64 part (remove data:image/png;base64,)
      const base64Data = result.split(',')[1];

      const newAttachment: Attachment = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        mimeType: file.type,
        data: base64Data,
        name: file.name
      };

      setAttachments(prev => [...prev, newAttachment]);
    };

    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
      // Reset input value to allow selecting same file again
      e.target.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData && e.clipboardData.items) {
      const items = e.clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            // Optionally prevent default behavior if you don't want the image filename to be pasted as text
            // e.preventDefault(); 
          }
        }
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  // Helper to append an activity to the last message
  const addActivityToLastMessage = (message: string, type: ActivityLog['type'] = 'thinking') => {
    setMessages(prev => {
      const newMessages = [...prev];
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.sender === Sender.Model) {
        // Prevent duplicate consecutive messages
        const lastActivity = lastMsg.activities?.[lastMsg.activities.length - 1];
        if (lastActivity && lastActivity.message === message) return prev;

        const newActivity: ActivityLog = {
          id: Date.now().toString() + Math.random(),
          type,
          message,
          timestamp: Date.now()
        };
        lastMsg.activities = [...(lastMsg.activities || []), newActivity];
        return newMessages;
      }
      return prev;
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isProcessingRef.current) return;

    const userText = input.trim();
    const currentAttachments = [...attachments];

    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    isProcessingRef.current = true;

    // 1. Add User Message
    const newUserMessage: ChatMessageType = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: userText,
      attachments: currentAttachments
    };

    // 2. Add Placeholder Model Message
    const placeholderModelMessage: ChatMessageType = {
      id: (Date.now() + 1).toString(),
      sender: Sender.Model,
      text: '',
      isThinking: true,
      activities: []
    };

    setMessages(prev => [...prev, newUserMessage, placeholderModelMessage]);
    // Auto-select the new message placeholder so the user sees the loading state in the report view if desired, 
    // OR wait until it has content. Let's wait until content arrives to select it, or select it now to show "Thinking".
    // For now, let's NOT select it immediately to keep the previous report visible until new one is ready, 
    // OR select it to show progress. Let's select it when it's done.

    try {
      // Step 1: Initial State
      addActivityToLastMessage("Tiếp nhận dữ liệu...", 'thinking');

      // Step 2: Call the Deep Research Service
      const response = await sendMessageToGemini(
        historyRef.current,
        userText || (currentAttachments.length > 0 ? "Phân tích file đính kèm" : ""),
        currentAttachments,
        (status) => {
          let type: ActivityLog['type'] = 'thinking';
          if (status.includes("tìm kiếm") || status.includes("nghiên cứu")) type = 'search';
          if (status.includes("tổng hợp") || status.includes("viết")) type = 'reading';

          addActivityToLastMessage(status, type);
        }
      );

      // Step 3: Finalize
      addActivityToLastMessage("Hoàn tất báo cáo.", 'done');

      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.sender === Sender.Model) {
          lastMsg.text = response.text;
          lastMsg.sources = response.sources;
          lastMsg.isThinking = false;
        }
        return newMessages;
      });

      // Auto-select the finished message
      setSelectedMessageId(placeholderModelMessage.id);

      // Update history (Construct history carefully with attachments)
      const userParts: any[] = [{ text: userText }];
      currentAttachments.forEach(att => {
        userParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      });

      historyRef.current.push(
        { role: 'user', parts: userParts },
        { role: 'model', parts: [{ text: response.text }] }
      );

    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg) {
          lastMsg.isError = true;
          lastMsg.isThinking = false;
          lastMsg.text = "Xin lỗi, hệ thống gặp sự cố khi đang nghiên cứu sâu. Vui lòng thử lại.";
        }
        return newMessages;
      });
    } finally {
      isProcessingRef.current = false;
    }
  };

  const startNewChat = () => {
    setMessages([]);
    historyRef.current = [];
    setInput('');
    setAttachments([]);
    setSelectedMessageId(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleViewReport = (message: ChatMessageType) => {
    setSelectedMessageId(message.id);
  };

  const selectedMessage = messages.find(m => m.id === selectedMessageId);

  return (
    <div className="flex h-screen bg-[#131314] overflow-hidden text-[#e3e3e3] font-sans">

      {/* Left Column: Chat & Input */}
      <div className={`flex flex-col h-full transition-all duration-300 ease-in-out ${selectedMessage ? 'w-1/2 border-r border-[#3c4043]' : 'w-full max-w-5xl mx-auto'}`}>

        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-[#131314] border-b border-[#3c4043] z-20">
          <div
            onClick={startNewChat}
            className="flex items-center gap-3 cursor-pointer group select-none"
            title="Bắt đầu cuộc trò chuyện mới"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-900/20 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-layer-group text-white text-sm"></i>
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#e3e3e3] group-hover:text-white transition-colors">Deep Research</span>
          </div>

          <button
            onClick={startNewChat}
            className="w-9 h-9 rounded-full bg-[#1e1f20] hover:bg-[#303134] text-[#9aa0a6] hover:text-[#e3e3e3] flex items-center justify-center transition-all border border-transparent hover:border-[#3c4043]"
            title="Cuộc trò chuyện mới"
          >
            <i className="fa-solid fa-plus text-sm"></i>
          </button>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 scroll-smooth">
          <div className="max-w-3xl mx-auto w-full pt-8 pb-10">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-[fadeIn_0.6s_ease-out_forwards] pt-10">
                <div className="relative mb-8 group cursor-pointer" onClick={startNewChat}>
                  <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20 rounded-full group-hover:opacity-30 transition-opacity"></div>
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#1e1f20] to-[#2d2d2d] border border-[#3c4043] flex items-center justify-center relative z-10 shadow-2xl group-hover:scale-105 transition-transform duration-300">
                    <i className="fa-solid fa-magnifying-glass-chart text-4xl text-blue-400"></i>
                  </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-semibold text-[#e3e3e3] mb-4 tracking-tight">
                  Tôi có thể giúp gì cho nghiên cứu của bạn?
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
                  {[
                    { title: "Phân tích ảnh", query: "Tải ảnh lên để tìm hiểu chi tiết về đối tượng", icon: "fa-image" },
                    { title: "Đọc tài liệu PDF", query: "Tải PDF lên để phân tích và tóm tắt nội dung", icon: "fa-file-pdf" },
                    { title: "Tra cứu kỹ thuật", query: "So sánh thông số kỹ thuật chi tiết giữa Snapdragon 8 Gen 4 và A18 Pro", icon: "fa-microchip" },
                    { title: "Lên kế hoạch", query: "Lịch trình du lịch Nhật Bản 7 ngày 6 đêm mùa lá đỏ tự túc", icon: "fa-map-location-dot" }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(item.query); if (textareaRef.current) textareaRef.current.focus(); }}
                      className="group bg-[#1e1f20] hover:bg-[#2c2d2e] p-4 rounded-xl text-left transition-all border border-[#3c4043] hover:border-[#5e6060] hover:shadow-lg flex items-start gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#303134] flex items-center justify-center group-hover:bg-[#3c4043] transition-colors shrink-0">
                        <i className={`fa-solid ${item.icon} text-[#e3e3e3]`} onError={(e) => { e.currentTarget.className = "fa-solid fa-magnifying-glass" }}></i>
                      </div>
                      <div className="min-w-0">
                        <span className="block font-medium text-[#e3e3e3] mb-1 truncate">{item.title}</span>
                        <span className="text-xs text-[#9aa0a6] line-clamp-2">{item.query}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isLast={index === messages.length - 1}
                    onViewReport={handleViewReport}
                    isSelected={selectedMessageId === msg.id}
                  />
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 bg-[#131314] pt-4 pb-6 px-4 border-t border-[#3c4043]/30 z-10">
          <div className="max-w-3xl mx-auto">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex gap-3 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group shrink-0">
                    <div className="w-16 h-16 rounded-xl border border-[#3c4043] overflow-hidden bg-[#1e1f20] flex items-center justify-center">
                      {att.mimeType.startsWith('image/') ? (
                        <img
                          src={`data:${att.mimeType};base64,${att.data}`}
                          alt="preview"
                          className="w-full h-full object-cover opacity-80"
                        />
                      ) : (
                        <i className="fa-solid fa-file-pdf text-red-400 text-2xl"></i>
                      )}
                    </div>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#3c4043] hover:bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center shadow-md transition-colors"
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`relative bg-[#1e1f20] rounded-[32px] border shadow-2xl transition-all duration-200 ${isProcessingRef.current ? 'border-[#3c4043] opacity-70 cursor-not-allowed' : 'border-[#3c4043] focus-within:border-[#7cacf8] focus-within:bg-[#252627]'}`}>
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf"
              />

              {/* Upload Button */}
              <div className="absolute left-2 bottom-2">
                <button
                  onClick={handlePaperclipClick}
                  disabled={isProcessingRef.current}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent hover:bg-[#303134] text-[#9aa0a6] hover:text-[#e3e3e3] transition-colors"
                  title="Đính kèm ảnh hoặc PDF"
                >
                  <i className="fa-solid fa-paperclip text-lg"></i>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={isProcessingRef.current}
                placeholder="Đặt câu hỏi, dán ảnh hoặc tải file lên..."
                rows={1}
                className="w-full bg-transparent text-[#e3e3e3] placeholder-[#9aa0a6] px-14 py-4 rounded-[32px] outline-none resize-none overflow-hidden max-h-[200px]"
                style={{ minHeight: '56px' }}
              />

              <div className="absolute right-2 bottom-2">
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && attachments.length === 0) || isProcessingRef.current}
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 ${(input.trim() || attachments.length > 0) && !isProcessingRef.current
                      ? 'bg-white text-[#131314] hover:bg-[#e3e3e3] scale-100'
                      : 'bg-[#303134] text-[#9aa0a6] scale-90 cursor-default'
                    }`}
                >
                  {isProcessingRef.current ? (
                    <i className="fa-solid fa-spinner animate-spin"></i>
                  ) : (
                    <i className="fa-solid fa-arrow-up"></i>
                  )}
                </button>
              </div>
            </div>
            <div className="text-center mt-3">
              <p className="text-[11px] text-[#5e6060]">
                AI có thể mắc lỗi. Vui lòng kiểm chứng thông tin quan trọng.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Report Viewer */}
      {selectedMessage && (
        <div className="w-1/2 h-full">
          <ReportViewer
            text={selectedMessage.text}
            sources={selectedMessage.sources}
            onClose={() => setSelectedMessageId(null)}
          />
        </div>
      )}

      {/* Global styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          0% { width: 0%; opacity: 0.5; }
          50% { width: 70%; opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        .animate-progress {
          animation: progress 1.5s infinite ease-in-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;