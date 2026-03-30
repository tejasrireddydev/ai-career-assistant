"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Download, RefreshCw, FileCode } from "lucide-react";
import ChatContainer from "@/components/ChatContainer";
import ChatInput from "@/components/ChatInput";
import ResumePreview from "@/components/ResumePreview";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

interface SessionData {
  session_id: string;
  status: string;
  response: any;
  updated_at: string;
  messages?: Message[];
  collected?: Record<string, any>;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());
  const [supabase] = useState(() => createClient());
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I am your AI Resume Builder. Let's start by getting some basic details. Please provide your name, email, skills, projects completed, any relevant experience, and education.",
    },
  ]);
  const [collected, setCollected] = useState<Record<string, any>>({});
  const [round, setRound] = useState<number>(0);
  const [resume, setResume] = useState<string>("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastProcessedAt, setLastProcessedAt] = useState<string | null>(null);
  const [showResume, setShowResume] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastProcessedAtRef = useRef<string | null>(null);
  const lastProcessedStatusRef = useRef<string | null>(null);
  const lastProcessedResponseRef = useRef<string | null>(null);
  const lastHandledQuestionsRef = useRef<string>("");
  const isInitialMount = useRef(true);
  const collectedRef = useRef<Record<string, any>>({});
  const pendingKeyRef = useRef<string | null>(null);

  const fetchSessions = useCallback(async () => {
    console.log("[CRUD] Fetching all sessions...");
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[CRUD] Error fetching sessions:", error);
    } else {
      setSessions(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const mapQuestionToKey = (question: string): string | null => {
    const q = question.toLowerCase();
    let key: string | null = null;

    if (q.includes("name")) {
      key = "full_name";
    } else if (
      q.includes("role") ||
      q.includes("position") ||
      q.includes("targeting")
    ) {
      key = "target_role";
    } else if (q.includes("skill") || q.includes("skills")) {
      key = "skills";
    } else if (
      q.includes("project") ||
      q.includes("projects") ||
      q.includes("experience") ||
      q.includes("worked on")
    ) {
      key = "experience_or_projects";
    } else if (
      q.includes("education") ||
      q.includes("degree") ||
      q.includes("college")
    ) {
      key = "education";
    }

    console.log("DEBUG pendingKeyRef:", key);
    console.log("QUESTION:", question);
    console.log("PENDING KEY:", key);
    return key;
  };

  const saveSessionState = useCallback(
    async (currentStatus?: string, currentResponse?: any) => {
      // Only save if we have messages or collected data
      if (messages.length <= 1 && Object.keys(collected).length === 0) return;

      console.log("[CRUD] Persisting session state...", { sessionId });

      // Create the update payload
      const updatePayload: any = {
        session_id: sessionId,
        messages: messages,
        collected: collected,
        updated_at: new Date().toISOString(),
      };

      if (currentStatus) updatePayload.status = currentStatus;
      if (currentResponse) updatePayload.response = currentResponse;

      try {
        const { error } = await supabase
          .from("sessions")
          .upsert(updatePayload, { onConflict: "session_id" });

        if (error) {
          console.error("[CRUD] Persistence error:", error);
        } else {
          fetchSessions();
        }
      } catch (e) {
        console.error("[CRUD] Persistence exception:", e);
      }
    },
    [supabase, sessionId, messages, collected, fetchSessions],
  );

  // Persist state when messages or collected changes (except on first load)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveSessionState();
    }, 1000); // Debounce saves
    return () => clearTimeout(timer);
  }, [messages, collected, saveSessionState]);

  const processResponse = useCallback(
    (status: string, response: any, updatedAt?: string) => {
      console.log("[SYNC] Checking update:", {
        status,
        updatedAt,
        currentStatusIsInitial:
          messages.length === 0 ||
          (messages.length > 0 && status !== "initial"),
      });

      // Hardened skip: If the entire raw response is identical to what we last processed, skip.
      const responseStr = JSON.stringify(response);
      if (
        updatedAt &&
        updatedAt === lastProcessedAtRef.current &&
        responseStr === lastHandledQuestionsRef.current
      ) {
        console.log("[SYNC] Skipping duplicate check (identical response)");
        return;
      }

      if (updatedAt) {
        lastProcessedAtRef.current = updatedAt;
        setLastProcessedAt(updatedAt);
      }

      try {
        const parsed =
          typeof response === "string" ? JSON.parse(response) : response;
        console.log("[SYNC] Processing incoming data:", { status, parsed });

        if (status === "questions") {
          const questions =
            parsed.questions ||
            parsed.data?.questions ||
            (Array.isArray(parsed) ? parsed : null);

          // Update resume preview
          if (parsed.resume || parsed.data?.resume) {
            setResume(parsed.resume || parsed.data?.resume);
          }

          // Update collected state from proxy (crucial for bulk extraction)
          if (parsed.collected || parsed.data?.collected) {
            const newCollected = parsed.collected || parsed.data?.collected;
            setCollected((prev) => {
              const merged = { ...prev, ...newCollected };
              collectedRef.current = merged;
              return merged;
            });
            console.log("DEBUG collectedRef:", { ...collectedRef.current });
          }

          if (questions && Array.isArray(questions) && questions.length > 0) {
            // ONLY wrap the question-appending in the duplicate check, DON'T return
            if (responseStr !== lastHandledQuestionsRef.current) {
              console.log("[SYNC] Found new questions in payload:", questions);
              const newAssistantMessages = questions.map((q: string) => ({
                role: "assistant" as const,
                text: q,
              }));

              setMessages((prev) => [...prev, ...newAssistantMessages]);
              lastHandledQuestionsRef.current = responseStr;

              const lastQuestion = questions[questions.length - 1];
              const newKey = mapQuestionToKey(lastQuestion);
              setPendingKey(newKey);
              pendingKeyRef.current = newKey;
              setRound((prev) => prev + 1);
              setIsLoading(false);
              console.log("[SYNC] Success: UI updated with new questions.");
            } else {
              console.log("[SYNC] Duplicate question set ignored.");
            }
          }

          // Independently check if we should show the final resume dashboard
          // If the AI is in questions status but hasn't sent new questions,
          // AND it has a substantial resume, it might be done or we should at least let the user see it.
          const currentResume = parsed.resume || parsed.data?.resume;
          if (currentResume && (!questions || questions.length === 0)) {
            console.log(
              "[SYNC] No questions but resume found. Switching to preview.",
            );
            setShowResume(true);
            setIsLoading(false);
          }
        } else if (status === "complete") {
          console.log(
            "[SYNC] Process complete. Resume data length:",
            parsed?.resume?.length || 0,
          );
          const resumeContent =
            parsed.resume ||
            parsed.data?.resume ||
            "No resume content generated.";
          setMessages((prev) => {
            if (prev.some((m) => m.text === "Your resume is ready!"))
              return prev;
            return [
              ...prev,
              { role: "assistant", text: "Your resume is ready!" },
            ];
          });
          setResume(resumeContent);
          setShowResume(true);
          setIsLoading(false);
        } else if (status === "initial") {
          console.log("[SYNC] Acknowledged initial state. Waiting for AI...");
        } else {
          console.log("[SYNC] Received unexpected status:", status);
        }
      } catch (e) {
        console.error("[SYNC] Parse failure:", e);
      }
    },
    [messages.length],
  );

  // Realtime Subscription
  // (REMOVED Polling & Realtime Fallbacks for Single Source of Truth)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, showResume]);

  // (REMOVED Polling & Realtime Fallbacks for Single Source of Truth)

  // Message Timeout Fallback
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isLoading) {
      timeoutId = setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastUserIndex = newMessages
            .map((m) => m.role)
            .lastIndexOf("user");
          if (lastUserIndex !== -1) {
            newMessages[lastUserIndex] = {
              ...newMessages[lastUserIndex],
              isError: true,
            };
          }
          return newMessages;
        });
      }, 45000); // 45 seconds timeout
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoading]);

  const handleSendMessage = async (userInput: string) => {
    if (!userInput.trim() || isLoading) return;

    const currentAnswer = userInput.trim();
    const newUserMessage: Message = { role: "user", text: userInput };

    // Clear any previous errors on new message send
    const newMessages = [
      ...messages.map((m) => ({ ...m, isError: false })),
      newUserMessage,
    ];
    setMessages(newMessages);

    // FIX 1: UPDATE collected BEFORE API CALL
    const updatedCollected = { ...collectedRef.current };
    const currentKey = pendingKeyRef.current;
    
    if (currentKey && currentAnswer) {
      const cleaned = currentAnswer.trim();
      let value = cleaned;

      // Smart Validation rules
      if (currentKey === "full_name") {
        value = cleaned.split("\n")[0]; // Take only the first line
      } else if (currentKey === "target_role") {
        value = cleaned.length < 50 ? cleaned : ""; // Guard against full-resume pastes in role field
      }

      // Final Quality Check: Skip saving to THIS field if the input is obviously a bulk paste
      if (
        cleaned.length > 100 &&
        currentKey !== "experience_or_projects" &&
        currentKey !== "skills"
      ) {
        console.log("⚠️ Skipping invalid bulk input for:", currentKey);
        // We still send the message but don't "force" it into the currentKey yet
        // Local extraction in the proxy will handle this bulk input instead.
      } else if (value) {
        updatedCollected[currentKey] = value;
        setCollected(updatedCollected);
        collectedRef.current = updatedCollected;
      }

      // Reset pending key after handling answer
      setPendingKey(null);
      pendingKeyRef.current = null;

      console.log("DEBUG collectedRef:", { ...collectedRef.current });
      console.log("PENDING KEY BEFORE SAVE:", currentKey);
      console.log("UPDATED COLLECTED:", updatedCollected);
    } else {
      console.log("DEBUG collectedRef:", { ...collectedRef.current });
      console.log("NO PENDING KEY OR ANSWER. SENDING CURRENT:", updatedCollected);
    }

    try {
      setIsLoading(true);

      const updatePayload: SessionData = {
        session_id: sessionId,
        messages: newMessages,
        status: "initial",
        response: {},
        collected: updatedCollected,
        updated_at: new Date().toISOString(),
      };

      if (round === 0) {
        updatePayload.status = "questions";
        updatePayload.response = {};
      }

      const { error: upsertError } = await supabase
        .from("sessions")
        .upsert(updatePayload, { onConflict: "session_id" });

      if (upsertError) {
        console.error("[CRUD] Pre-webhook save failed:", upsertError);
      }

      console.log("[API] Triggering proxy webhook via API route...");
      // FIX 2: PASS collected INTO API CALL (MUST BE UPDATED OBJECT)
      const response = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_input: currentAnswer,
          collected: updatedCollected,
          round: round,
        }),
      });

      if (!response.ok) throw new Error("API call failed");

      const responseData = await response.json();
      console.log("[API] Webhook response:", responseData);
      console.log("[API] Webhook direct response:", responseData);

      if (
        responseData &&
        (responseData.status === "questions" ||
          responseData.status === "complete")
      ) {
        processResponse(responseData.status, responseData.response);
      }
      
      // Always clear loading after receiving ANY valid response, regardless of processing result
      setIsLoading(false);
    } catch (error) {
      console.error("[API] Send error:", error);
      setIsLoading(false);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastUserIndex = newMessages
          .map((m) => m.role)
          .lastIndexOf("user");
        if (lastUserIndex !== -1) {
          newMessages[lastUserIndex] = {
            ...newMessages[lastUserIndex],
            isError: true,
          };
        }
        return newMessages;
      });
    }
  };

  const handleResendMessage = (index: number) => {
    const msg = messages[index];
    if (msg && msg.role === "user" && msg.isError) {
      // Remove failed message from state before resending
      setMessages((prev) => prev.filter((_, i) => i !== index));
      handleSendMessage(msg.text);
    }
  };

  // Handle Initial Load from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const sid = searchParams.get("session");
    if (sid) {
      // Prevent fetching twice if it's already the initial ID
      if (sid !== sessionId) {
        handleSelectSession(sid, false);
      }
    } else {
      window.history.replaceState({}, "", `?session=${sessionId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartOver = () => {
    const newId = uuidv4();
    window.history.pushState({}, "", `?session=${newId}`);
    setMessages([
      {
        role: "assistant",
        text: "Hi again! Let's start fresh. Please provide your name, email, skills, projects completed, any relevant experience, and education.",
      },
    ]);
    setCollected({});
    setRound(0);
    setResume("");
    setPendingKey(null);
    setLastProcessedAt(null);
    setSessionId(newId);
    lastProcessedAtRef.current = null;
  };

  const handleSelectSession = async (
    sid: string,
    updateUrl: boolean = true,
  ) => {
    console.log("[CRUD] Selecting session:", sid);

    // Eagerly set session ID and reset messages to show loading state instantly
    setSessionId(sid);
    setMessages([{ role: "assistant", text: "Loading session..." }]);
    // FIX 1: NEVER RESET collected here, let it be overwritten by DB load below

    if (updateUrl) {
      window.history.pushState({}, "", `?session=${sid}`);
    }

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_id", sid)
      .maybeSingle();

    if (error) {
      console.error("[CRUD] Error loading session:", error);
      return;
    }

    if (data) {
      const loadedMessages = data.messages || [
        {
          role: "assistant",
          text: "Hi again! Let's start fresh. Please provide your name, email, skills, projects completed, any relevant experience, and education.",
        },
      ];

      setMessages(data.messages || []);
      const loadedCollected = data.collected || {};
      setCollected(loadedCollected);
      collectedRef.current = loadedCollected;
      setRound(data.round || 0);

      // Restore pending key from messages if needed
      const lastMessage = loadedMessages[loadedMessages.length - 1];
      if (lastMessage && lastMessage.role === "assistant") {
        const restoredKey = mapQuestionToKey(lastMessage.text);
        setPendingKey(restoredKey);
        pendingKeyRef.current = restoredKey;
      }
      setRound(
        loadedMessages.filter((m: any) => m.role === "assistant").length - 1,
      );

      try {
        const parsed =
          typeof data.response === "string"
            ? JSON.parse(data.response)
            : data.response;
        if (data.status === "complete") {
          setResume(parsed.resume || "");
        } else {
          setResume("");
        }
      } catch (e) {}

      setIsLoading(false);
      lastProcessedAtRef.current = data.updated_at;
      setLastProcessedAt(data.updated_at);
    } else {
      // If no data (e.g., refreshed a brand new unsaved session URL), reset the chat UI
      setMessages([
        {
          role: "assistant",
          text: "Hi! I am your AI Resume Builder. Let's start by getting some basic details. Please provide your name, email, skills, projects completed, any relevant experience, and education.",
        },
      ]);
      setCollected({});
      setRound(0);
      setResume("");
      setPendingKey(null);
      setLastProcessedAt(null);
      lastProcessedAtRef.current = null;
    }
  };

  const handleDeleteSession = async (sid: string) => {
    console.log("[CRUD] Deleting session:", sid);
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("session_id", sid);

    if (error) {
      console.error("[CRUD] Error deleting session:", error);
    } else {
      if (sid === sessionId) {
        handleStartOver();
      } else {
        fetchSessions();
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-950 font-sans">
      <Sidebar
        sessions={sessions}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleStartOver}
      />

      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900 px-4 py-4 sm:px-6 shadow-sm">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </div>
              <h1 className="text-lg font-black tracking-tight uppercase italic transition-colors font-heading">
                AI<span className="text-blue-600 not-italic">Resume</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-md">
                Admin Sync
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 bg-transparent overflow-y-auto no-scrollbar pb-32">
          <ChatContainer
            messages={messages}
            onResendMessage={handleResendMessage}
          />

          {isLoading && (
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 mb-8">
              <div className="flex items-center gap-3 bg-zinc-900 dark:bg-white px-4 py-2.5 rounded-2xl self-start shadow-xl shadow-black/5 animate-in slide-in-from-bottom-2 duration-500">
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 bg-white dark:bg-black rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-white dark:bg-black rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-white dark:bg-black rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white dark:text-black">
                  Analyzing...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-zinc-950 via-white/80 dark:via-zinc-950/80 to-transparent">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>

        {resume && showResume && (
          <div className="absolute inset-0 bg-white dark:bg-zinc-950 z-20 overflow-y-auto p-4 sm:p-6 pt-20">
            <div className="max-w-3xl mx-auto pb-20">
              <div className="flex justify-start mb-4">
                <button
                  onClick={() => setShowResume(false)}
                  className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors py-2 px-1 text-sm font-bold uppercase tracking-widest"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M15 19l-7-7 7-7"
                    ></path>
                  </svg>
                  Back to Chat
                </button>
              </div>
              <ResumePreview resume={resume} onStartOver={handleStartOver} />
            </div>
          </div>
        )}

        {resume && !showResume && (
          <div className="absolute bottom-6 right-6 z-30">
            <button
              onClick={() => setShowResume(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold animate-bounce-subtle active:scale-95 transition-all"
            >
              <FileCode size={20} />
              View Resume
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
