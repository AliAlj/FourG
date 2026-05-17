import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, max_tokens = 200, project_id } = await req.json()

    const apiKey = Deno.env.get('IBM_API_KEY')
    if (!apiKey) throw new Error('IBM_API_KEY secret not set')

    // Exchange API key for bearer token
    const tokenRes = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${apiKey}`
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error('Failed to get IBM token')

    // Call watsonx
    const wxRes = await fetch('https://us-south.ml.cloud.ibm.com/ml/v1/text/chat?version=2023-05-29', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_id: 'ibm/granite-4-h-small',
        messages,
        project_id,
        max_tokens
      })
    })

    const data = await wxRes.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) throw new Error(JSON.stringify(data))

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
