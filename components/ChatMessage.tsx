import React, { useState, useEffect } from 'react';
import { ChatMessage as ChatMessageType, Sender } from '../types';
import { ActivityLog } from './ActivityLog';

interface ChatMessageProps {
  message: ChatMessageType;
  isLast?: boolean;
  onViewReport?: (message: ChatMessageType) => void;
  isSelected?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onViewReport, isSelected }) => {
  const isUser = message.sender === Sender.User;
  const [showActivities, setShowActivities] = useState(false);

  useEffect(() => {
    if (message.isThinking) {
      setShowActivities(true);
    }
  }, [message.isThinking]);

  if (isUser) {
    return (
      <div className="flex w-full mb-8 justify-end animate-[fadeIn_0.3s_ease-out_forwards]">
        <div className="flex flex-col items-end max-w-[85%]">
          {/* Attachments Display */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap justify-end">
              {message.attachments.map(att => (
                <div key={att.id} className="w-20 h-20 rounded-lg border border-[#3c4043] overflow-hidden bg-[#1e1f20] flex items-center justify-center relative">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt="attachment" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#e3e3e3]">
                      <i className="fa-solid fa-file-pdf text-xl text-red-400 mb-1"></i>
                      <span className="text-[9px] truncate max-w-[70px] px-1">{att.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {message.text && (
            <div className="bg-[#28292a] text-[#e3e3e3] px-5 py-3 rounded-2xl rounded-tr-sm shadow-sm border border-transparent">
              <p className="whitespace-pre-wrap leading-6 font-medium text-[14px]">{message.text}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Model Message Layout
  return (
    <div className="flex w-full mb-10 justify-start group animate-[fadeIn_0.3s_ease-out_forwards]">
      <div className="flex-shrink-0 mr-4 mt-1 hidden md:block">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500 shadow-lg ${message.isThinking ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-blue-500/20' : 'bg-gradient-to-br from-blue-600 to-purple-600'}`}>
          <i className={`fa-solid fa-gem text-xs text-white ${message.isThinking ? 'animate-pulse' : ''}`}></i>
        </div>
      </div>

      <div className="flex-1 min-w-0 max-w-2xl">
        <div className={`bg-[#1e1f20] border rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${isSelected ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-[#3c4043]'}`}>

          {/* Header / Title */}
          <div className="px-4 py-2.5 border-b border-[#3c4043] flex items-center justify-between bg-[#252627]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] tracking-widest text-[#9aa0a6] uppercase font-mono">
                Research Agent
              </span>
            </div>

            {/* Expand/Collapse Activities Toggle */}
            {message.activities && message.activities.length > 0 && (
              <button
                onClick={() => setShowActivities(!showActivities)}
                className={`text-[10px] flex items-center gap-1.5 px-2 py-1 rounded-md transition-all font-medium ${showActivities ? 'bg-[#303134] text-white' : 'text-[#9aa0a6] hover:bg-[#303134] hover:text-white'}`}
              >
                {showActivities ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Ẩn quy trình
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-list-check"></i>
                    Xem quy trình
                  </>
                )}
              </button>
            )}
          </div>

          {/* Activities Section */}
          {message.activities && message.activities.length > 0 && showActivities && (
            <div className="bg-[#18191a] px-4 py-3 border-b border-[#3c4043] max-h-[300px] overflow-y-auto custom-scrollbar">
              <ActivityLog activities={message.activities} isThinking={!!message.isThinking} />
            </div>
          )}

          {/* Result Summary Card */}
          <div className="p-5 bg-[#1e1f20]">
            {message.isThinking ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
                  </div>
                  <span className="text-[#e3e3e3] text-sm font-medium animate-pulse">Đang nghiên cứu...</span>
                </div>
                <p className="text-[#9aa0a6] text-xs pl-4 border-l-2 border-[#3c4043]">
                  Hệ thống đang phân tích yêu cầu và tìm kiếm thông tin từ nhiều nguồn để tổng hợp báo cáo chi tiết nhất cho bạn.
                </p>
              </div>
            ) : message.text ? (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#e3e3e3] mb-1 line-clamp-1">
                    {message.text.split('\n')[0].replace(/^#+\s*/, '') || "Báo cáo hoàn tất"}
                  </h3>
                  <p className="text-[#9aa0a6] text-sm line-clamp-2">
                    {message.text.split('\n').slice(1).find(l => l.trim().length > 0) || "Đã tổng hợp thông tin chi tiết."}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-2 pt-4 border-t border-[#3c4043]/50">
                  <div className="flex items-center gap-2 text-xs text-[#9aa0a6]">
                    <i className="fa-solid fa-layer-group"></i>
                    <span>{message.sources?.length || 0} nguồn tham khảo</span>
                  </div>
                  <button
                    onClick={() => onViewReport && onViewReport(message)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'bg-[#303134] text-[#e3e3e3] hover:bg-[#3c4043] hover:text-white'}`}
                  >
                    <span>Xem báo cáo chi tiết</span>
                    <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            ) : null}

            {message.isError && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-xs flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-red-400"></i>
                <span>{message.text || "Có lỗi xảy ra."}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};