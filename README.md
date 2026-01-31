# NotesIIIT Platform

NotesIIIT is a modern, full-featured notes sharing platform built with the T3 Stack. It serves as a centralized collaborative learning hub for students to access, share, and interact with study materials.

## About

This platform addresses the fragmentation of study materials by providing a unified space for high-quality notes. It enables interactive viewing, collaborative features like annotations and comments, and a structured hierarchy for easy resource navigation.

## Key Features

- **Premium User Experience**: Glassmorphic design, dark/light mode support, and mobile-first responsiveness.
- **AI Study Assistant**: Chat with documents and context-aware help powered by Google Gemini.
- **Advanced Content Management**: Custom PDF viewer, annotations, granular organization (Folders, Courses, Semesters), and rich text editing.
- **Social & Community**: Friend system, study groups, and leaderboards.
- **Admin & Security**: Role-Based Access Control (RBAC) and secure file uploads.

## Technology Stack

| Category | Technology | Usage |
|----------|-----------|-------|
| Framework | Next.js 16 (App Router) | Full-stack React framework |
| Language | TypeScript | Strict type safety |
| Styling | Tailwind CSS v4 | Utility-first styling |
| Database | PostgreSQL | Relational data |
| ORM | Prisma | Type-safe database access |
| Storage | MinIO (S3 Compatible) | Secure object storage |
| API | tRPC | End-to-end typesafe APIs |
| Auth | NextAuth.js v5 | Authentication sessions |
| PDF Engine | PDF.js | Client-side PDF rendering |
| AI Engine | Google Gemini | Multimodal AI |
| Editor | BlockNote | Rich text editing |
| Math Engine | KaTeX | Math rendering |

### Architecture Diagram

```mermaid
flowchart TD
    Client[Next.js Client] <-->|tRPC Typed API| Server[Next.js / API Routes]
    Server <-->|Prisma ORM| DB[(PostgreSQL)]
    Server <-->|AWS SDK| Storage[(MinIO / S3)]
    Client <-->|NextAuth| Auth[Auth Provider]
```

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- Node.js 18+
- Docker & Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Entropy-rgb/NotesIIIT.git
   cd NotesIIIT
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/notes_db"

   # Auth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-here"
   AUTH_SECRET="your-secret-here"
   AUTH_TRUST_HOST=true

   # OAuth Providers (GitHub)
   AUTH_GITHUB_ID="your-github-client-id"
   AUTH_GITHUB_SECRET="your-github-client-secret"

   # Storage (MinIO)
   S3_ENDPOINT="http://localhost:9000"
   S3_ACCESS_KEY="minioadmin"
   S3_SECRET_KEY="minioadmin"
   S3_BUCKET_NAME="notes-bucket"
   S3_REGION="us-east-1"

   # AI Configuration
   GOOGLE_GEMINI_API_KEY="your-gemini-server-key"
   NEXT_PUBLIC_GOOGLE_API_KEY="your-gemini-public-key"
   NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"
   ```

3. **Start Infrastructure**
   Run the database and storage services:
   ```bash
   docker-compose up -d
   ```

4. **Initialize Database**
   ```bash
   npx prisma db push
   ```
   *Note: This creates the tables in your local Postgres instance.*

5. **Start the App**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to access the application.

## Admin Setup

Accessing the admin dashboard requires the `ADMIN` role. New users are assigned the `USER` role by default.

### Promote to Admin

**Option 1: Using Prisma Studio (Recommended)**

1. Run `npx prisma studio`
2. Open `http://localhost:5555`
3. Select the **User** model
4. Find your user record and change `role` to `ADMIN`
5. Save changes

**Option 2: Using SQL**

```bash
docker exec -it notes-postgres psql -U user -d notes_db -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your-email@example.com';"
```

Once promoted, the Admin shield icon will appear in the navigation bar.

## Maintainers

- **Somesh Kamad**
- **Arjun Tikoo**
- **Parth Nyati**
- **Swayam Hadape**
