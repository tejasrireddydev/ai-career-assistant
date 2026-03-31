"use client";

import React, { useState, useMemo } from "react";
import { Plus, MessageSquare, Trash2, Clock, ChevronsLeft, ChevronsRight, Sparkles, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  session_id: string;
  status: string;
  response?: {
    resume?: string;
    ats_score?: number;
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
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Group sessions by time
  const groupedSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { title: string; items: Session[] }[] = [
      { title: "Today", items: [] },
      { title: "Yesterday", items: [] },
      { title: "Previous", items: [] },
    ];

    sessions.forEach((s) => {
      const date = new Date(s.updated_at);
      if (date >= today) groups[0].items.push(s);
      else if (date >= yesterday) groups[1].items.push(s);
      else groups[2].items.push(s);
    });

    return groups.filter(g => g.items.length > 0);
  }, [sessions]);

  return (
    <aside 
      className={cn(
        "border-r border-slate-200/60 bg-[#fbfcfd] flex flex-col h-screen transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 relative group z-30 shadow-none",
        isCollapsed ? "w-20" : "w-80"
      )}
    >
      {/* Visual background texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Collapse Toggle Button - Refined Position */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3.5 top-10 z-50 w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all text-slate-400 hover:text-blue-600 hover:border-blue-400 group/toggle",
          isCollapsed ? "rotate-0" : "rotate-0"
        )}
      >
        <div className="transition-transform duration-500 group-hover/toggle:scale-125">
          {isCollapsed ? <ChevronsRight size={14} strokeWidth={3} /> : <ChevronsLeft size={14} strokeWidth={3} />}
        </div>
      </button>

      {/* Top Action Header - Sticky */}
      <div className={cn("px-4 py-6 border-b border-slate-100 bg-white/40 backdrop-blur-md sticky top-0 z-20 transition-all duration-500", isCollapsed ? "flex justify-center" : "px-6")}>
        <button
          onClick={onNewChat}
          className={cn(
            "flex items-center gap-4 py-4 rounded-3xl bg-slate-900 hover:bg-black text-white font-black transition-all shadow-xl shadow-slate-900/10 group overflow-hidden active:scale-95 relative",
            isCollapsed ? "w-12 h-12 justify-center p-0" : "w-full px-8 justify-start"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <Plus className={cn("w-5 h-5 shrink-0 transition-all duration-500 relative z-10", !isCollapsed && "group-hover:rotate-180")} />
          {!isCollapsed && (
            <span className="relative z-10 transition-all duration-700 animate-in fade-in slide-in-from-left-6 uppercase text-[10px] font-black tracking-[0.2em] whitespace-nowrap">
              Launch New
            </span>
          )}
        </button>
      </div>


      {/* History List */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-8 no-scrollbar relative">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 transition-all opacity-20">
             <div className="w-12 h-12 border-2 border-dashed border-slate-300 rounded-[1.5rem] flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-400" />
             </div>
             {!isCollapsed && <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mt-4">Empty Pad</p>}
          </div>
        ) : (
          groupedSessions.map((group) => (
            <div key={group.title} className="space-y-4">
               {!isCollapsed && (
                 <div className="flex items-center gap-3 px-2">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300 whitespace-nowrap">{group.title}</h3>
                    <div className="h-px bg-slate-100 flex-1" />
                 </div>
               )}
               {isCollapsed && <div className="h-px bg-slate-100 mx-2" />}
               
               <div className="space-y-1.5">
                 {group.items.map((session) => (
                   <div
                     key={session.session_id}
                     onClick={() => onSelectSession(session.session_id)}
                     className={cn(
                       "group relative flex items-center rounded-3xl transition-all duration-500 cursor-pointer overflow-hidden",
                       isCollapsed ? "p-2.5 justify-center" : "px-4 py-3.5",
                       currentSessionId === session.session_id 
                         ? "bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 ring-1 ring-blue-500/5" 
                         : "hover:bg-slate-50/80"
                     )}
                   >
                     {/* Icon Backdrop */}
                     <div className={cn(
                       "shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 relative",
                       currentSessionId === session.session_id 
                         ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                         : "bg-white text-slate-400 border border-slate-100 shadow-sm group-hover:border-blue-100 group-hover:text-blue-500"
                     )}>
                        {session.status === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : session.status === 'generating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                        {session.status === 'generating' && (
                           <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full animate-ping" />
                        )}
                     </div>

                     {!isCollapsed && (
                       <div className="flex-1 min-w-0 ml-4 animate-in fade-in slide-in-from-left-4 duration-700">
                         <p className={cn(
                           "text-xs font-black truncate tracking-tight mb-1",
                           currentSessionId === session.session_id ? "text-slate-900" : "text-slate-600"
                         )}>
                            {session.messages?.find(m => m.role === 'user')?.text || "Untitled Mission"}
                         </p>
                         <div className="flex items-center gap-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                               {new Date(session.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="w-1 h-1 bg-slate-200 rounded-full" />
                            <p className={cn(
                              "text-[9px] font-black uppercase tracking-widest",
                              session.status === 'complete' ? "text-emerald-500" : "text-blue-500"
                            )}>
                               {session.status}
                            </p>
                         </div>
                       </div>
                     )}

                     {!isCollapsed && (
                       <button
                         onClick={(e) => { e.stopPropagation(); onDeleteSession(session.session_id); }}
                         className="absolute right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                       >
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          ))
        )}
      </div>


      {/* Footer Profile */}
      <div className={cn("p-6 transition-all duration-500 flex justify-center", isCollapsed ? "p-4" : "p-6")}>
        <div className={cn(
          "bg-white rounded-3xl border border-slate-100 p-3 transition-all duration-700 shadow-sm relative group/profile",
          isCollapsed ? "w-12 h-12 p-0 border-none shadow-none bg-transparent" : "w-full flex items-center gap-3"
        )}>
          <div className="relative w-9 h-9 shrink-0">
             <div className="absolute inset-0 bg-blue-600 rounded-[1rem] shadow-lg shadow-blue-500/10" />
             <div className="absolute inset-0 bg-slate-900 rounded-[1rem] flex items-center justify-center text-white scale-95">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
             </div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
               <p className="text-[10px] font-black text-slate-900 uppercase tracking-wider leading-none mb-1">Voyager Prime</p>
               <div className="flex items-center gap-1.5 opacity-60">
                  <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
               </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
