import React from 'react';

interface TypingIndicatorProps {
  searchQuery?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ searchQuery }) => {
  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex max-w-[80%] gap-4">
        <div className="flex-shrink-0 mt-1">
           <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center opacity-80">
                <i className="fa-solid fa-gem text-sm text-white"></i>
            </div>
        </div>
        <div className="flex flex-col justify-center min-h-10 py-1">
           {/* Main Thinking Line */}
           <div className="flex items-center gap-2 mb-1">
             <span className="text-blue-400 text-sm font-medium animate-pulse">Đang suy nghĩ</span>
             <div className="flex space-x-1 h-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full typing-dot"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full typing-dot"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full typing-dot"></div>
             </div>
           </div>
           
           {/* Deep Research / Search Status Line */}
           {searchQuery && (
             <div className="flex items-center gap-2 text-xs text-[#9aa0a6] animate-[fadeIn_0.5s_ease-out_forwards]">
                <i className="fa-brands fa-google text-[10px]"></i>
                <span className="truncate max-w-[250px] md:max-w-[400px]">
                  Đang tìm kiếm trên Google: <span className="italic text-[#c4c7c5]">"{searchQuery}"</span>
                </span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};