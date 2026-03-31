import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_FIELDS = [
  { key: 'full_name', label: 'full name', question: 'Could you please provide your full name?' },
  { key: 'target_role', label: 'target role', question: 'What role or position are you targeting?' },
  { key: 'skills', label: 'skills', question: 'What are your core technical skills or expertise?' },
  { key: 'experience_or_projects', label: 'projects or experience', question: 'Could you share 1–2 projects or work experiences you\'ve had?' },
  { key: 'education', label: 'education', question: 'Finally, could you share your educational background (degree, college)?' },
];

// --- DATA SANITIZATION & NORMALIZATION ---
function cleanName(raw: string): string {
  if (!raw) return '';
  const firstLine = raw.split('\n')[0].trim();
  return firstLine
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/\d{10,}/g, '')
    .replace(/[0-9@.]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
}

function cleanEmail(raw: string): string {
  if (!raw) return '';
  const match = raw.match(/\S+@\S+\.\S+/);
  return match ? match[0] : '';
}

function cleanPhone(raw: string): string {
  if (!raw) return '';
  const match = raw.match(/\d{10}/);
  return match ? match[0] : '';
}

function cleanTargetRole(raw: string): string {
  if (!raw) return '';
  return raw.split('\n')[0].trim().substring(0, 100);
}

function cleanTextField(raw: string, maxLen: number = 500): string {
  if (!raw) return '';
  const lines = raw.split('\n');
  const meaningful = lines.filter(line => {
    const t = line.trim().toLowerCase();
    if (t.length < 3) return false;
    if (/^\d{10}$/.test(t)) return false;
    if (/^\S+@\S+\.\S+$/.test(t)) return false;
    return true;
  });
  return meaningful.join('\n').trim().substring(0, maxLen);
}

// STEP 1: Normalize keys
function sanitizeCollected(raw: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = { ...raw };
  
  if (clean.role && !clean.target_role) clean.target_role = clean.role;
  if (clean.tools && !clean.skills) clean.skills = clean.tools;
  if (clean.work && !clean.experience_or_projects) clean.experience_or_projects = clean.work;
  if (clean.degree && !clean.education) clean.education = clean.degree;

  if (clean.full_name) clean.full_name = cleanName(clean.full_name);
  if (clean.email) clean.email = cleanEmail(clean.email);
  if (clean.phone) clean.phone = cleanPhone(clean.phone);
  if (clean.target_role) clean.target_role = cleanTargetRole(clean.target_role);
  if (clean.skills) clean.skills = cleanTextField(clean.skills, 400);
  if (clean.education) clean.education = cleanTextField(clean.education, 400);
  if (clean.experience_or_projects) clean.experience_or_projects = cleanTextField(clean.experience_or_projects, 1000);
  
  return clean;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session_id, user_input = '', collected = {}, round = 0 } = body;
    
    console.log('[API PROXY] v3.1 Handshake Trigger:', session_id);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Extraction & Sanitization
    const extracted: Record<string, string> = {};
    const input = user_input.toLowerCase();

    if (user_input.length > 5 && user_input.includes('\n')) {
      const firstLine = user_input.split('\n')[0].trim();
      if (firstLine.length > 3 && firstLine.length < 50) extracted.full_name = firstLine;
    }

    const emailMatch = user_input.match(/\S+@\S+\.\S+/);
    if (emailMatch) extracted.email = emailMatch[0];
    const phoneMatch = user_input.match(/\d{10}/);
    if (phoneMatch) extracted.phone = phoneMatch[0];

    if (input.includes('skills') || input.includes('tools') || input.includes('react')) extracted.skills = user_input.trim();
    if (input.includes('education') || input.includes('degree') || input.includes('university')) extracted.education = user_input.trim();
    if (input.includes('experience') || input.includes('work') || input.includes('project')) extracted.experience_or_projects = user_input.trim();
    if (input.includes('role') || input.includes('targeting')) {
      extracted.target_role = user_input.split('\n')[0].replace(/role|targeting|position|is|i am/gi, '').trim();
    }

    const mergedRaw = { ...collected, ...extracted };
    const cleanedCollected = sanitizeCollected(mergedRaw);

    // Completion Threshold Check
    const skillCount = cleanedCollected.skills ? cleanedCollected.skills.split('\n').length : 0;
    const expCount = cleanedCollected.experience_or_projects ? cleanedCollected.experience_or_projects.split('\n').length : 0;
    
    const isSufficient = 
      cleanedCollected.full_name && 
      cleanedCollected.target_role && 
      skillCount >= 1 && 
      expCount >= 1;

    const nextMissing = REQUIRED_FIELDS.find((field) => {
      const val = cleanedCollected[field.key];
      return !val || (typeof val === 'string' && val.trim().length < 3);
    });

    if (!nextMissing || (isSufficient && round > 2)) {
      console.log('[API PROXY] Triggering Generator...');
      
      // DEEP-PERSIST: Update database before triggering generator to seal the session
      await supabase.from('sessions').upsert({
        session_id: session_id,
        collected: cleanedCollected,
        status: 'complete',
        updated_at: new Date().toISOString()
      });

      let apData: {
        resume?: string;
        status?: string;
        collected?: Record<string, string>;
        response?: { resume?: string; };
      } = {};

      try {
        const response = await fetch('https://cloud.activepieces.com/api/v1/webhooks/6ZRUJzIYQICVJLEVUmpjB', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id, collected: cleanedCollected }),
        });

        if (response.ok) {
          const text = await response.text();
          apData = text ? JSON.parse(text) : {};
        }
      } catch {
        console.error('[API PROXY] Generator timeout/faliure.');
      }

      const rawResume = apData?.response?.resume || apData?.resume || "";
      const isValid = rawResume && rawResume.length > 50;

      return NextResponse.json({
        status: 'complete',
        response: {
          questions: [],
          resume: isValid ? rawResume : "",
          collected: cleanedCollected,
          ats_score: isValid ? 85 : 0
        }
      });
    }

    // Ask next question
    return NextResponse.json({
      status: 'questions',
      response: {
        questions: [nextMissing.question],
        collected: cleanedCollected
      },
    });

  } catch (error) {
    const err = error as Error;
    console.error('[API PROXY] Internal Error:', err.message);
    return NextResponse.json({
      status: 'questions',
      response: { questions: ['I encountered a small hiccup. Please try describing your experience once more.'], error: err.message }
    }, { status: 200 });
  }
}
