import { Agent } from "agents";

export class ChatBotV2 extends Agent {
  async fetch(request: Request) {
    let message = "";
    try {
      const data = await request.json() as any;
      message = data.text;
    } catch (e) {
      return new Response("Error parsing input", { status: 400 });
    }

    const apiToken = this.env.CLOUDFLARE_API_TOKEN || "";
    
    // Official MCP Server Configuration
    const SERVERS = [
      { id: "docs", url: "https://docs.mcp.cloudflare.com/mcp", auth: false },
      { id: "radar", url: "https://radar.mcp.cloudflare.com/mcp", auth: true },
      { id: "bindings", url: "https://bindings.mcp.cloudflare.com/mcp", auth: true }
    ];

    let allTools: any[] = [];
    let statusLog: string[] = [];

    // Connect to MCP servers and gather tools
    for (const s of SERVERS) {
      try {
        if (s.auth && !apiToken) continue;
        const options = s.auth ? { headers: { "Authorization": `Bearer ${apiToken}` } } : {};
        
        const mcp = await this.addMcpServer(s.id, s.url, options);
        allTools.push(...mcp.tools);
        statusLog.push(`✅ ${s.id}`);
      } catch (err) {
        statusLog.push(`❌ ${s.id}`);
      }
    }

    // Aggressive System Prompt
    const systemPrompt = `
      You are a Senior Cloudflare Architect. 
      Connected Modules: ${statusLog.join(", ")}.
      
      You have access to specialized tools. You MUST use them to answer questions instead of relying on your base knowledge.
      - If the user asks about configuration, WAF, Workers, or how to do something, use the 'cloudflare-docs' tool.
      - If the user asks about stats, bots, or traffic, use the 'cloudflare-radar' tool.
      - If the user asks about their account resources, use the 'worker-bindings' tool.
    `;

    // THE FIX: Translate MCP standard to Cloudflare AI standard
    const aiTools = allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema // Map MCP inputSchema to Llama 3.1 parameters
    }));

    try {
      // Call Llama 3.1
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        tools: aiTools
      });

      // Intercept the Tool Call
      if (response.tool_calls && response.tool_calls.length > 0) {
        return new Response(`🛠️ Using Tool: ${response.tool_calls[0].name}...`);
      }

      // Fallback text response
      return new Response(response.response || "No response received.");
    } catch (e: any) {
      return new Response(`AI Error: ${e.message}`);
    }
  }
}

// Modern Dark Mode UI (Safe Multi-line Format)
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cloudflare Guru</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    /* Sleek custom scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: #52525b; }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-200 p-4 md:p-8 flex flex-col items-center h-screen font-sans selection:bg-indigo-500 selection:text-white">
  <div class="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col h-full overflow-hidden">
    
    <header class="p-6 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center z-10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <div>
          <h1 class="text-xl font-bold text-white tracking-tight">Cloudflare Guru</h1>
          <p class="text-xs text-zinc-400 font-medium">AI Agent &middot; Online</p>
        </div>
      </div>
      <div class="flex gap-2 text-[10px] font-bold uppercase text-zinc-400">
        <span class="px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700/50 shadow-sm flex items-center gap-1.5">
          <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> MCP Active
        </span>
      </div>
    </header>

    <div id="chat" class="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scroll-smooth bg-[#0f0f11]"></div>

    <form id="f" class="p-4 bg-zinc-900 border-t border-zinc-800">
      <div class="relative flex items-center">
        <input id="i" class="w-full bg-zinc-800/50 border border-zinc-700 text-zinc-100 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder-zinc-500 shadow-inner" placeholder="Ask about stats, config, or resources..." autocomplete="off">
        <button class="absolute right-2 w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50" type="submit">
          <svg class="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      </div>
      <div class="text-center mt-3 text-[10px] text-zinc-500">Cloudflare Guru can make mistakes. Verify critical configuration.</div>
    </form>
  </div>

  <script>
    const f = document.getElementById('f');
    const i = document.getElementById('i');
    const c = document.getElementById('chat');

    // 1. Initial Welcome Message (Left-Aligned Agent Bubble)
    window.onload = () => {
      c.innerHTML = \`
        <div class="flex flex-col gap-1.5 items-start max-w-[85%]">
          <div class="flex items-center gap-2 ml-1">
            <span class="text-orange-500 text-xs font-bold uppercase tracking-wider">Guru Agent</span>
          </div>
          <div class="bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 p-5 rounded-2xl rounded-tl-sm shadow-md prose prose-sm prose-invert leading-relaxed">
            <p class="text-lg mb-2">👋 <strong>Welcome to Cloudflare Guru!</strong></p>
            <p>I am your specialized AI assistant connected directly to Cloudflare's infrastructure. Here is how you can use me:</p>
            <ul class="space-y-1 mt-3 list-none pl-0">
              <li class="flex items-start gap-2"><span class="text-indigo-400">📚</span> <strong>Docs:</strong> Ask me how to configure WAF, set up Workers, or use any product.</li>
              <li class="flex items-start gap-2"><span class="text-green-400">📊</span> <strong>Radar:</strong> Ask for real-time stats on internet traffic, bots, or IPv6.</li>
              <li class="flex items-start gap-2"><span class="text-blue-400">💻</span> <strong>Resources:</strong> Ask me to list your current Worker bindings or databases.</li>
            </ul>
            <p class="mt-4 text-zinc-400 italic">Try asking: "What is the current bot traffic in India?"</p>
          </div>
        </div>
      \`;
    };

    f.onsubmit = async e => {
      e.preventDefault();
      const t = i.value.trim();
      if (!t) return;
      
      // Clear input and lock it briefly
      i.value = '';
      i.disabled = true;

      // 2. User Message (Right-Aligned Indigo Bubble)
      c.innerHTML += \`
        <div class="flex flex-col gap-1.5 items-end self-end max-w-[85%] ml-auto">
          <div class="flex items-center gap-2 mr-1">
            <span class="text-indigo-400 text-xs font-bold uppercase tracking-wider">You</span>
          </div>
          <div class="bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-sm shadow-md leading-relaxed whitespace-pre-wrap">\${t.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>
      \`;
      c.scrollTop = c.scrollHeight;

      // 3. Typing Indicator Animation (Bouncing Dots)
      const typingId = 'typing-' + Date.now();
      c.innerHTML += \`
        <div id="\${typingId}" class="flex flex-col gap-1.5 items-start max-w-[85%]">
          <div class="flex items-center gap-2 ml-1">
            <span class="text-orange-500 text-xs font-bold uppercase tracking-wider">Guru Agent</span>
            <span class="text-zinc-500 text-[10px] animate-pulse">Thinking...</span>
          </div>
          <div class="bg-zinc-800/80 border border-zinc-700/50 px-5 py-4 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1.5 h-[52px]">
            <div class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>
      \`;
      c.scrollTop = c.scrollHeight;

      try {
        const r = await fetch('/', { method: 'POST', body: JSON.stringify({ text: t }) });
        const d = await r.text();
        
        // Remove typing indicator once data arrives
        const typingEl = document.getElementById(typingId);
        if(typingEl) typingEl.remove();

        // 4. Agent Response (Left-Aligned Dark Bubble)
        c.innerHTML += \`
          <div class="flex flex-col gap-1.5 items-start max-w-[85%]">
            <div class="flex items-center gap-2 ml-1">
              <span class="text-orange-500 text-xs font-bold uppercase tracking-wider">Guru Agent</span>
            </div>
            <div class="bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 p-5 rounded-2xl rounded-tl-sm shadow-md prose prose-sm prose-invert leading-relaxed max-w-none">
              \${marked.parse(d)}
            </div>
          </div>
        \`;
        c.scrollTop = c.scrollHeight;
      } catch (err) {
        document.getElementById(typingId)?.remove();
        c.innerHTML += \`<div class="text-red-500 text-sm text-center my-4 bg-red-500/10 p-2 rounded">Connection error. Please try again.</div>\`;
      } finally {
        // Unlock input
        i.disabled = false;
        i.focus();
      }
    };
  </script>
</body>
</html>
`;
// --- The Worker Export (REQUIRED FOR DURABLE OBJECTS) ---
export default {
  async fetch(request: Request, env: any) {
    // 1. Serve the HTML UI for standard browser requests
    if (request.method === "GET") {
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }
    
    // 2. Route all POST (Chat) requests to the SQLite Durable Object
    const id = env.ChatBot.idFromName("default");
    const stub = env.ChatBot.get(id);
    return stub.fetch(request);
  }
};