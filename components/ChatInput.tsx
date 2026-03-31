"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (text: string, pendingKey?: string | null) => void;
  isLoading: boolean;
  pendingKey?: string | null;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  pendingKey,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim(), pendingKey);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "90px"; // Reset to new compact height
      }
    }
  };

  // Auto-resize logic but with a larger base
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset
      const newHeight = Math.max(90, Math.min(textareaRef.current.scrollHeight, 350));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  return (
    <div className="w-full transition-all duration-300">
      <form 
        onSubmit={handleSubmit} 
        className="relative group bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all p-2 flex flex-col gap-1"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type or paste your professional details..."
          disabled={isLoading}
          rows={3}
          className="w-full bg-transparent px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none resize-none min-h-[90px] max-h-[350px] overflow-y-auto scrollbar-hide block leading-relaxed"
        />
        
        <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-400 tracking-wide uppercase">
               <span className="flex items-center gap-1.5"><CornerDownLeft size={12}/> Enter to send</span>
               <span className="opacity-40">•</span>
               <span>Shift+Enter for newline</span>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "rounded-full bg-blue-600 p-3.5 text-white transition-all shadow-lg active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:shadow-none",
                input.trim() && !isLoading ? "hover:bg-blue-700 hover:shadow-blue-500/20" : ""
              )}
            >
              <Send size={20} className={cn("transition-transform duration-300", input.trim() && !isLoading ? "translate-x-0" : "scale-75")} />
            </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
