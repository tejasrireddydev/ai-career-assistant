"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
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
        className="relative group bg-white rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_rgba(37,99,235,0.06)] focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all p-2 flex flex-col gap-1 overflow-hidden"
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
          placeholder="My name is..., I am a BTech student..., I specialize in..., I have experience with..., My projects are..."
          disabled={isLoading}
          rows={3}
          className="w-full bg-transparent px-6 py-5 text-sm font-black text-slate-800 placeholder:text-slate-300 focus:outline-none resize-none min-h-[120px] max-h-[400px] overflow-y-auto no-scrollbar block leading-relaxed selection:bg-blue-100"
        />
        
        <div className="flex items-center justify-end px-4 pb-4">
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                "w-12 h-12 rounded-2xl bg-blue-600 text-white transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-20 disabled:scale-90 disabled:shadow-none flex items-center justify-center",
                input.trim() && !isLoading ? "hover:bg-blue-700 hover:-translate-y-1" : ""
              )}
            >
              <Send size={20} className={cn("transition-transform duration-500", input.trim() && !isLoading ? "translate-x-0 rotate-0" : "-translate-x-4 -rotate-45")} />
            </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
