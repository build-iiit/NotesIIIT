# Notes Platform

A modern notes sharing platform built with the T3 Stack (Next.js, tRPC, Prisma, Tailwind CSS) featuring PDF storage via MinIO (S3-compatible).

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (via Prisma)
- **Storage:** MinIO (S3-compatible object storage)
- **API:** tRPC
- **Auth:** NextAuth.js

## Prerequisites

- Node.js 18+
- Docker & Docker Compose

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/notes_db"

# NextAuth
# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# S3 (MinIO)
# These defaults match the docker-compose setup
S3_REGION="us-east-1"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_NAME="notes-bucket"
```

### 3. Start Backend Services

Start PostgreSQL and MinIO containers:

```bash
docker-compose up -d
```

Services will be available at:
- **MinIO Console:** [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin`)
- **MinIO API:** [http://localhost:9000](http://localhost:9000)
- **Postgres:** `localhost:5432`

### 4. Initialize Database

Push the schema to the database:

```bash
npx prisma db push
```

### 5. Run Application

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Development Commands

- `npm run dev`: Start dev server
- `npx prisma studio`: Open Prisma Studio UI to inspect database
- `npm run lint`: Run linting
