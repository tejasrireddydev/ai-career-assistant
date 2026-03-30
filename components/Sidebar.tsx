"use client";

import React from "react";
import { Plus, MessageSquare, Trash2, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  sessions: any[];
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
  return (
    <aside className="w-80 border-r border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col h-screen transition-all duration-300 shrink-0">
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-500/20 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <div className="px-3 mb-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-heading">
            History
          </h2>
        </div>

        {sessions.length === 0 ? (
          <div className="px-3 py-10 text-center">
            <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-800 mx-auto mb-3" />
            <p className="text-xs text-zinc-400 font-medium italic">
              No past sessions found
            </p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.session_id}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-4 rounded-xl transition-all duration-200 cursor-pointer border",
                currentSessionId === session.session_id
                  ? "bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-900 shadow-md ring-1 ring-blue-500/10"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-900/50 border-transparent",
              )}
              onClick={() => onSelectSession(session.session_id)}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                  currentSessionId === session.session_id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500",
                )}
              >
                <MessageSquare className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <p
                  className={cn(
                    "text-[13px] font-bold truncate leading-tight mb-1",
                    currentSessionId === session.session_id
                      ? "text-zinc-950 dark:text-white"
                      : "text-zinc-700 dark:text-zinc-400",
                  )}
                >
                  {session.messages?.find((m: any) => m.role === "user")
                    ?.text || session.session_id.slice(0, 20) + "..."}
                </p>
                <div className="flex items-center gap-1.5 opacity-60">
                  <Clock className="w-2.5 h-2.5" />
                  <p className="text-[10px] font-medium">
                    {new Date(session.updated_at).toLocaleDateString(
                      undefined,
                      {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.session_id);
                }}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all",
                  "opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-400 hover:text-red-500",
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-2 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-inner">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-900 dark:text-white font-heading">
              Admin Console
            </p>
            <p className="text-[9px] font-bold text-zinc-400 truncate">
              Service Role Access
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
