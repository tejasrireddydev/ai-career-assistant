"use client";

import React, { useState } from "react";
import { Plus, MessageSquare, Trash2, Clock, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  session_id: string;
  status: string;
  response: {
    resume: string;
    ats_score: number;
  };
  updated_at: string;
  messages?: {
    role: string;
    text: string;
  }[];
  collected?: Record<string, string>;
}

interface SidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export default function Sidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
}: SidebarProps) {
  // Default to small (collapsed) as per user request
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <aside 
      className={cn(
        "border-r border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col h-screen transition-all duration-500 ease-in-out shrink-0 relative group",
        isCollapsed ? "w-20" : "w-80"
      )}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-50 w-6 h-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-90 transition-all text-zinc-500 hover:text-blue-600"
      >
        {isCollapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
      </button>

      {/* New Chat Button */}
      <div className="p-4 flex justify-center">
        <button
          onClick={onNewChat}
          className={cn(
            "flex items-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 group overflow-hidden active:scale-95",
            isCollapsed ? "w-12 h-12 justify-center p-0" : "w-full px-4 justify-start"
          )}
          title="New Chat"
        >
          <Plus className={cn("w-5 h-5 shrink-0 transition-transform duration-300", !isCollapsed && "group-hover:rotate-90")} />
          {!isCollapsed && (
            <span className="transition-all duration-300 animate-in fade-in slide-in-from-left-2 uppercase text-xs tracking-widest whitespace-nowrap">
              New Chat
            </span>
          )}
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 no-scrollbar">
        <div className={cn("px-3 mb-4 transition-all duration-300", isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-heading">
            History
          </h2>
        </div>

        {sessions.length === 0 ? (
          <div className={cn("px-3 py-10 text-center transition-all", isCollapsed && "py-4")}>
            <Clock className="w-6 h-6 text-zinc-300 dark:text-zinc-800 mx-auto" />
            {!isCollapsed && (
              <p className="text-[10px] text-zinc-400 font-medium italic mt-2">
                No history
              </p>
            )}
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl transition-all duration-300 cursor-pointer border overflow-hidden",
                isCollapsed ? "p-1.5 justify-center border-transparent" : "px-3 py-4 border-transparent p-3",
                currentSessionId === session.session_id
                  ? "bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-900 shadow-sm ring-1 ring-blue-500/10"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-900/50",
              )}
              onClick={() => onSelectSession(session.session_id)}
              title={isCollapsed ? (session.messages?.find((m) => m.role === "user")?.text || "Chat Session") : ""}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                  currentSessionId === session.session_id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500",
                )}
              >
                <MessageSquare className="w-5 h-5 shrink-0" />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0 pr-6 animate-in fade-in slide-in-from-left-2 duration-300">
                  <p
                    className={cn(
                      "text-[13px] font-bold truncate leading-tight mb-1",
                      currentSessionId === session.session_id
                        ? "text-zinc-950 dark:text-white"
                        : "text-zinc-700 dark:text-zinc-400",
                    )}
                  >
                    {session.messages?.find((m) => m.role === "user")?.text || "Session"}
                  </p>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <Clock className="w-2.5 h-2.5" />
                    <p className="text-[9px] font-medium uppercase tracking-tighter">
                      {new Date(session.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.session_id);
                }}
                className={cn(
                  "absolute transition-all duration-200 opacity-0 group-hover:opacity-100 z-10 cursor-pointer hover:scale-110 active:scale-90",
                  isCollapsed 
                    ? "right-1 top-1 bg-white dark:bg-zinc-800 rounded-full shadow-md p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 border border-zinc-100 dark:border-zinc-700" 
                    : "right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                )}
              >
                <Trash2 className={cn(isCollapsed ? "w-3 h-3" : "w-4 h-4")} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Admin */}
      <div className={cn("p-4 border-t border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 transition-all duration-300", isCollapsed ? "p-3" : "p-4")}>
        <div className={cn("flex items-center gap-3 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden", isCollapsed ? "justify-center p-1 border-none shadow-none bg-transparent" : "p-2")}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-inner shrink-0 rotate-12 group-hover:rotate-0 transition-transform">
            JD
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Admin Console
              </p>
              <p className="text-[9px] font-bold text-zinc-400 truncate">
                Role: Creator
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
