import React, { useState } from 'react';
import { AlertCircle, RefreshCcw, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  onResend?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, text, isError, onResend }) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={cn("flex flex-col gap-1 max-w-[80%] group", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-[14px] shadow-sm relative transition-all",
            isUser
              ? isError 
                ? 'bg-red-50 text-red-900 border border-red-200/50 rounded-tr-none'
                : 'bg-blue-600 text-white rounded-tr-none'
              : 'bg-white text-zinc-800 border border-zinc-100 rounded-tl-none dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-100'
          )}
        >
          <div className="flex items-start gap-2">
            {isUser && isError && (
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            )}
            <p className="whitespace-pre-wrap leading-relaxed min-w-0 break-words">{text}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn("flex items-center gap-2 mt-1 transition-opacity", (isUser && isError) || copied ? "opacity-100" : "opacity-0 group-hover:opacity-100", isUser ? "mr-1" : "ml-1")}>
          {isUser && isError && (
            <button
              onClick={onResend}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-white dark:bg-zinc-800 text-red-600 border border-red-100 dark:border-red-900/30 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shadow-sm"
            >
              <RefreshCcw className="w-3 h-3" />
              Resend
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase bg-white dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
