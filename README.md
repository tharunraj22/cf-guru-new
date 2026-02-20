# 🧡 Cloudflare Guru: Unified AI Agent

Cloudflare Guru is an advanced AI Agent built on **Cloudflare Workers** using the **Agents SDK**. It serves as a centralized "Mission Control" for Cloudflare developers, combining real-time internet intelligence, official documentation, and account resource management into a single conversational interface.

---

## 🚀 Features

- **The Trinity of MCPs**: Integrated with three official Model Context Protocol (MCP) servers:
  - **Radar**: Real-time stats on bot traffic, IPv6 adoption, and global outages.
  - **Developer Docs**: Instant access to the latest Cloudflare documentation.
  - **Worker Bindings**: Insight into your account's Workers, KV namespaces, and D1 databases.
- **SQLite-Powered Memory**: Uses the latest Durable Objects SQLite storage backend for robust state management.
- **Modern UI**: A sleek, responsive, and "eye-friendly" chat interface with syntax highlighting and Markdown support.
- **Local Health Checks**: Built-in logic to verify connectivity to all MCP modules.

---

## 🛠️ Tech Stack

- **Runtime**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Orchestration**: [Cloudflare Agents SDK](https://github.com/cloudflare/agents)
- **Model**: `@cf/meta/llama-3.1-8b-instruct`
- **UI**: Tailwind CSS, Marked.js (Markdown), Highlight.js (Syntax Highlighting)

---

## 📦 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed.
- [Cloudflare Account](https://dash.cloudflare.com/) with Workers AI and Durable Objects enabled.

### 2. Installation
```bash
# Clone the repository
git clone [https://github.com/tharunraj22/cf-guru-new.git](https://github.com/tharunraj22/cf-guru-new.git)
cd cf-guru-new
    
# Install dependencies
npm install
```

### 3. Configuration

To ensure the security and connectivity of the agent, you must set up your API permissions:
**API Token Permissions:** Create a token in the Cloudflare Dashboard with these scopes:
```
1. Account -> Account Settings -> Read
2. Account -> Worker Scripts -> Read
3. Account -> Cloudflare Radar -> Read
```
**Secrets Management:** Securely add your token to the Worker using Wrangler:
```
npx wrangler secret put CLOUDFLARE_API_TOKEN
```

### 4. Deployment

Deploy your code and handle SQLite migrations with a single command:
```
npx wrangler deploy
```

### 🧩 Architecture

The agent acts as a Durable Object that orchestrates multiple MCP servers. By utilizing the SQLite storage backend, the agent maintains a persistent state and a history of interactions.

**Important Note on Migrations**

This project uses SQLite storage. If you rename the Durable Object class (e.g., from `ChatBot` to `ChatBotV2`), you must update the `[[migrations]]` section in `wrangler.toml` and include a `deleted_classes` directive for the old class to avoid deployment errors such as Code 10064.
