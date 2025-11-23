export enum Sender {
  User = 'user',
  Model = 'model',
}

export interface WebSource {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: WebSource;
}

export interface ActivityLog {
  id: string;
  type: 'thinking' | 'search' | 'reading' | 'done';
  message: string;
  timestamp: number;
}

export interface Attachment {
  id: string;
  mimeType: string;
  data: string; // Base64 string
  name: string; // File name for display
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  sources?: WebSource[];
  attachments?: Attachment[];
  isError?: boolean;
  isThinking?: boolean;
  activities?: ActivityLog[];
}

export interface ChatSession {
  history: {
    role: string;
    parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
  }[];
}