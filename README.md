# Disaster Relief Cooperation Platform (MERN)

MVP scope: **Auth + Disaster Relief Requests + Locations (lat/lng)**.  
Chat/maps are intentionally skipped for MVP.

## Prerequisites
- Node.js 18+ recommended
- MongoDB (local or hosted)
- npm

## Environment Variables

Create a `.env` file at the project root:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=change_me_to_a_long_random_secret
PORT=5000
CLIENT_URL=http://localhost:5173
```

## Google Maps (for Create Request page)

Add your Google Maps JavaScript API key to the **client** environment (Vite):

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_javascript_api_key
```

(Example file: `.env.example` will be added next.)

## Install dependencies

From project root:
- Root dev helper uses `concurrently`
- Install server deps:
  
```bash
  npm --prefix server install
  
```
- Install client deps:
  
```bash
  npm --prefix client install
  ```

## Run (development)
```bash
npm run dev
```

- Server: `http://localhost:5000`
- Client: `http://localhost:5173`

## What’s included (MVP)
- Register/Login (JWT)
- Roles: `volunteer` / `ngo`
- Create/List/Update/Delete disaster relief requests with location fields
- Authorization: Update/Delete allowed for request owner
