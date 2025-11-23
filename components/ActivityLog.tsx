import React from 'react';
import { ActivityLog as ActivityLogType } from '../types';

interface ActivityLogProps {
  activities: ActivityLogType[];
  isThinking: boolean;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ activities, isThinking }) => {
  if (activities.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 py-2">
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;
        const isActive = isLast && isThinking && activity.type !== 'done';

        return (
          <div key={activity.id} className="flex items-start gap-3 text-sm animate-[fadeIn_0.3s_ease-out_forwards]">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full ${
              isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-[#303134] text-[#9aa0a6]'
            }`}>
              {activity.type === 'search' && <i className={`fa-brands fa-google text-[10px] ${isActive ? 'animate-pulse' : ''}`}></i>}
              {activity.type === 'thinking' && <i className={`fa-solid fa-microchip text-[10px] ${isActive ? 'animate-pulse' : ''}`}></i>}
              {activity.type === 'reading' && <i className={`fa-solid fa-book-open text-[10px] ${isActive ? 'animate-pulse' : ''}`}></i>}
              {activity.type === 'done' && <i className="fa-solid fa-check text-[10px] text-green-400"></i>}
            </div>
            
            <div className="flex-1">
              <span className={`block ${isActive ? 'text-blue-300' : 'text-[#c4c7c5]'}`}>
                {activity.message}
              </span>
              {isActive && (
                <div className="mt-1 h-1 w-24 bg-[#303134] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500/50 rounded-full animate-progress"></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};