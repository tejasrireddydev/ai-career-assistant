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
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={cn("flex flex-col gap-2 max-w-[85%] group", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-[2rem] px-6 py-4 text-[13px] shadow-2xl transition-all relative",
            isUser
              ? isError 
                ? 'bg-red-50 text-red-900 border border-red-100 rounded-tr-none'
                : 'bg-blue-600 text-white rounded-tr-none font-black tracking-tight shadow-blue-500/20 shadow-xl'
              : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none font-bold leading-relaxed shadow-slate-200/40'
          )}
        >
          <div className="flex items-start gap-3">
            {isUser && isError && (
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            )}
            <p className="whitespace-pre-wrap min-w-0 break-words">{text}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={cn("flex items-center gap-3 mt-1 transition-opacity", (isUser && isError) || copied ? "opacity-100" : "opacity-0 group-hover:opacity-100", isUser ? "mr-2" : "ml-2")}>
          {isUser && isError && (
            <button
              onClick={onResend}
              className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-black tracking-widest uppercase bg-white text-red-600 border border-red-100 rounded-2xl hover:bg-red-50 transition-all shadow-sm active:scale-95"
            >
              <RefreshCcw className="w-3 h-3" />
              Resend
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-black tracking-widest uppercase bg-white text-slate-400 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
