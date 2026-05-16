import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractPassage(fullText: string): string {
  // Skip the Gutenberg license header
  let content = fullText
  const startMarker = fullText.indexOf('*** START OF')
  if (startMarker !== -1) {
    const lineEnd = fullText.indexOf('\n', startMarker)
    content = fullText.substring(lineEnd + 1).trim()
  }

  // Split into paragraphs (blank line = paragraph break)
  const paragraphs = content.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(p => p.length > 0)

  for (const para of paragraphs) {
    // Too short — probably a heading or blank line artifact
    if (para.length < 200) continue

    // Looks like a chapter heading or front matter label
    if (/^(chapter|contents|preface|introduction|dedication|appendix|part\s|produced by|transcribed|illustrated)/i.test(para)) continue

    // Mostly uppercase — likely a title or heading
    const letters = (para.match(/[a-zA-Z]/g) || []).length
    const upper = (para.match(/[A-Z]/g) || []).length
    if (letters > 0 && upper / letters > 0.5) continue

    // This looks like real prose — return up to 800 characters
    return para.substring(0, 800).trim()
  }

  // Fallback if nothing matched
  return content.substring(0, 800).trim()
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bookId } = await req.json()
    const url = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Gutenberg returned ${res.status}`)

    const fullText = await res.text()
    const passage = extractPassage(fullText)

    return new Response(
      JSON.stringify({ text: passage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
