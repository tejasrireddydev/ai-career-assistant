import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_FIELDS = [
  { key: 'full_name', label: 'full name', question: 'Could you please provide your full name?' },
  { key: 'target_role', label: 'target role', question: 'What role or position are you targeting?' },
  { key: 'skills', label: 'skills', question: 'What are your core technical skills or expertise?' },
  { key: 'experience_or_projects', label: 'projects or experience', question: 'Could you share 1–2 projects or work experiences you\'ve had?' },
  { key: 'education', label: 'education', question: 'Finally, could you share your educational background (degree, college)?' },
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, user_input = '', collected = {}, round = 0 } = body;
    
    console.log('[API PROXY] Processing workflow for session:', session_id);

    // Initial Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // --- HEURISTIC EXTRACTION (Local Smart Detection) ---
    const extracted: Record<string, any> = {};
    const input = user_input.toLowerCase();

    // name: First line if input is long enough
    if (user_input.length > 5 && user_input.includes('\n')) {
      const firstLine = user_input.split('\n')[0].trim();
      if (firstLine.length > 3 && firstLine.length < 50) {
        extracted.full_name = firstLine;
      }
    }

    // email/phone: Simple Regex
    const emailMatch = user_input.match(/\S+@\S+\.\S+/);
    if (emailMatch) extracted.email = emailMatch[0];
    const phoneMatch = user_input.match(/\d{10}/);
    if (phoneMatch) extracted.phone = phoneMatch[0];

    // skills: Keyword detection
    if (input.includes('java') || input.includes('react') || input.includes('sql') || input.includes('python') || input.includes('testing')) {
       extracted.skills = user_input.substring(0, 200).trim(); // Partial extraction for safety
    }

    // education: College keywords
    if (input.includes('college') || input.includes('university') || input.includes('school') || input.includes('b.tech') || input.includes('degree')) {
       extracted.education = user_input.substring(0, 300).trim();
    }

    // projects: Project keywords
    if (input.includes('project') || input.includes('built') || input.includes('developed') || input.includes('forecasting')) {
       extracted.experience_or_projects = user_input.substring(0, 500).trim();
    }

    let apData: any = {};
    try {
      // 1. Forward to ActivePieces for extraction/generation
      const response = await fetch('https://cloud.activepieces.com/api/v1/webhooks/6ZRUJzIYQICVJLEVUmpjB', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const text = await response.text();
        apData = text ? JSON.parse(text) : {};
        console.log('[API PROXY] ActivePieces responded:', apData);
      }
    } catch (e) {
      console.error('[API PROXY] ActivePieces connection failed.');
    }

    // 2. HARDENING: Re-fetch if async (Already implemented)
    let finalData = apData;
    const isPossiblyAsync = !apData.status || (apData.status === 'questions' && (!apData.response?.questions || apData.response.questions.length === 0));

    if (isPossiblyAsync) {
       console.log('[API PROXY] Attempting patience-fetch (Retry: 750ms)...');
       await new Promise(resolve => setTimeout(resolve, 750)); 
       const { data: dbSession } = await supabase.from('sessions').select('status, response, collected').eq('session_id', session_id).maybeSingle();
       if (dbSession && dbSession.status && dbSession.status !== 'initial') {
         finalData = { status: dbSession.status, response: dbSession.response || {}, collected: dbSession.collected || {} };
       }
    }

    // 3. SMART DATA MERGE
    const apResponse = finalData?.response || finalData || {};
    const aiExtractedData = finalData?.collected || apResponse?.collected || {};
    
    // Merge: HEURISTICS (Local) + AI (Upstream) + PREVIOUS (State)
    const currentCollected = { ...collected, ...extracted, ...aiExtractedData };
    
    // Check missing fields in strict order
    const nextMissing = REQUIRED_FIELDS.find(field => {
      const val = currentCollected[field.key];
      return !val || (typeof val === 'string' && val.trim().length < 3);
    });

    // 4. SMART RESPONSE (SKIP REPETITION)
    const filledCount = REQUIRED_FIELDS.filter(f => currentCollected[f.key]).length;

    if (!nextMissing) {
      return NextResponse.json({
        status: 'complete',
        response: {
          questions: [],
          resume: apResponse.resume || finalData.resume || (typeof apResponse === 'string' ? apResponse : ''),
          collected: currentCollected
        }
      });
    }

    // If we extracted a lot of stuff at once, give positive feedback
    let questionText = nextMissing.question;
    if (filledCount >= 3 && round === 0) {
      questionText = `Great! I've captured most of your details from that resume. Just need a few more bits: ${nextMissing.question}`;
    }

    return NextResponse.json({
      status: 'questions',
      response: {
        questions: [questionText],
        collected: currentCollected
      }
    });

  } catch (error: any) {
    console.error('[API PROXY] Critical internal error:', error);
    return NextResponse.json({
      status: 'questions',
      response: { questions: ['I encountered a small hiccup. Could you tell me more about your experience or skills?'], error: error.message }
    }, { status: 200 });
  }
}
