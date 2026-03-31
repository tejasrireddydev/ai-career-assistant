"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { FileCode, Loader2, Sparkles, CheckCircle2, RefreshCcw } from "lucide-react";
import ChatContainer from "@/components/ChatContainer";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import ResumeSection from "@/components/ResumeSection";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

interface SessionData {
  session_id: string;
  status: string;
  response: {
    resume: string;
    ats_score: number;
  };
  updated_at: string;
  messages?: Message[];
  collected?: Record<string, string>;
}

const VALID_FIELDS = [
  "full_name",
  "target_role",
  "skills",
  "experience_or_projects",
  "education",
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState<string>("booting");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I am your AI Resume Builder. Let's start by getting some basic details. Please provide your name, email, skills, projects completed, any relevant experience, and education.",
    },
  ]);
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<string>("");
  const [atsScore, setAtsScore] = useState<number>(0);

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState(0);

  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const lastProcessedRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const isFetchingRef = useRef(false);
  const latestCollectedRef = useRef<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resolveNextField = useCallback((currentData: Record<string, string>) => {
    for (const field of VALID_FIELDS) {
      if (!currentData[field] || String(currentData[field]).trim() === "") return field;
    }
    return null;
  }, []);

  const fetchSessions = useCallback(async (isSilent = false) => {
    if (isFetchingRef.current || !supabase.current) return;
    try {
      isFetchingRef.current = true;
      const { data } = await supabase.current
        .from("sessions")
        .select("*")
        .order("updated_at", { ascending: false });
      if (data) setSessions(data);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const persistSession = useCallback(async () => {
    if (!sessionId || sessionId === "booting" || isSavingRef.current || !supabase.current) return;
    try {
      isSavingRef.current = true;
      await supabase.current.from("sessions").upsert({
        session_id: sessionId,
        messages,
        collected,
        status: isComplete ? "complete" : "questions",
        response: { resume, ats_score: atsScore },
        updated_at: new Date().toISOString(),
      });
      if (!isComplete) await fetchSessions(true);
    } finally {
      isSavingRef.current = false;
    }
  }, [sessionId, messages, collected, resume, atsScore, isComplete, fetchSessions]);

  useEffect(() => {
    if (!mounted || sessionId === "booting") return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(persistSession, 2000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [messages, collected, persistSession, mounted, sessionId]);

  useEffect(() => {
    latestCollectedRef.current = collected;
    const nextKey = resolveNextField(collected);
    if (pendingKey !== nextKey && !isComplete) setPendingKey(nextKey);
  }, [collected, pendingKey, resolveNextField, isComplete]);

  const mapQuestionToKey = (question: string) => {
    const q = question.toLowerCase();
    if (q.includes("name")) return "full_name";
    if (q.includes("role") || q.includes("target")) return "target_role";
    if (q.includes("skills") || q.includes("technical")) return "skills";
    if (q.includes("experience") || q.includes("project")) return "experience_or_projects";
    if (q.includes("education") || q.includes("background")) return "education";
    return null;
  };

  const syncStateWithSupabase = async (sid: string) => {
     if (!supabase.current || sid === "booting") return false;
     const { data } = await supabase.current.from("sessions").select("*").eq("session_id", sid).maybeSingle();
     if (data && data.response?.resume && String(data.response.resume).length > 20) {
        setResume(data.response.resume);
        setAtsScore(data.response.ats_score || 0);
        setIsComplete(true);
        setPollCount(0);
        return true;
     }
     return false;
  };

  const processResponse = useCallback((status: string, response: any) => {
    const responseID = JSON.stringify({ status, response });
    if (lastProcessedRef.current === responseID) return;
    lastProcessedRef.current = responseID;

    try {
      const parsed = typeof response === "string" ? JSON.parse(response) : response;
      const apiData = parsed.collected || parsed.data?.collected;
      if (apiData) {
        setCollected(prev => {
           const merged = { ...prev };
           Object.keys(apiData).forEach(key => { if (VALID_FIELDS.includes(key)) merged[key] = apiData[key]; });
           return merged;
        });
      }

      if (status === "complete") {
         console.log("[V3.2] Sealing session.");
         setIsComplete(true);
      }

      const resContent = parsed.resume || parsed.data?.resume || "";
      if (resContent && resContent.length > 20) {
        setResume(resContent);
        setAtsScore(parsed.ats_score || parsed.data?.ats_score || 0);
        setIsComplete(true);
      }

      if (status === "questions" && !isComplete) {
        const questions = parsed.questions || parsed.data?.questions || (Array.isArray(parsed) ? parsed : []);
        if (questions.length > 0) {
          setMessages(prev => [...prev, ...questions.map((text: string) => ({ role: "assistant" as const, text }))]);
          const missingFields = (parsed.missing_fields || parsed.data?.missing_fields || []).filter((f: string) => VALID_FIELDS.includes(f));
          if (missingFields.length > 0) {
             setPendingKey(missingFields[0]);
          } else {
             const detected = mapQuestionToKey(questions[questions.length - 1]);
             setPendingKey(detected || resolveNextField(latestCollectedRef.current) || "experience_or_projects");
          }
        }
      }
      setIsLoading(false);
    } catch (e) {
      console.error("[SYNC] Error:", e);
      setIsLoading(false);
    }
  }, [resolveNextField, isComplete]);

  // PATIENCE POLLING V3.2
  useEffect(() => {
    if (isComplete && !resume) {
      setPollCount(0);
      pollIntervalRef.current = setInterval(async () => {
         setPollCount(prev => prev + 1);
         const found = await syncStateWithSupabase(sessionId);
         if (found) clearInterval(pollIntervalRef.current!);
      }, 4000);
    } else if (resume) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [isComplete, resume, sessionId]);

  const handleSendMessage = async (userInput: string, keyFromUI?: string | null) => {
    if (!userInput.trim() || isLoading) return;

    let activeKey = keyFromUI || pendingKey;
    if (!activeKey || !VALID_FIELDS.includes(activeKey)) {
        activeKey = resolveNextField(latestCollectedRef.current) || "experience_or_projects";
    }

    const newCollected = { ...latestCollectedRef.current, [activeKey]: userInput.trim() };
    setCollected(newCollected);
    setPendingKey(null);
    setMessages(prev => [...prev, { role: "user", text: userInput }]);

    try {
      setIsLoading(true);
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, user_input: userInput, collected: newCollected, round: messages.length }),
      });
      const data = await res.json();
      processResponse(data.status, data.response);
    } catch (error) {
      console.error("[API] Failed:", error);
      setIsLoading(false);
    }
  };

  const handleManualSync = () => {
     setIsLoading(true);
     syncStateWithSupabase(sessionId).finally(() => setIsLoading(false));
  };

  const handleSelectSession = useCallback(async (sid: string) => {
    if (!sid || sid === "booting" || !supabase.current) return;
    setSessionId(sid);
    setIsLoading(true);
    const { data } = await supabase.current.from("sessions").select("*").eq("session_id", sid).maybeSingle();
    if (data) {
      setMessages(data.messages || []);
      setCollected(data.collected || {});
      setResume(data.response?.resume || "");
      setAtsScore(data.response?.ats_score || 0);
      setIsComplete(data.status === "complete");
    }
    setIsLoading(false);
  }, []);

  const handleStartOver = () => {
    const newId = uuidv4();
    setSessionId(newId);
    lastProcessedRef.current = null;
    setIsComplete(false);
    setResume("");
    setAtsScore(0);
    setCollected({});
    setMessages([{ role: "assistant", text: "New session started! Provide your name, role, and skills." }]);
    window.history.pushState({}, "", `?session=${newId}`);
  };

  useEffect(() => {
    supabase.current = createClient();
    setMounted(true);
    const sid = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("session");
    if (sid) handleSelectSession(sid); else setSessionId(uuidv4());
    fetchSessions();
  }, [fetchSessions, handleSelectSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className={`flex h-screen overflow-hidden bg-white font-sans transition-opacity duration-300 ${!mounted ? "opacity-0" : "opacity-100"}`}>
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={(sid) => {
          if (!supabase.current) return;
          supabase.current.from("sessions").delete().eq("session_id", sid).then(() => {
            if (sid === sessionId) handleStartOver();
            fetchSessions();
          });
        }}
        onNewChat={handleStartOver}
      />

      <main className="flex-1 flex flex-row min-h-screen relative overflow-hidden">
        <div className="flex flex-col min-h-0 bg-transparent border-r border-slate-200 w-full sm:w-[400px] lg:w-[450px] relative">
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-5 flex items-center justify-between shadow-sm font-outfit">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl"><FileCode className="w-5 h-5" /></div>
              <h1 className="text-xl font-black tracking-tighter uppercase">AI<span className="text-blue-600">Resume</span></h1>
            </div>
            <div className="px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
               <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Healthy_v3.2</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
            <ChatContainer messages={messages} onResendMessage={(i) => handleSendMessage(messages[i].text)} />
            {isLoading && (
              <div className="flex justify-center p-8"><div className="flex gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div></div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
            <div className="max-w-3xl mx-auto">
              {isComplete && resume ? (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center shadow-lg shadow-emerald-500/10 scale-in-center">
                  <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-3"><CheckCircle2 className="w-5 h-5" /> Resume Successfully Generated</p>
                </div>
              ) : isComplete ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-center shadow-lg shadow-blue-500/10 animate-pulse">
                    <p className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center justify-center gap-3 leading-relaxed">
                      <Loader2 className="w-4 h-4 animate-spin" /> <Sparkles className="w-4 h-4" /> AI is crafting your masterpiece. Wait... ({pollCount})
                    </p>
                  </div>
                  {pollCount > 10 && (
                     <button 
                        onClick={handleManualSync}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-blue-200 text-blue-600 rounded-2xl text-sm font-black hover:bg-blue-50 transition-all hover:shadow-xl hover:shadow-blue-500/10 active:scale-95"
                     >
                        <RefreshCcw className="w-4 h-4" /> Force Sync Now
                     </button>
                  )}
                </div>
              ) : (
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} pendingKey={pendingKey} />
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 h-full overflow-hidden bg-slate-50">
          <ResumeSection resume={resume} atsScore={atsScore} />
        </div>
      </main>
    </div>
  );
}
