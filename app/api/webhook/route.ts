import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// --- FREEDOM FLOW v4.2: NO FIELD TRACKING ---

interface ActivePiecesResponse {
  response?: {
    resume?: string;
    suggested_roles?: string[];
    recommended_courses?: string[];
  };
  resume?: string;
  data?: {
    resume?: string;
    suggested_roles?: string[];
    recommended_courses?: string[];
  };
  output?: string;
  content?: string;
  suggested_roles?: string[];
  recommended_courses?: string[];
}

export async function POST(req: Request) {
  // Use AbortController for internal timeouts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for API route

  try {
    const body = await req.json();
    const { session_id, user_input = '', collected = {} } = body;
    
    console.log('[API PROXY] v4.2 Freedom Trigger:', session_id);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // One-shot extraction: AI handles the paragraph
    const cleanedCollected = { 
       ...collected, 
       general: user_input.trim(),
       last_update: new Date().toISOString()
    };

    // Threshold for generation: Any significant paragraph triggers the builder
    const isMeaningful = user_input.trim().split(/\s+/).length >= 5;

    if (isMeaningful) {
      console.log('[API PROXY] One-shot sufficient. Triggering Generator...');
      
      // v7.8 START GENERATION: Set state to generating first
      await supabase.from('sessions').upsert({
        session_id: session_id,
        collected: cleanedCollected,
        status: 'generating',
        updated_at: new Date().toISOString()
      });

      let apData: ActivePiecesResponse = {};
      try {
        const apPayload = { 
          session_id, 
          collected: cleanedCollected, 
          user_input: user_input.trim(),
          paragraph: user_input.trim(), // v7.9 REDUNDANCY
          context: user_input.trim(),   // v7.9 REDUNDANCY
          query: user_input.trim()      // v7.9 REDUNDANCY
        };
        
        console.log('[API PROXY] Triggering Webhook with payload:', JSON.stringify(apPayload).slice(0, 300) + '...');

        // Apply timeout to external webhook call
        const response = await fetch('https://cloud.activepieces.com/api/v1/webhooks/6ZRUJzIYQICVJLEVUmpjB', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apPayload),
          signal: controller.signal
        });

        if (response.ok) {
          const text = await response.text();
          console.log('[API PROXY] v7.9 RAW RESPONSE:', text.slice(0, 800) + (text.length > 800 ? '...' : ''));
          apData = text ? JSON.parse(text) : {};
        } else {
          const errText = await response.text();
          console.error('[API PROXY] Generator Failed | Status:', response.status, '| Msg:', errText);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('[API PROXY] Webhook Timed Out after 25s');
        } else {
          console.error('[API PROXY] Critical Fetch Error:', err);
        }
      } finally {
        clearTimeout(timeoutId);
      }

      // v7.9 HYPER-EXTRACTION
      const rawResume = apData?.response?.resume || 
                        apData?.resume || 
                        apData?.data?.resume || 
                        apData?.output || 
                        apData?.content ||
                        "";
      
      const isValid = !!(rawResume && rawResume.length > 50);

      // v7.8 SEAL COMPLETION: Only set complete if content is valid
      if (isValid) {
        await supabase.from('sessions').update({
          status: 'complete',
          response: { 
            resume: rawResume, 
            ats_score: 85,
            suggested_roles: apData?.suggested_roles || apData?.response?.suggested_roles || apData?.data?.suggested_roles || [],
            recommended_courses: apData?.recommended_courses || apData?.response?.recommended_courses || apData?.data?.recommended_courses || []
          },
          updated_at: new Date().toISOString()
        }).eq('session_id', session_id);
      }

      return NextResponse.json({
        status: isValid ? 'complete' : 'error',
        response: {
          questions: isValid ? [] : ["AI Generation was triggered, but no resume content was returned. Please check your Activepieces workflow mapping or logs."],
          resume: isValid ? rawResume : "",
          collected: cleanedCollected,
          ats_score: isValid ? 85 : 0,
          suggested_roles: apData?.suggested_roles || apData?.response?.suggested_roles || apData?.data?.suggested_roles || [],
          recommended_courses: apData?.recommended_courses || apData?.response?.recommended_courses || apData?.data?.recommended_courses || []
        }
      });
    }

    // If input was too short/greetings, ask for the full paragraph
    return NextResponse.json({
      status: 'questions',
      response: {
        questions: ["Please describe your full details in one paragraph (including Name, Role, Skills, etc.) so I can generate your resume."],
        collected: cleanedCollected
      },
    });

  } catch (error) {
    clearTimeout(timeoutId);
    const err = error as Error;
    console.error('[API PROXY] Error:', err.message);
    return NextResponse.json({
      status: 'questions',
      response: { questions: ['I encountered an error. Please try providing your details again.'], error: err.message }
    }, { status: 200 });
  }
}
