import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🤖 Chat Assistant Edge Function called');
  console.log('📝 Request method:', req.method);
  console.log('📝 Request URL:', req.url);

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Parsing request body...');
    const { message, context, capabilities } = await req.json();
    console.log('📥 Request payload:', { 
      messageLength: message?.length || 0, 
      hasContext: !!context,
      contextKeys: context ? Object.keys(context) : [],
      capabilities
    });

    console.log('🔧 Checking OpenAI API key...');
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      console.error('❌ OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not set');
    }
    console.log('✅ OpenAI API key found');

    console.log('📝 Building system prompt...');
    const systemPrompt = `You are an executive assistant helping users manage their productivity dashboard. 

Current context from their screen:
${context ? JSON.stringify(context, null, 2) : 'No context provided'}

Your role:
- Help prioritize tasks and meetings
- Provide insights about their schedule and todos
- Answer questions about what they see on screen
- Give productivity advice based on their current workload
- Be concise and professional
${capabilities?.canAddTask ? '- Create tasks when requested by the user' : ''}

Slack Information Available:
- Channels: ${context?.slackData?.channels?.length || 0} channels
- Messages: ${context?.slackData?.messages?.length || 0} recent messages
- Mentions: ${context?.slackData?.mentions?.length || 0} mentions
- Connection Status: ${context?.slackData?.isConnected ? 'Connected' : 'Not Connected'}

${capabilities?.canAddTask ? `
TASK CREATION CAPABILITY:
When a user asks you to create a task, you can create it by responding with a specific JSON format in your message.
To create a task, include this exact JSON structure anywhere in your response:

TASK_CREATE: {"title": "Task title", "description": "Optional description", "deadline": "2025-08-10T00:00:00.000Z"}

Rules for task creation:
- Only create tasks when explicitly requested by the user
- Always include a clear, actionable title
- Add description if details are provided
- Set deadline if user specifies timing (use ISO format or null)
- Confirm the task creation in your response text

Example: "I'll create that task for you. TASK_CREATE: {"title": "Review quarterly budget", "description": "Go through Q4 budget proposal", "deadline": null}"
` : 'You can only provide information and analysis - you cannot edit or modify anything.'}`;

    console.log('📝 System prompt length:', systemPrompt.length);
    console.log('🌐 Calling OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    console.log('📥 OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 OpenAI API response:', { 
      model: data.model,
      usage: data.usage,
      choicesCount: data.choices?.length || 0
    });

    const assistantMessage = data.choices[0].message.content;
    console.log('✅ Assistant message generated, length:', assistantMessage.length);

    // Check if the assistant wants to create a task
    let taskToCreate = null;
    let cleanMessage = assistantMessage;
    
    if (capabilities?.canAddTask) {
      const taskMatch = assistantMessage.match(/TASK_CREATE:\s*({[^}]+})/);
      if (taskMatch) {
        try {
          taskToCreate = JSON.parse(taskMatch[1]);
          // Remove the TASK_CREATE JSON from the message
          cleanMessage = assistantMessage.replace(/TASK_CREATE:\s*{[^}]+}/, '').trim();
          console.log('📝 Task creation requested:', taskToCreate);
        } catch (error) {
          console.error('❌ Failed to parse task JSON:', error);
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: cleanMessage,
      taskToCreate 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('💥 Error in chat-assistant function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});