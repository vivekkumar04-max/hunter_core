# Hunter Core — MERN Edition

A dark, RPG-inspired productivity dashboard built with React + Vite, Express, MongoDB, JWT authentication, and an optional Gamma API integration point.

## Features
- **Goal Planner at startup**: choose Study, Workout, or Skill; describe a measurable goal; set current level, target duration, and daily time; Gemma 4 creates a detailed roadmap and day-by-day tasks.
- **Goal progress dashboard**: mark tasks complete, see overall completion percentage, daily workload, milestones, and remaining tasks; plans and task completion are stored in MongoDB.
- Responsive dark Hunter System dashboard
- Register/login with JWT stored in an HTTP-only cookie
- MongoDB persistence for user profile, quests, focus sessions, and token transactions
- Create, update, complete, and delete quests
- 40-minute focus sessions with pause/resume/cancel and server-side reward protection
- Token wallet: one token per completed focus session, max wallet balance 30
- Level progression with centralized level costs
- Statistics cards and activity feed
- Optional Gamma API backend endpoint (`POST /api/ai/gamma`) that keeps the API key server-side

## Requirements
- Node.js 18+
- MongoDB local instance or MongoDB Atlas connection string

## Setup

### 1. Backend
```bash
cd server
cp .env.example .env
npm install
```
Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hunter-core
JWT_SECRET=replace_this_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
GAMMA_API_KEY=
GAMMA_API_BASE_URL=https://public-api.gamma.app/v1.0
GEMMA_API_KEY=your_google_ai_studio_api_key
GEMMA_MODEL=gemma-4-26b-a4b-it
```
Add your Gamma API key only if your Gamma account provides API access. Confirm the current API base URL and endpoint in Gamma's official API documentation before using the integration. The backend uses a configurable base URL and returns a clear error if no key is configured.

Run:
```bash
npm run dev
```

### 2. Frontend
In another terminal:
```bash
cd client
cp .env.example .env
npm install
npm run dev
```
Open http://localhost:5173.

## Notes
- The first screen supports demo mode without an account; quests and focus progress in demo mode are held in browser memory/local storage. For durable, account-based data, register and log in.
- Focus completion is verified by the backend session endpoint and duplicate rewards are prevented by marking a session rewarded once. Do not rely on client-submitted wallet values.
- The focus timer defaults to 40 minutes. Token economy rules are centralized in `server/config/economy.js`.
- Gamma endpoint details can change. The `/api/ai/gamma` route is a safe integration scaffold; adjust its request body to match the endpoint documented for your Gamma API account.


## Gemma 4 Goal Planner
1. Get a Google AI Studio API key from the official Google AI Studio site.
2. Add it as `GEMMA_API_KEY` in `server/.env`. Keep it on the server only.
3. `GEMMA_MODEL` defaults to `gemma-4-26b-a4b-it`; you can change it to another model identifier available to your API account.
4. Start the backend and frontend. The first page is Goal Planner. Choose Study, Workout, or Skill, enter the goal, starting level, number of days, and daily time budget, then generate the roadmap.
5. Log in or register to save the plan. On the dashboard, check off daily tasks to track progress. Your plan is stored in MongoDB.

The planner uses Google's Generative Language REST API. API access, quota, and billing depend on your Google AI Studio/API account. See the official Gemma API docs: https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
