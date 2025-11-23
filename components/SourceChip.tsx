import React from 'react';
import { WebSource } from '../types';
import { cleanSourceUrl, getDisplayDomain } from '../utils';

interface SourceChipProps {
  source: WebSource;
  index: number;
}

export const SourceChip: React.FC<SourceChipProps> = ({ source, index }) => {

  const finalUrl = cleanSourceUrl(source.uri);
  let displayDomain = getDisplayDomain(finalUrl);

  // Fallback: If the display domain is still a google wrapper, try to use the title if it looks like a domain
  if (displayDomain.includes('vertexaisearch') || displayDomain.includes('google.com')) {
    if (source.title && source.title.includes('.') && !source.title.includes(' ')) {
      displayDomain = source.title;
    }
  }

  return (
    <a
      href={finalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 bg-[#1e1f20] hover:bg-[#2c2d2e] border border-[#3c4043] rounded-lg px-3 py-2 transition-all duration-200 no-underline hover:shadow-md hover:border-[#5e6060]"
      title={source.title}
    >
      <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#303134] text-[10px] font-bold text-[#c4c7c5] group-hover:bg-blue-600 group-hover:text-white transition-colors">
        {index + 1}
      </div>

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <img
          src={`https://www.google.com/s2/favicons?domain=${displayDomain}&sz=32`}
          alt=""
          className="w-4 h-4 rounded-sm opacity-80 group-hover:opacity-100 transition-opacity"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <span className="text-xs text-[#e3e3e3] font-medium truncate group-hover:text-blue-300 transition-colors">
          {displayDomain}
        </span>
      </div>

      <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-[#5e6060] group-hover:text-[#9aa0a6] opacity-0 group-hover:opacity-100 transition-all"></i>
    </a>
  );
};