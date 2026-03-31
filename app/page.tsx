"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Sparkles, Wand2, Terminal, Activity, Plus, FileText, CheckCircle2, Star, ExternalLink, Briefcase, GraduationCap, ArrowRight } from "lucide-react";
import ChatContainer from "@/components/ChatContainer";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import ResumeSection from "@/components/ResumeSection";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface SessionResponse {
  resume: string;
  ats_score?: number;
  suggested_roles?: string[];
  recommended_courses?: string[];
  questions?: string[];
  data?: {
    collected?: Record<string, string>;
    resume?: string;
    ats_score?: number;
    suggested_roles?: string[];
    recommended_courses?: string[];
    questions?: string[];
  };
  response?: {
    resume?: string;
    ats_score?: number;
    suggested_roles?: string[];
    recommended_courses?: string[];
    questions?: string[];
  };
  collected?: Record<string, string>;
  status?: string;
}

interface SessionData {
  session_id: string;
  status: string;
  response: SessionResponse;
  updated_at: string;
  messages?: Message[];
  collected?: Record<string, string>;
}

const INITIAL_MESSAGE = "Welcome to your AI Career Assistant. Tell me about your background, skills, and goals in a single paragraph, and I'll build your professional resume instantly.";

const LOG_MILESTONES = [
  { t: 2, log: "📡 Establishing Neural Link..." },
  { t: 5, log: "🧠 Analyzing Career DNA..." },
  { t: 8, log: "📄 Synthesizing Professional Narrative..." },
  { t: 12, log: "⚡ Optimizing ATS Vector Alignment..." },
  { t: 15, log: "🛰️ Awaiting Final Background Sync..." },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("session") || uuidv4();
    }
    return "booting";
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: INITIAL_MESSAGE }]);
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<string>("");
  const [atsScore, setAtsScore] = useState<number>(0);
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [genLogs, setGenLogs] = useState<string[]>([]);

  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const latestCollectedRef = useRef<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSwitchingSessionRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);
  
  const lastSavedStateRef = useRef<{ messagesStr: string; collectedStr: string; resume: string }>({ 
    messagesStr: "", 
    collectedStr: "", 
    resume: "" 
  });

  const sanitizeResume = useCallback((raw: string) => {
    if (!raw || typeof raw !== 'string') return { resume: "", roles: [], courses: [] };
    let clean = raw;
    let roles: string[] = [];
    let courses: string[] = [];

    const careerMatch = clean.match(/(CAREER SUGGESTIONS|Career Suggestions|Career Suggestions:|CAREER PATHWAYS)[\s\S]*?(?=RECOMMENDED COURSES|Recommended Courses|Recommended Courses:|UPSKILLING ROADMAP|$)/i);
    if (careerMatch) {
       roles = careerMatch[0].replace(/(CAREER SUGGESTIONS|Career Suggestions|Career Suggestions:|CAREER PATHWAYS|#|[:\[\]"])/gi, "")
         .split(/\n|,/)
         .map((s: string) => s.trim().replace(/^[-*•]\s+/, ""))
         .filter((s: string) => s.length > 3);
    }

    const courseMatch = clean.match(/(RECOMMENDED COURSES|Recommended Courses|Recommended Courses:|UPSKILLING ROADMAP)[\s\S]*$/i);
    if (courseMatch) {
       courses = courseMatch[0].replace(/(RECOMMENDED COURSES|Recommended Courses|Recommended Courses:|UPSKILLING ROADMAP|#|[:\[\]"])/gi, "")
         .split(/\n|,/)
         .map((s: string) => s.trim().replace(/^[-*•]\s+/, ""))
         .filter((s: string) => s.length > 5);
    }

    const headers = [
      "CAREER SUGGESTIONS", "Career Suggestions", "CAREER PATHWAYS", "Career Pathways",
      "RECOMMENDED COURSES", "Recommended Courses", "UPSKILLING ROADMAP", "Upskilling Roadmap"
    ];
    
    let earliestPos = -1;
    headers.forEach(h => {
      const pos = clean.indexOf(h);
      if (pos !== -1 && (earliestPos === -1 || pos < earliestPos)) {
        const mdPos = clean.lastIndexOf("#", pos);
        if (mdPos !== -1 && pos - mdPos < 10) {
           earliestPos = mdPos;
        } else {
           earliestPos = pos;
        }
      }
    });

    if (earliestPos !== -1) clean = clean.substring(0, earliestPos).trim();
    return { resume: clean, roles, courses };
  }, []);

  const fetchSessions = useCallback(async (signal?: AbortSignal) => {
    if (!supabase.current) return;
    try {
      const { data } = await supabase.current.from("sessions").select("*").order("updated_at", { ascending: false }).abortSignal(signal as any);
      if (data) setSessions(data as SessionData[]);
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Fetch Sessions Error:", err);
    }
  }, []);

  // Centralized state updater to ensure consistency across Realtime, Polling, and API
  const syncSessionState = useCallback((updated: SessionData) => {
    if (!updated) return;
    
    // Update Messages if they've changed
    if (updated.messages && JSON.stringify(updated.messages) !== JSON.stringify(messages)) {
      setMessages(updated.messages);
    }
    
    // Update Collected Data
    if (updated.collected) setCollected(updated.collected);

    const parsedResponse = (typeof updated.response === "string" ? JSON.parse(updated.response) : updated.response) as SessionResponse;
    const resumeData = parsedResponse?.resume || parsedResponse?.data?.resume || parsedResponse?.response?.resume || "";
    const score = parsedResponse?.ats_score || parsedResponse?.response?.ats_score;
    const apiRoles = parsedResponse?.suggested_roles || parsedResponse?.data?.suggested_roles || parsedResponse?.response?.suggested_roles || [];
    const apiCourses = parsedResponse?.recommended_courses || parsedResponse?.data?.recommended_courses || parsedResponse?.response?.recommended_courses || [];

    if (resumeData && typeof resumeData === 'string' && resumeData.length > 50) {
      const { resume: clean, roles, courses } = sanitizeResume(resumeData);
      setResume(clean);
      setAtsScore(score || 85);
      setSuggestedRoles(roles.length > 0 ? roles : apiRoles);
      setRecommendedCourses(courses.length > 0 ? courses : apiCourses);
      
      setIsLoading(false);
      setIsComplete(true);
      setIsError(false);
    } else if (updated.status === 'complete' && !resumeData) {
      // It's marked complete but no resume? Probably an extraction fail
      setIsLoading(false);
    } else if (updated.status === 'questions') {
      setIsLoading(false);
    }
  }, [messages, sanitizeResume]);

  const handleSelectSession = useCallback(async (sid: string) => {
    if (!sid || sid === "booting" || !supabase.current) return;
    isSwitchingSessionRef.current = true;
    setSessionId(sid);
    setIsLoading(false);
    setIsComplete(false);
    setIsError(false);
    setGenLogs([]);
    const { data } = await supabase.current.from("sessions").select("*").eq("session_id", sid).maybeSingle();
    if (data) {
      syncSessionState(data as SessionData);
      lastSavedStateRef.current = { 
        messagesStr: JSON.stringify(data.messages || []), 
        collectedStr: JSON.stringify(data.collected || {}), 
        resume: resume // Note: resume might be stale in this line but syncSessionState handles the state update
      };
    }
    if (typeof window !== "undefined") window.history.pushState({}, "", `?session=${sid}`);
    setTimeout(() => { isSwitchingSessionRef.current = false; }, 100);
  }, [syncSessionState, sessionId, resume]);

  const handleStartOver = useCallback(() => {
    isSwitchingSessionRef.current = true;
    const newId = uuidv4();
    setSessionId(newId);
    setMessages([{ role: "assistant", text: INITIAL_MESSAGE }]);
    setCollected({}); setResume(""); setAtsScore(0); setSuggestedRoles([]); setRecommendedCourses([]); setIsComplete(false); setIsError(false); setIsLoading(false); setGenLogs([]);
    lastSavedStateRef.current = { messagesStr: "", collectedStr: "", resume: "" };
    if (typeof window !== "undefined") window.history.pushState({}, "", `?session=${newId}`);
    setTimeout(() => { isSwitchingSessionRef.current = false; }, 100);
  }, []);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    const controller = new AbortController();
    supabase.current = createClient();
    const initialize = async () => {
      setMounted(true);
      await fetchSessions(controller.signal);
      let sId = sessionId;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("session");
        if (urlId) sId = urlId;
      }
      if (sId && sId !== "booting") handleSelectSession(sId);
    };
    initialize();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = useCallback(async () => {
    if (!sessionId || sessionId === "booting" || !supabase.current) return;
    const messagesStr = JSON.stringify(messages);
    const collectedStr = JSON.stringify(collected);
    if (messagesStr === lastSavedStateRef.current.messagesStr && collectedStr === lastSavedStateRef.current.collectedStr && resume === lastSavedStateRef.current.resume) return;
    try {
      await supabase.current.from("sessions").upsert({
        session_id: sessionId, messages, collected, status: isComplete ? "complete" : (isLoading ? "generating" : (resume && resume.length > 50 ? "complete" : "questions")),
        response: { resume, ats_score: atsScore, suggested_roles: suggestedRoles, recommended_courses: recommendedCourses },
        updated_at: new Date().toISOString(),
      });
      lastSavedStateRef.current = { messagesStr, collectedStr, resume };
      await fetchSessions();
    } catch (err) { console.error("Persist Session Error:", err); }
  }, [sessionId, messages, collected, resume, atsScore, suggestedRoles, recommendedCourses, isComplete, isLoading, fetchSessions]);

  useEffect(() => {
    if (!mounted || sessionId === "booting" || isSwitchingSessionRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(persistSession, 1200);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [messages, collected, resume, persistSession, mounted, sessionId]);

  // Realtime Sync Listener - Primary update mechanism
  useEffect(() => {
    if (!sessionId || sessionId === "booting" || !supabase.current) return;
    const channel = supabase.current
      .channel(`session-${sessionId}-updates`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `session_id=eq.${sessionId}` }, (payload: { new: SessionData }) => {
          syncSessionState(payload.new);
      }).subscribe();
    return () => { if (supabase.current) supabase.current.removeChannel(channel); };
  }, [sessionId, syncSessionState]);

  // Smart Polling Fallback - Secondary reliability layer (only runs while loading)
  useEffect(() => {
    if (!isLoading || !sessionId || sessionId === "booting" || !supabase.current) return;
    
    const interval = setInterval(async () => {
      if (!supabase.current) return;
      const { data } = await supabase.current.from("sessions").select("*").eq("session_id", sessionId).maybeSingle();
      if (data) {
        syncSessionState(data as SessionData);
      }
    }, 4000); // Poll every 4s while loading as a safety net

    return () => clearInterval(interval);
  }, [isLoading, sessionId, syncSessionState]);

  useEffect(() => { latestCollectedRef.current = collected; }, [collected]);

  const processResponse = useCallback((status: string, response: SessionResponse) => {
    try {
      const parsed = (typeof response === "string" ? JSON.parse(response) : response) as SessionResponse;
      if (!parsed) { if (status === 'questions') setIsLoading(false); return; }
      
      const apiData = parsed.collected || parsed.data?.collected;
      if (apiData) setCollected(prev => ({ ...prev, ...apiData }));
      
      let resContent = parsed?.resume || parsed?.data?.resume || parsed?.response?.resume;
      if (resContent && typeof resContent === 'string' && resContent.length > 50) {
        // Immediate update if API payload is rich
        const { resume: cleanRes, roles, courses } = sanitizeResume(resContent);
        setResume(cleanRes);
        setAtsScore(parsed?.ats_score || parsed?.data?.ats_score || 85);
        setSuggestedRoles(roles.length > 0 ? roles : (parsed?.suggested_roles || []));
        setRecommendedCourses(courses.length > 0 ? courses : (parsed?.recommended_courses || []));
        setIsComplete(true);
        setIsLoading(false);
        setMessages(prev => [...prev, { role: "assistant", text: "Your professional resume is generated!" }]);
        setTimeout(persistSession, 100);
      } else {
        // Just questions, let the UI reflect them
        const questionsFromResponse = parsed?.questions || parsed?.data?.questions || parsed?.response?.questions || [];
        if (questionsFromResponse.length > 0) {
           setIsLoading(false);
           setMessages(prev => [...prev, ...questionsFromResponse.map((text: string) => ({ role: "assistant" as const, text }))]);
        }
      }
    } catch (e) { console.error("API Parsing Fail:", e); setIsLoading(false); }
  }, [sanitizeResume, persistSession]);

  useEffect(() => {
    let logInt: NodeJS.Timeout | null = null;
    const start = Date.now();
    if (isLoading && !isComplete) {
       logInt = setInterval(() => {
          const elapsed = (Date.now() - start) / 1000;
          setGenLogs(prev => {
             const m = LOG_MILESTONES.find(milestone => milestone.t <= elapsed && !prev.includes(milestone.log));
             const nextLogs = m ? [...prev, m.log] : prev;
             if (elapsed > 16 && !nextLogs.includes("🛰️ Awaiting Final Background Sync...")) return [...nextLogs, "🛰️ Awaiting Final Background Sync..."];
             return nextLogs;
          });
       }, 1000);
    }
    return () => { if (logInt) clearInterval(logInt); };
  }, [isLoading, isComplete]);

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;
    const newCollected = { ...latestCollectedRef.current, general: userInput.trim() };
    setCollected(newCollected); setMessages(prev => [...prev, { role: "user", text: userInput }]);
    setIsLoading(true); setIsError(false); setGenLogs(["Initializing Digital Handshake..."]); setIsComplete(false); 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);
    try {
      const res = await fetch("/api/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessionId, user_input: userInput, collected: newCollected }), signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.status === 'questions' || data.status === 'complete' || data.status === 'error') {
        processResponse(data.status, data.response);
      }
    } catch (err: any) { 
      clearTimeout(timeoutId); setIsLoading(false); 
      if (err.name === 'AbortError') { setIsError(true); setMessages(prev => [...prev, { role: "assistant", text: "Request timed out after 40 seconds." }]); }
      else { setIsError(true); }
    }
  };

  const parseRoadmap = (course: string) => {
    const urlMatch = course.match(/https?:\/\/[^\s|]+/g);
    const url = urlMatch ? urlMatch[0] : null;
    const cleanText = course.replace(/https?:\/\/[^\s|]+/g, "").replace(/\|/g, " ").trim();
    return { url, text: cleanText };
  };

  if (!mounted) return <div className="h-screen w-screen bg-[#f8fafc]" />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] font-sans selection:bg-blue-100 selection:text-blue-900">
      <Sidebar sessions={sessions} currentSessionId={sessionId} onSelectSession={handleSelectSession} onNewChat={handleStartOver} onDeleteSession={(sid) => { if (!supabase.current) return; supabase.current.from("sessions").delete().eq("session_id", sid).then(() => { if (sid === sessionId) handleStartOver(); fetchSessions(); }); }} />
      <main className="flex-1 flex flex-col md:flex-row h-full relative overflow-hidden">
        <div className="flex flex-col w-full md:w-[420px] border-r border-slate-200 bg-white z-10">
          <header className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-20">
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2"><div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"><Wand2 className="w-4 h-4 text-white" /></div>AI Resume Builder</h1>
            {isComplete && <button onClick={handleStartOver} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600"><Plus className="w-5 h-5" /></button>}
          </header>
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scroll-smooth no-scrollbar">
               <ChatContainer messages={messages} />
               {isLoading && genLogs.length > 0 && (
                 <div className="space-y-4 pt-4">
                    <div className="p-5 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden border border-white/10">
                       <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2"><Terminal className="w-3 h-3" /> Orchestrator v14.0</p>
                          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                       </div>
                       <div className="space-y-2 max-h-[150px] overflow-y-auto scroll-smooth no-scrollbar">
                          {genLogs.map((log, i) => (<div key={i} className="flex gap-3 text-[10px] font-mono text-slate-400 animate-in fade-in slide-in-from-left-2 duration-300"><span>{log}</span></div>))}
                       </div>
                    </div>
                 </div>
               )}
               <div ref={messagesEndRef} />
            </div>
            <div className="p-6 bg-white border-t border-slate-100 relative shadow-sm">
              {isError ? (
                <div className="p-6 bg-red-50 rounded-3xl border border-red-100 flex flex-col gap-4 animate-in zoom-in-95 duration-300 text-center">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-widest">Generation stalled or content missing</p>
                  <button onClick={() => { if (collected.general) handleSendMessage(collected.general); }} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200">Re-Trigger AI Generator</button>
                </div>
              ) : <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />}
            </div>
          </div>
        </div>
        <div className="flex-1 h-full overflow-y-auto bg-[#f8fafc] no-scrollbar">
          {!resume && !isLoading ? (
             <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-sm flex items-center justify-center"><FileText className="w-10 h-10 text-slate-100" /></div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Your Resume Preview</h3>
             </div>
          ) : (
            <div className="p-6 md:p-12 space-y-20 max-w-[1200px] mx-auto">
              {isComplete && !isLoading && (
                <div className="flex items-center justify-center gap-3 py-4 px-8 bg-emerald-50 text-emerald-700 rounded-3xl border border-emerald-100 shadow-sm animate-in slide-in-from-top-4 duration-700 mx-auto w-fit">
                   <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white"><CheckCircle2 className="w-5 h-5" /></div>
                   <span className="text-xs font-black uppercase tracking-widest">Your professional resume is ready 👇</span>
                </div>
              )}
              <div id="resume-container">
                <ResumeSection resume={resume} atsScore={atsScore} />
              </div>
              {(suggestedRoles.length > 0 || recommendedCourses.length > 0) && (
                <section className="flex flex-col gap-12 pb-40 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                       <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Horizon Insights</h2>
                       <div className="h-2 w-32 bg-blue-600 rounded-full mt-2" />
                    </div>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {suggestedRoles.length > 0 && (
                      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.06)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />
                        <div className="relative z-10">
                           <div className="flex items-center justify-between mb-12">
                              <h3 className="text-xs font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-4"><Briefcase className="w-4 h-4" />Recommended Roles</h3>
                           </div>
                           <div className="grid grid-cols-1 gap-3">
                             {suggestedRoles.map((role, i) => (
                               <div key={i} className="flex items-center justify-between p-5 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 rounded-2xl border border-slate-100 transition-all duration-500 cursor-default group/item">
                                 <span className="text-sm font-black text-slate-800">{role}</span>
                                 <ArrowRight className="w-4 h-4 text-slate-300 group-hover/item:text-blue-500 group-hover/item:translate-x-1 transition-all" />
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>
                    )}
                    {recommendedCourses.length > 0 && (
                      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.06)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700" />
                        <div className="relative z-10">
                           <div className="flex items-center justify-between mb-12">
                              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-4"><GraduationCap className="w-4 h-4" />Growth Roadmap</h3>
                           </div>
                           <div className="space-y-6">
                             {recommendedCourses.map((course, i) => {
                               const { url, text } = parseRoadmap(course);
                               return (
                                 <div key={i} className="flex flex-col gap-4 p-6 bg-[#f8fafc] hover:bg-white hover:shadow-xl hover:shadow-emerald-500/5 rounded-[2rem] border border-slate-100 transition-all duration-500 group/course">
                                   <div className="flex items-start gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0"><Star className={cn("w-4 h-4", i === 0 ? "text-amber-400 fill-amber-400" : "text-emerald-500")} /></div>
                                      <div className="flex-1 pt-1"><span className="text-sm font-black text-slate-900 leading-tight block mb-1">{text}</span><div className="flex items-center gap-4"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1 h-1 bg-emerald-500 rounded-full" />Highly Selective</span><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1 h-1 bg-slate-300 rounded-full" />Industry Pick</span></div></div>
                                   </div>
                                   {url && (
                                     <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-emerald-600 hover:text-white text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-emerald-100 hover:border-emerald-600 group/link shadow-sm">Explore Resource <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" /></a>
                                   )}
                                 </div>
                               );
                             })}
                           </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
