# Spring-2026-SWE-Project
Chunters is an anonymous thread-based platform that encourages students towards peer support by providing a moderated safe space.

## Team - The Yappers
- **Scrum Master:** Seamus McCollum
- **Lead Front-end:** Max Jiang
- **Lead Back-end:** Tej Allada
- **Project Owner:** Navaj Sivakumar

## Tech Stack
- **Supabase (PostgreSQL):** Hosted database
- **Express.js:** Backend API
- **React.js:** Frontend
- **Node.js:** Runtime Environment

## Getting Started with Chunters

### Prerequisites
- A [Supabase](https://supabase.com) account and project
- Node.js (v18+)
- npm

### Setup
1. Clone Chunters' repo: 
    `git clone https://github.com/NavajS/Chunters.git`
2. Enter project:
    `cd Chunters`
3. Install backend dependencies:
    `npm install`
4. Install frontend dependencies:
    `cd client && npm install && cd ..`
5. Create environment file:
    `cp .env.example .env`
6. Open `.env` and set `DATABASE_URL` to your Supabase session pooler connection string
7. Initialize database tables:
    `npm run db:init`
8. Seed the database with demo threads:
    `npm run db:seed`
9. Seed admin and moderator roles:
    `npm run db:seed-roles`
10. Run Chunters
    `npm run dev`

## Scripts
1. `npm run dev`: Concurrently runs the server and client side
2. `npm run server`: Runs the back-end
3. `npm run client`: Runs the front-end
4. `npm run db:init`: Initalizes database tables
5. `npm run db:seed`: Seeds the database with demo threads
6. `npm run db:seed-roles`: Seeds admin and moderator roles