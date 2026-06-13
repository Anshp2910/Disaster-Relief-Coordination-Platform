# Disaster Relief Cooperation Platform (MERN) - TODO

## Step 1: Scaffold project structure
- Create root `package.json` with scripts (client/server/dev via concurrently)
- Create `server/` and `client/` directories
- Add `README.md` with setup instructions

## Step 2: Backend (Express + Mongoose + JWT)
- Create `server/package.json`
- Implement server entry (`src/index.js`, `src/app.js`)
- Add env loader (`src/config/env.js`)
- Add Mongoose models: `User`, `Request`
- Add middleware: `auth` (JWT), role/authorization helpers
- Add routes: `auth` (register/login/me), `requests` (CRUD with auth rules)

## Step 3: Frontend (React + Vite)
- Create `client/package.json`
- Implement Vite app entry (`index.html`, `vite.config.js`, `src/main.jsx`)
- Create routing + pages:
  - Login, Register
  - Dashboard (list requests)
  - Create Request form (includes location fields)

## Step 4: Environment configuration
- Add `.env.example` at root with `MONGODB_URI`, `JWT_SECRET`, `PORT`, `CLIENT_URL`

## Step 5: Dependency installation + run
- Install dependencies in root/client/server as needed
- Run `npm run dev`
- Smoke test:
  - Register/Login
  - Create request with location (lat/lng + name)
  - List requests
  - Update/Delete only by owner

## Step 6: Quality checks
- Basic lint/test (if configured)
- Ensure CORS and JWT auth work end-to-end
