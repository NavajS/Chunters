# Spring-2026-SWE-Project
Chunters is an anonymous thread-based platform that encourages students towards peer support by providing a moderated safe space.

## Team - The Yappers
- **Scrum Master:** Seamus McCollum
- **Lead Front-end:** Max Jiang
- **Lead Back-end:** Tej Allada
- **Project Owner:** Navaj Sivakumar

## Tech Stack
- **PostgreSQL:** Database
- **Express.js:** Backend API
- **React.js:** Frontend
- **Node.js:** Runtime Environment

## Getting Started with Chunters

### Prerequisites
- PostgreSQL (v14+)
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
6. Open `.env` and replace fillers with your own credentials
7. Create the PostgreSQL database:
    `createdb chunters_chat`
8. Initialize database tables:
    `npm run db:init`
9. Run Chunters
    `npm run dev`

## Scripts
1. `npm run dev`: Concurrently runs the server and client side
2. `npm run server`: Runs the back-end
3. `npm run client`: Runs the front-end
4. `npm run db:init`: Initalizes database tables