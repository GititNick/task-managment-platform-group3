# task-managment-platform-group3
Group 3 task management platform CSIT425

## Deployment Notes

This repository contains two separate apps:

- `client/` — React frontend
- `backend/` — Express backend that connects to Neon PostgreSQL

### Backend deployment (recommended)

The backend is a standard Node/Express app and should be deployed to a Node-capable host. The most sensible option here is Render, because Render can deploy the backend directly from this repo and handle environment variables securely.

Render setup:

1. Create a new Web Service on Render.
2. Point it at this repository.
3. Use `main` as the branch.
4. Use these commands:
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && npm start`
5. Add environment variables in the Render dashboard:
   - `DATABASE_URL`
   - `AUTH0_DOMAIN`
   - `AUTH0_M2M_CLIENT_ID`
   - `AUTH0_M2M_CLIENT_SECRET`
   - `HUGGINGFACE_API_KEY`
   - `HUGGINGFACE_MODEL` (optional, default: `Quen2.5-7B-Instruct`)
6. Optionally, use the `render.yaml` file in the repo root to define the service configuration.

### Frontend deployment

For the frontend deployed to Vercel, set:

- `VITE_API_BASE_URL=https://<your-backend-url>`

This makes the deployed React app call the backend service instead of relying on local proxying.

### Local development

- Run backend: `cd backend && npm install && npm run dev`
- Run client: `cd client && npm install && npm run dev`

The frontend development server proxies `/api` requests to `http://localhost:3001`.

Make sure the backend has a valid `HUGGINGFACE_API_KEY` and a supported model in `HUGGINGFACE_MODEL`. The default `Qwen2.5-7BInstruct` model may not work for every HF account or plan, so swap it to another public text-generation model if you see AI service errors.

### Backend environment example

A sample backend environment file is available at `backend/.env.example`. Copy it to `backend/.env` locally and fill in your Neon and Auth0 values.
