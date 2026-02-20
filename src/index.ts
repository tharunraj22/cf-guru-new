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

    let allTools = [];
    let statusLog = [];

    for (const s of SERVERS) {
      try {
        if (s.auth && !apiToken) continue;
        // Correct headers for agents v0.5.0
        const options = s.auth ? { headers: { "Authorization": `Bearer ${apiToken}` } } : {};
        
        const mcp = await this.addMcpServer(s.id, s.url, options);
        allTools.push(...mcp.tools);
        statusLog.push(`✅ ${s.id}`);
      } catch (err) {
        statusLog.push(`❌ ${s.id}`);
      }
    }

    const systemPrompt = `
      You are a Senior Cloudflare Architect. 
      Connected Modules: ${statusLog.join(", ")}.
      - Use 'cloudflare-docs' for documentation.
      - Use 'cloudflare-radar' for traffic/bot/IPv6 stats.
      - Use 'worker-bindings' to list user resources.
    `;

    try {
      const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        tools: allTools
      });

      if (response.tool_calls && response.tool_calls.length > 0) {
        return new Response(`🛠️ Using Tool: ${response.tool_calls[0].name}...`);
      }

      return new Response(response.response || "No response received.");
    } catch (e) {
      return new Response(`AI Error: ${e.message}`);
    }
  }
}

const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Cloudflare Guru</title><script src="https://cdn.tailwindcss.com"></script><script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script></head><body class="bg-zinc-950 text-zinc-200 p-8 flex flex-col items-center h-screen font-sans"><div class="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-full"><header class="p-6 border-b border-zinc-800 flex justify-between items-center"><h1 class="text-xl font-bold text-white">Cloudflare Guru</h1><div class="flex gap-2 text-[10px] font-bold uppercase text-zinc-500"><span class="px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700">Radar ✅</span><span class="px-2 py-1 rounded-md bg-zinc-800 border border-zinc-700">Docs ✅</span></div></header><div id="chat" class="flex-1 overflow-y-auto p-6 space-y-4"></div><form id="f" class="p-4 border-t border-zinc-800 flex gap-2"><input id="i" class="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-zinc-600 transition" placeholder="Ask about stats or configuration..." autocomplete="off"><button class="bg-zinc-100 text-black px-6 rounded-xl font-bold hover:bg-white transition">Send</button></form></div><script>const f=document.getElementById('f'),i=document.getElementById('i'),c=document.getElementById('chat');f.onsubmit=async e=>{e.preventDefault();const t=i.value;if(!t)return;i.value='';c.innerHTML+='<div class="text-zinc-500 text-sm mb-1 uppercase font-bold tracking-wider">You</div><div class="mb-6 text-zinc-100 leading-relaxed">'+t+'</div>';const r=await fetch('/',{method:'POST',body:JSON.stringify({text:t})});const d=await r.text();c.innerHTML+='<div class="text-orange-500 text-sm mb-1 uppercase font-bold tracking-wider">Agent</div><div class="mb-6 prose prose-invert text-zinc-300">'+marked.parse(d)+'</div>';c.scrollTop=c.scrollHeight;};</script></body></html>`;

export default {
  async fetch(request, env) {
    if (request.method === "GET") return new Response(html, { headers: { "Content-Type": "text/html" } });
    const id = env.ChatBot.idFromName("default");
    const stub = env.ChatBot.get(id);
    return stub.fetch(request);
  }
};