import React from 'react';
import { WebSource } from '../types';
import { SourceChip } from './SourceChip';

interface ReportViewerProps {
    text: string;
    sources?: WebSource[];
    onClose?: () => void;
}

// Function to strip emojis but KEEP markdown structure characters
const cleanTextContent = (text: string) => {
    return text
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();
};

const parseInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
                <strong key={index} className="font-bold text-white bg-[#303134]/50 px-1 rounded-sm mx-0.5">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return part;
    });
};

// Advanced Markdown Parser
const formatText = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const renderedLines: React.ReactNode[] = [];

    let inTable = false;
    let tableRows: string[][] = [];

    const processTable = () => {
        if (tableRows.length > 0) {
            const header = tableRows[0];
            const body = tableRows.slice(2); // Skip separator row

            renderedLines.push(
                <div key={`table-${Date.now()}-${renderedLines.length}`} className="my-8 overflow-x-auto rounded-xl border border-[#3c4043] bg-[#1e1f20] shadow-sm">
                    <table className="min-w-full text-sm text-left text-[#e3e3e3]">
                        <thead className="bg-[#2d2d2d] uppercase text-xs font-bold text-[#e3e3e3] tracking-wider">
                            <tr>
                                {header.map((h, i) => (
                                    <th key={i} className="px-6 py-4 border-b border-[#3c4043] whitespace-nowrap bg-[#303134]">
                                        {cleanTextContent(h)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3c4043]">
                            {body.map((row, i) => (
                                <tr key={i} className="hover:bg-[#3c4043]/30 transition-colors">
                                    {row.map((cell, j) => (
                                        <td key={j} className="px-6 py-4 text-[#c4c7c5] leading-relaxed border-r border-[#3c4043]/30 last:border-r-0">
                                            {parseInlineFormatting(cleanTextContent(cell))}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            tableRows = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmedLine = rawLine.trim();

        // 1. Table Handling
        if (trimmedLine.startsWith('|')) {
            inTable = true;
            tableRows.push(trimmedLine.split('|').filter(c => c.trim() !== '').map(c => c.trim()));
            if (i === lines.length - 1 || !lines[i + 1].trim().startsWith('|')) {
                processTable();
                inTable = false;
            }
            continue;
        }

        // 2. Heading Handling
        if (trimmedLine.startsWith('#')) {
            const level = trimmedLine.match(/^#+/)?.[0].length || 0;
            const content = cleanTextContent(trimmedLine.replace(/^#+\s/, ''));

            if (level === 1) {
                renderedLines.push(
                    <h1 key={i} className="text-3xl md:text-4xl font-bold text-white mt-10 mb-6 pb-4 border-b border-[#3c4043] tracking-tight">
                        {content}
                    </h1>
                );
            } else if (level === 2) {
                renderedLines.push(
                    <h2 key={i} className="text-xl md:text-2xl font-bold text-[#8ab4f8] mt-8 mb-4 flex items-center gap-3">
                        {content}
                    </h2>
                );
            } else {
                renderedLines.push(
                    <h3 key={i} className="text-lg font-semibold text-[#e3e3e3] mt-6 mb-2 ml-1">
                        {content}
                    </h3>
                );
            }
            continue;
        }

        // 3. List Handling
        const listMatch = rawLine.match(/^(\s*)([-*]|\d+\.)\s+(.*)/);
        if (listMatch) {
            const [, spacing, marker, content] = listMatch;
            const indentLevel = Math.floor(spacing.length / 2);
            const isOrdered = /^\d+\./.test(marker);
            const cleanedContent = cleanTextContent(content);

            renderedLines.push(
                <div
                    key={i}
                    className="flex items-start mb-2 relative"
                    style={{ marginLeft: `${indentLevel * 1.5}rem` }}
                >
                    <div className="flex-shrink-0 mt-2 mr-3 w-5 flex justify-center">
                        {isOrdered ? (
                            <span className="font-mono text-[#9aa0a6] text-sm font-bold">{marker}</span>
                        ) : (
                            <span className={`rounded-full bg-[#9aa0a6] ${indentLevel === 0 ? 'w-1.5 h-1.5' : indentLevel === 1 ? 'w-1.5 h-1.5 border border-[#9aa0a6] bg-transparent' : 'w-1 h-1 bg-[#5e6060]'}`}></span>
                        )}
                    </div>
                    <div className="text-[#e3e3e3] leading-7 text-[15px]">
                        {parseInlineFormatting(cleanedContent)}
                    </div>
                </div>
            );
            continue;
        }

        // 4. Empty Lines
        if (trimmedLine === '') {
            renderedLines.push(<div key={i} className="h-4"></div>);
            continue;
        }

        // 5. Regular Paragraph
        renderedLines.push(
            <p key={i} className="mb-3 text-[#c4c7c5] leading-relaxed text-[15px] pl-1">
                {parseInlineFormatting(cleanTextContent(rawLine))}
            </p>
        );
    }

    return <div className="font-sans antialiased text-base selection:bg-blue-500/30 selection:text-white">{renderedLines}</div>;
};

export const ReportViewer: React.FC<ReportViewerProps> = ({ text, sources, onClose }) => {
    return (
        <div className="h-full flex flex-col bg-[#1e1f20] border-l border-[#3c4043] shadow-2xl animate-[slideInRight_0.3s_ease-out]">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-[#3c4043] flex items-center justify-between bg-[#252627]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                        <i className="fa-solid fa-file-lines text-white text-sm"></i>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-[#e3e3e3] uppercase tracking-wide">Báo cáo chi tiết</h2>
                        <p className="text-[10px] text-[#9aa0a6]">Được tạo bởi Deep Research AI</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigator.clipboard.writeText(text)}
                        className="w-8 h-8 rounded-full hover:bg-[#303134] text-[#9aa0a6] hover:text-white flex items-center justify-center transition-colors"
                        title="Sao chép"
                    >
                        <i className="fa-regular fa-copy"></i>
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full hover:bg-[#303134] text-[#9aa0a6] hover:text-white flex items-center justify-center transition-colors"
                            title="Đóng"
                        >
                            <i className="fa-solid fa-times"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                <div className="max-w-3xl mx-auto">
                    {formatText(text)}

                    {/* Sources Section */}
                    {sources && sources.length > 0 && (
                        <div className="mt-12 pt-8 border-t border-[#3c4043] border-dashed">
                            <h3 className="text-xs font-bold text-[#9aa0a6] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <i className="fa-solid fa-quote-right"></i>
                                Nguồn tham khảo ({sources.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {sources.map((source, idx) => (
                                    <SourceChip key={`${idx}-${source.uri}`} source={source} index={idx} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e1f20;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3c4043;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5e6060;
        }
      `}</style>
        </div>
    );
};
