import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
}

interface ChatContainerProps {
  messages: Message[];
  onResendMessage?: (index: number) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, onResendMessage }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 relative"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg, index) => (
          <ChatMessage 
            key={index} 
            role={msg.role} 
            text={msg.text} 
            isError={msg.isError}
            onResend={onResendMessage ? () => onResendMessage(index) : undefined}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatContainer;
