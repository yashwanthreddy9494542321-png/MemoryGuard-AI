# MemoraGuard AI 🛡️🧠

> **Your Memory. Your Control.**  
> Privacy-first personal memory assistant backend and web application with granular access control, deterministic offline vector search, and seamless unified Vercel deployment.

---

## 🚀 Live Vercel Deployment

MemoraGuard AI is configured for a **unified full-stack deployment** on [Vercel](https://vercel.com):
- **Frontend**: High-performance React 19 + TypeScript + Vite Single-Page Application (SPA) served via Vercel Edge CDN.
- **Backend**: Python 3.12+ FastAPI serverless functions in `/api` with SQLite `/tmp` storage and embedded in-memory Qdrant vector database.
- **Unified Routing**: Client API calls to `/api/*` are automatically routed to the FastAPI serverless functions, while all other requests serve the Vite React SPA without CORS hurdles.

### How the Vercel Setup Works:
- [`vercel.json`](file:///./vercel.json): Configures automatic build commands (`npm run build`), specifies the frontend output directory (`frontend/dist`), and defines rewrite rules mapping `/api/(.*)` to [`api/index.py`](file:///./api/index.py) and all other routes to [`index.html`](file:///./frontend/index.html).
- [`requirements.txt`](file:///./requirements.txt): Declares Python serverless dependencies (FastAPI, Qdrant Client, Pydantic, HTTPX, etc.) for Vercel's Python runtime.
- [`package.json`](file:///./package.json): Root monorepo build coordination executing `npm --prefix frontend install && npm --prefix frontend run build`.
- [`api/index.py`](file:///./api/index.py): Serverless entrypoint connecting directly to the FastAPI core backend with automatic path normalization.

---

## 🛠️ Monorepo Structure

```text
MemoraGuard-AI/
├── api/
│   ├── index.py              # Vercel Serverless Function Python entrypoint
│   └── requirements.txt      # Function-level Python dependencies
├── backend/
│   ├── app/
│   │   ├── routes/           # REST endpoints (/api/memories, /api/chat, /api/privacy, /api/status)
│   │   ├── config.py         # Dynamic path & environment resolution (Vercel /tmp safe)
│   │   ├── database.py       # SQLite data store for memories, access policies, audit logs
│   │   ├── embeddings.py     # Deterministic 384-dim semantic vector embeddings (zero-telemetry)
│   │   ├── lyzr_client.py    # Lyzr Agent Studio integration with demo fallback
│   │   ├── main.py           # FastAPI application definition with Vercel path middleware
│   │   ├── security.py       # Role-based & ownership privacy policy enforcement
│   │   └── vector_db.py      # Qdrant client with automatic :memory: serverless fallback
│   ├── init_db.py            # Sample realistic demo memories seeder
│   └── requirements.txt      # Backend Python requirements
├── frontend/
│   ├── src/
│   │   ├── components/       # Memory cards, chat UI, privacy dashboard, diagnostics
│   │   ├── api.ts            # Client API fetch wrapper (relative /api paths)
│   │   ├── App.tsx           # Main application view with tab navigation
│   │   └── types.ts          # TypeScript domain interfaces
│   ├── package.json          # React + Vite dependencies
│   ├── tsconfig.app.json     # Standardized TypeScript compiler config
│   └── vite.config.ts        # Vite configuration with /api proxy for local dev
├── vercel.json               # Vercel deployment & rewrite configuration
├── package.json              # Monorepo root package script runner
├── requirements.txt          # Root Python serverless dependencies for Vercel
└── README.md
```

---

## ⚙️ Environment Variables (Optional for Vercel)

The application includes fully functional offline/demo modes, in-memory vector storage, and automated sample data seeding. If you have API keys, you can add them in your **Vercel Project Settings -> Environment Variables**:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `LYZR_API_KEY` | Lyzr Agent Studio API Key | *(Empty - runs local demo buffer)* |
| `LYZR_AGENT_ID` | Lyzr Agent Studio Agent ID | *(Empty)* |
| `LYZR_API_URL` | Lyzr inference endpoint | `https://agent-prod.studio.lyzr.ai/v3/inference/chat/` |
| `QDRANT_URL` | Optional remote hosted Qdrant endpoint | *(Empty - uses in-memory Qdrant)* |
| `QDRANT_API_KEY` | Qdrant Cloud API Key | *(Empty)* |
| `DEFAULT_VISIBILITY` | Default privacy tier (`private`, `selected`, `shared`) | `private` |

---

## 💻 Local Development

### 1. Install & Run Everything Together
```bash
# Windows
run_all.bat
```

### 2. Manual Start
**Backend:**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to test the UI connected to `http://127.0.0.1:8000`.

---

## 🔒 Core Privacy & Security Principles

1. **Ephemeral Dialogue Buffer by Default**: Conversations are never persisted to long-term memory without explicit user approval.
2. **Explicit User Approval Required**: The assistant highlights memory candidates; memories are saved only when the user clicks **Save Memory**.
3. **Strict Authorization Enforcement**: Users cannot read, search, or view memories owned by others unless explicitly shared or added to the memory's access list.
4. **Complete Audit Trail**: Every access attempt, export, and deletion is recorded in a transparent audit log with actor ID and timestamp.