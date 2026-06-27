# Disaster Relief Coordination Platform

A comprehensive disaster relief coordination platform for emergency response teams. Built with professional-grade engineering for enterprise reliability.

## Features

- **Real-time emergency response coordination** via Socket.io
- **Advanced GIS mapping** with Leaflet and geo-spatial queries
- **Resource management** with allocation tracking
- **Volunteer and NGO management** with role-based access
- **Incident reporting** with zone-based disaster tracking
- **SOS emergency broadcast** system
- **Weather integration** via Open-Meteo (no API key needed)
- **CSV bulk import/export** for data migration
- **Bilingual support** (10 Indian languages including RTL Urdu)
- **PWA** with offline service worker caching
- **Dark/Light/Neon themes** with emergency mode
- **Enterprise-grade security** (CSP, rate limiting, CSRF, XSS sanitization)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Framer Motion, Recharts, Leaflet |
| Backend | Express, Mongoose, JWT, Socket.io |
| Database | MongoDB (with 2dsphere geospatial indexes) |
| Validation | Joi schemas |
| i18n | i18next with lazy-loaded locales |
| PWA | Custom service worker with cache strategies |
| DevOps | Docker, GitHub Actions, Render |

## Quick Start

```bash
# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Start MongoDB (Docker)
docker compose up -d mongodb

# Start dev servers
npm run dev
```

## Project Structure

```
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── context/     # React context providers
│   │   ├── api/         # API client
│   │   ├── i18n/        # Internationalization
│   │   ├── styles/      # CSS modules
│   │   └── utils/       # Utility functions
│   ├── e2e/             # Playwright tests
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── models/      # Mongoose models
│   │   ├── middleware/   # Express middleware
│   │   ├── config/      # Configuration
│   │   └── utils/       # Utilities
│   ├── __tests__/       # Integration tests
│   └── uploads/         # File uploads
├── docker-compose.yml   # Docker orchestration
├── render.yaml          # Render deployment
└── .env.example         # Environment template
```

## Deployment

The platform is configured for deployment on Render:

1. Copy `.env.example` to `.env` and fill in your values
2. Set `JWT_SECRET` to a secure random string (min 32 chars)
3. Deploy via Render dashboard or GitHub Actions

```bash
# Build for production
cd client && npm run build && cd ..
# Start production server
NODE_ENV=production node server/src/index.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret (32+ chars) |
| PORT | No | Server port (default: 5001) |
| CLIENT_URL | No | Frontend URL for CORS |
| ADMIN_EMAIL | No | Admin seed email |
| ADMIN_PASSWORD | No | Admin seed password |
| NODE_ENV | No | Environment (development/production) |

## Testing

```bash
# Run all tests
npm test

# Server tests
cd server && npm test

# Client tests
cd client && npm test

# E2E tests
cd client && npx playwright test
```

## License

Government of India Initiative
