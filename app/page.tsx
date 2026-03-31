"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Bot, User, FileText, Send, Sparkles, Wand2, CheckCircle2, Terminal, Activity, FileCode, Loader2 } from "lucide-react";
import ChatContainer from "@/components/ChatContainer";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import ResumeSection from "@/components/ResumeSection";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface SessionData {
  session_id: string;
  status: string;
  response: any;
  updated_at: string;
  messages?: Message[];
  collected?: Record<string, string>;
}

const INITIAL_MESSAGE = "Please describe your details in one paragraph including your name, target role, skills, projects or experience, and education.\n\nExample: My name is John Doe, I'm a Senior Frontend Developer specializing in React and TypeScript. I have 5 years of experience building scalable web apps with AWS. I graduated from Stanford with a Computer Science degree.";

const LOG_MILESTONES = [
  { t: 0, log: "Handshaking with AI Gateway..." },
  { t: 3, log: "Abstracting Professional Identity..." },
  { t: 7, log: "Building Semantic Map of Skills..." },
  { t: 12, log: "Drafting Core Experiences..." },
  { t: 16, log: "Finalizing Document Formatting..." }
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState<string>("booting");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: INITIAL_MESSAGE }]);
  const [collected, setCollected] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<string>("");
  const [atsScore, setAtsScore] = useState<number>(0);
  
  // v12.1: CENTRALIZED SANITIZER
  const sanitizeResume = useCallback((raw: string) => {
    if (!raw || typeof raw !== 'string') return { resume: "", roles: [], courses: [] };
    
    let clean = raw;
    let roles: string[] = [];
    let courses: string[] = [];

    const careerMatch = clean.match(/(CAREER SUGGESTIONS|Career Suggestions|Career Suggestions:|CAREER PATHWAYS)[\s\S]*?(?=RECOMMENDED COURSES|Recommended Courses|Recommended Courses:|UPSKILLING ROADMAP|$)/i);
    if (careerMatch) {
       roles = careerMatch[0].replace(/CAREER SUGGESTIONS|[:\[\]"]/gi, "")
         .split(/\n|,/)
         .map((s: string) => s.trim())
         .filter((s: string) => s.length > 3 && !s.includes("-"));
    }

    const courseMatch = clean.match(/(RECOMMENDED COURSES|Recommended Courses|Recommended Courses:|UPSKILLING ROADMAP)[\s\S]*$/i);
    if (courseMatch) {
       courses = courseMatch[0].replace(/RECOMMENDED COURSES|[:\[\]"]/gi, "")
         .split(/\n|,/)
         .map((s: string) => s.trim())
         .filter((s: string) => s.length > 5 && !s.includes("-"));
    }

    // PURE STRIP
    const careerRegex = /(CAREER SUGGESTIONS|Career Suggestions|Career Suggestions:|CAREER PATHWAYS)[\s\S]*$/i;
    const coursesRegex = /(RECOMMENDED COURSES|Recommended Courses|Recommended Courses:|UPSKILLING ROADMAP)[\s\S]*$/i;
    clean = clean.replace(careerRegex, "").replace(coursesRegex, "").trim();

    return { resume: clean, roles, courses };
  }, []);
  
  // v7.0 NEW STATES
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false); // v11.0
  const [genLogs, setGenLogs] = useState<string[]>([]);

  const handleResubmit = () => {
    if (collected.general) {
      console.log("[v11.0] Quick-Resubmit Triggered:", collected.general);
      handleSendMessage(collected.general);
    }
  };

  const supabase = useRef<ReturnType<typeof createClient> | null>(null);
  const latestCollectedRef = useRef<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!supabase.current) return;
    const { data } = await supabase.current.from("sessions").select("*").order("updated_at", { ascending: false });
    if (data) setSessions(data);
  }, []);

  const persistSession = useCallback(async () => {
    if (!sessionId || sessionId === "booting" || !supabase.current) return;
    await supabase.current.from("sessions").upsert({
      session_id: sessionId,
      messages,
      collected,
      status: isComplete ? "complete" : "questions",
      response: { 
        resume, 
        ats_score: atsScore,
        suggested_roles: suggestedRoles,
        recommended_courses: recommendedCourses 
      },
      updated_at: new Date().toISOString(),
    });
    if (!isComplete) await fetchSessions();
  }, [sessionId, messages, collected, resume, atsScore, suggestedRoles, recommendedCourses, isComplete, fetchSessions]);

  useEffect(() => {
    if (!mounted || sessionId === "booting") return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(persistSession, 500); // v8.0 TURBO-SYNC: 500ms
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [messages, collected, persistSession, mounted, sessionId]);

  // v9.0 REALTIME: Listen for backend updates instantly
  useEffect(() => {
    if (!sessionId || sessionId === "booting" || !supabase.current) return;

    console.log("[v9.0] Subscribing to Realtime updates for:", sessionId);
    const channel = supabase.current
      .channel(`session-${sessionId}-updates`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `session_id=eq.${sessionId}`
        },
        async (payload) => {
          console.log("[v9.0] 🔥 Incoming DB Update:", payload);
          const updated = payload.new;
          if (!updated) return;

          let parsedResponse = updated.response;
          if (typeof parsedResponse === "string") {
            try { parsedResponse = JSON.parse(parsedResponse); } 
            catch (e) { console.error("[v9.0] JSON Parse Failed"); }
          }

          const resumeData = parsedResponse?.resume || parsedResponse?.response?.resume || "";
          const score = parsedResponse?.ats_score || parsedResponse?.response?.ats_score;
          
          if (resumeData && typeof resumeData === 'string' && resumeData.length > 50) {
            console.log("[v12.1] ✅ Syncing Realtime & Sanitizing...");
            const { resume: clean, roles, courses } = sanitizeResume(resumeData);
            
            setResume(clean);
            setAtsScore(score || 85);
            
            // v12.1: Merge extracted career data with existing
            if (roles.length > 0) setSuggestedRoles(roles);
            if (courses.length > 0) setRecommendedCourses(courses);
            
            setIsLoading(false);
            setIsComplete(true);
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase.current) {
        console.log("[v9.0] Unsubscribing from:", sessionId);
        supabase.current.removeChannel(channel);
      }
    };
  }, [sessionId]);

  useEffect(() => { latestCollectedRef.current = collected; }, [collected]);

  const processResponse = (status: string, response: any) => {
    try {
      const parsed = typeof response === "string" ? JSON.parse(response) : response;
      if (!parsed) {
        if (status === 'questions') setIsLoading(false);
        return;
      }

      const apiData = parsed.collected || parsed.data?.collected;
      if (apiData) setCollected(prev => ({ ...prev, ...apiData }));

      let resContent = parsed?.resume || parsed?.data?.resume || parsed?.response?.resume;
      const score = parsed?.ats_score || parsed?.data?.ats_score || parsed?.response?.ats_score;
      let roles = parsed?.suggested_roles || parsed?.data?.suggested_roles || parsed?.response?.suggested_roles || [];
      let courses = parsed?.recommended_courses || parsed?.data?.recommended_courses || parsed?.response?.recommended_courses || [];
      const questionsFromResponse = parsed?.questions || parsed?.data?.questions || parsed?.response?.questions || [];

      // v12.1: UNIVERSAL SANITIZATION
      const { resume: cleanRes, roles: extRoles, courses: extCourses } = sanitizeResume(resContent || "");
      resContent = cleanRes;
      if (roles.length === 0) roles = extRoles;
      if (courses.length === 0) courses = extCourses;

      if (resContent && typeof resContent === 'string' && resContent.length > 50) {
        setResume(resContent);
        setAtsScore(score || 85);
        setSuggestedRoles(roles.length > 0 ? roles : suggestedRoles);
        setRecommendedCourses(courses.length > 0 ? courses : recommendedCourses);
        
        // v7.0 Fallback Inference
        if (roles.length === 0 && (resContent.includes("Manual Testing") || resContent.includes("Selenium"))) {
           setSuggestedRoles(["QA Engineer", "Automation Tester", "Software Test Engineer", "Quality Analyst"]);
           setRecommendedCourses(["Selenium WebDriver Complete", "ISTQB Certification Prep", "Postman API Testing", "SQL for Testers"]);
        } else if (roles.length === 0 && resContent.includes("JavaScript")) {
           setSuggestedRoles(["Frontend Developer", "Web Developer", "React Specialist"]);
           setRecommendedCourses(["Advanced JavaScript", "React.js Mastery", "Frontend System Design"]);
        }

        setIsComplete(true);
        setIsError(false); // Clear any previous error
        setMessages(prev => [...prev, { role: "assistant", text: "Your professional resume is generated!" }]);
        
        // v8.0 FLASH-SAVE: Immediate persistence on completion
        setTimeout(persistSession, 100);
      } else {
        // v11.0: ENTER ERROR STATE
        setIsError(true);
        // v7.7 FALLBACK: If resume is empty, show questions OR a placeholder error
        const finalQuestions = questionsFromResponse.length > 0 
          ? questionsFromResponse 
          : ["I'm having trouble extracting your resume content. Please try re-sending your details or check the system logs."];
        
        setMessages(prev => [...prev, ...finalQuestions.map((text: string) => ({ role: "assistant" as const, text }))]);
      }
    } catch (e) {
      console.error("[v7.0] API Parsing Fail:", e);
    }
  };

  useEffect(() => {
    let logInt: NodeJS.Timeout | null = null;
    let start = Date.now();
    
    if (isLoading && !isComplete) {
       setGenLogs(prev => prev.length === 0 ? ["Initializing Digital Handshake..."] : prev);
       logInt = setInterval(() => {
          const elapsed = (Date.now() - start) / 1000;
          setGenLogs(prev => {
             const m = LOG_MILESTONES.find(milestone => milestone.t <= elapsed && !prev.includes(milestone.log));
             const nextLogs = m ? [...prev, m.log] : prev;
             
             // v9.1: Add the "Syncing" indicator if we've reached the last milestone but aren't done yet
             if (elapsed > 16 && !nextLogs.includes("🛰️ Awaiting Final Background Sync...")) {
                return [...nextLogs, "🛰️ Awaiting Final Background Sync..."];
             }
             return nextLogs;
          });
       }, 1000);
    }
    return () => { if (logInt) clearInterval(logInt); };
  }, [isLoading, isComplete]);

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;
    
    const newCollected = { ...latestCollectedRef.current, general: userInput.trim() };
    setCollected(newCollected);
    setMessages(prev => [...prev, { role: "user", text: userInput }]);
    setIsLoading(true);
    setIsError(false);
    setGenLogs([]);
    setIsComplete(false); 

    try {
      const res = await fetch("/api/webhook", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, user_input: userInput, collected: newCollected }),
      });
      const data = await res.json();
      
      // v12.0: Only process if it's a "questions" status (immediate response needed)
      // Otherwise, the Realtime listener in app/page.tsx will catch the "complete" update.
      if (data.status === 'questions') {
        processResponse(data.status, data.response);
      } else {
        console.log("[v12.0] Trigger success. Waiting for Realtime sync...");
        // DO NOT set isLoading(false) here. 
      }
    } catch (error) {
       console.error("[v12.0] Trigger failed:", error);
       setIsLoading(false);
       setIsError(true);
    }
  };

  const handleSelectSession = useCallback(async (sid: string) => {
    if (!sid || sid === "booting" || !supabase.current) return;
    setSessionId(sid);
    const { data } = await supabase.current.from("sessions").select("*").eq("session_id", sid).maybeSingle();
    if (data) {
      setMessages(data.messages || []);
      setCollected(data.collected || {});
      try {
        const resp = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
        const resText = resp?.resume || "";
        
        // v12.1: Always sanitize historical resumes on load
        const { resume: clean, roles, courses } = sanitizeResume(resText);
        
        setResume(clean);
        setAtsScore(resp?.ats_score || 0);
        // v7.0 Load Career Data
        setSuggestedRoles(roles.length > 0 ? roles : (resp?.suggested_roles || []));
        setRecommendedCourses(courses.length > 0 ? courses : (resp?.recommended_courses || []));
      } catch (e) {
        setResume(""); setAtsScore(0); setSuggestedRoles([]); setRecommendedCourses([]);
      }
      setIsComplete(data.status === "complete");
    }
  }, []);

  const handleStartOver = () => {
    const newId = uuidv4();
    setSessionId(newId);
    setIsComplete(false); setResume(""); setAtsScore(0); setCollected({});
    setSuggestedRoles([]); setRecommendedCourses([]);
    setGenLogs([]);
    setMessages([{ role: "assistant", text: INITIAL_MESSAGE }]);
    window.history.pushState({}, "", `?session=${newId}`);
  };

  useEffect(() => {
    supabase.current = createClient();
    if (typeof window !== "undefined") {
      const sid = new URLSearchParams(window.location.search).get("session");
      if (sid) handleSelectSession(sid); else setSessionId(uuidv4());
    }
    fetchSessions();
    setMounted(true);
  }, [fetchSessions, handleSelectSession]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);

  if (!mounted) return <div className="h-screen w-screen bg-white" />;

  return (
    <div className="flex h-screen overflow-hidden bg-white font-sans">
      <Sidebar sessions={sessions} currentSessionId={sessionId} onSelectSession={handleSelectSession} onNewChat={handleStartOver} onDeleteSession={(sid) => { if (!supabase.current) return; supabase.current.from("sessions").delete().eq("session_id", sid).then(() => { if (sid === sessionId) handleStartOver(); fetchSessions(); }); }} />

      <main className="flex-1 flex flex-row min-h-screen relative overflow-hidden">
        <div className="flex flex-col min-h-0 bg-transparent border-r border-slate-200 w-full sm:w-[450px] lg:w-[500px] shrink-0 relative">
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white"><FileCode className="w-5 h-5" /></div>
              <h1 className="text-xl font-black uppercase">AI<span className="text-blue-600">Resume</span></h1>
            </div>
            <div className="px-3 py-1.5 bg-blue-50/50 border border-blue-100 rounded-full flex items-center gap-2">
               <Activity className="w-2 h-2 text-blue-600 animate-pulse" />
               <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none underline tracking-tighter">Horizon_v7.0</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
            <ChatContainer messages={messages} onResendMessage={(i) => handleSendMessage(messages[i].text)} />
            <div ref={messagesEndRef} />
          </div>

          <div className="sticky bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent font-outfit">
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              {resume && resume.trim().length > 0 && !isLoading && (
                <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-100 px-6 py-3 rounded-2xl text-center shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Professional Version Ready for Export
                  </p>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col gap-4 animate-in fade-in duration-500">
                  <div className="bg-zinc-900/95 backdrop-blur-xl p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/10 group">
                    <div className="relative z-10 flex flex-col gap-4">
                       <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-2">
                             <Terminal className="w-3 h-3" /> Career Engine (Active)
                          </p>
                          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                       </div>
                       <div className="flex flex-col gap-1.5 min-h-[80px] max-h-[120px] overflow-y-auto font-mono text-[9px] text-zinc-300 scrollbar-hide">
                          {genLogs.map((log, i) => (
                             <div key={i} className="flex gap-3 opacity-0 animate-in fade-in duration-300" style={{ animationFillMode: 'forwards' }}>
                                <span className="text-zinc-600">[{new Date().toLocaleTimeString([], { hour12: false, second: '2-digit' })}]</span>
                                <span>{log}</span>
                             </div>
                          ))}
                          <div className="flex items-center gap-2 text-blue-400 animate-pulse"><span>_</span></div>
                       </div>
                    </div>
                  </div>
                </div>
              ) : isError ? (
                <div className="p-6 bg-red-50 border-t border-red-100 flex flex-col gap-4 animate-in fade-in duration-500">
                  <p className="text-xs font-bold text-red-700 uppercase tracking-widest text-center">Generation stalled or content missing</p>
                  <button 
                    onClick={handleResubmit}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Wand2 className="w-5 h-5" />
                    Re-Trigger AI Generator
                  </button>
                  <button 
                    onClick={() => setIsError(false)}
                    className="text-[10px] font-bold text-red-400 uppercase hover:text-red-600 transition-colors"
                  >
                    Go back to chat
                  </button>
                </div>
              ) : (
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
              )}
            </div>
          </div>
        </div>

        <div className="flex-grow h-full overflow-y-auto bg-slate-50 min-w-[600px] scroll-smooth p-6">
          <ResumeSection 
            key={resume ? resume.slice(0, 5) : "empty"} 
            resume={resume} 
            atsScore={atsScore} 
          />

          {/* v10.0 CAREER HORIZON SECTION (OUTSIDE RESUME) */}
          {(suggestedRoles.length > 0 || recommendedCourses.length > 0) && (
            <div className="max-w-[800px] mx-auto mt-12 mb-20 px-4 md:px-0 flex flex-col gap-8 animate-in slide-in-from-bottom-8 duration-1000">
              <div className="flex flex-col gap-2 mb-2">
                <h2 className="text-xl font-black text-zinc-900 tracking-tighter uppercase">Career Horizon</h2>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Growth Pathway & Strategic Upskilling</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Suggested Roles Card */}
                {suggestedRoles.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-200/50 flex flex-col h-full hover:shadow-2xl transition-shadow duration-500">
                    <h3 className="text-[10px] font-black text-blue-600 mb-6 uppercase tracking-[0.2em] flex items-center gap-3">
                      <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                      Recommended Pathways
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {suggestedRoles.map((role, i) => (
                        <span key={i} className="px-4 py-2 bg-blue-50 text-blue-700 text-[11px] font-black rounded-2xl border border-blue-100/50 hover:bg-blue-100 transition-colors cursor-default">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Courses Card */}
                {recommendedCourses.length > 0 && (
                  <div className="bg-white p-8 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-200/50 flex flex-col h-full hover:shadow-2xl transition-shadow duration-500">
                    <h3 className="text-[10px] font-black text-emerald-600 mb-6 uppercase tracking-[0.2em] flex items-center gap-3">
                      <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                      Upskilling Roadmap
                    </h3>
                    <ul className="space-y-4">
                      {recommendedCourses.map((course, i) => (
                        <li key={i} className="flex items-start gap-3 group">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-bold text-zinc-700 leading-tight group-hover:text-emerald-900 transition-colors">{course}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
