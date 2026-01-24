# Notes Platform

A modern notes sharing platform built with the T3 Stack (Next.js, tRPC, Prisma, Tailwind CSS) featuring PDF storage via MinIO (S3-compatible), with comprehensive admin tools and engagement features.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL (via Prisma)
- **Storage:** MinIO (S3-compatible object storage)
- **API:** tRPC
- **Auth:** NextAuth.js

## Features

### Core Functionality
- 📄 **PDF Upload & Viewing** - Upload and view PDF notes with page navigation
- 👥 **User Profiles** - Author profiles with statistics and note collections
- 💬 **Comments System** - Page-level comments with threading support
- 👍 **Voting System** - Upvote/downvote notes at the page level
- 👁️ **View Tracking** - Smart view counting with 24-hour cooldown
- 🏆 **Leaderboards** - Top notes by upvotes and top contributors

### User Experience
- ⌨️ **Keyboard Navigation** - Use arrow keys (← →) to navigate PDF pages
- 🎯 **Focus Mode** - Distraction-free full-screen PDF viewer
- 🌓 **Dark Mode** - System-aware theme with manual toggle
- 📱 **Responsive Design** - Works seamlessly on all devices

### Admin Features
- 👑 **Admin Dashboard** - Comprehensive platform management
- 📊 **Analytics** - Platform-wide statistics and trends
- 👤 **User Management** - Promote/demote roles, manage users
- 📝 **Content Moderation** - View all notes (including private), delete inappropriate content
- 🔒 **Role-Based Access** - Secure admin-only procedures

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

## Admin Setup

To access admin features, you need to promote a user to ADMIN role. There are two methods:

### Method 1: Using Prisma Studio (Recommended)

1. **Open Prisma Studio:**
   ```bash
   npx prisma studio
   ```

2. **Navigate to the User model** in the Prisma Studio UI (opens at http://localhost:5555)

3. **Find your user** by email or name

4. **Edit the user record:**
   - Click on the user row
   - Change the `role` field from `USER` to `ADMIN`
   - Save changes

5. **Refresh your app** - You should now see the "Admin" link in the navbar

### Method 2: Using SQL

1. **Connect to your database:**
   ```bash
   # Using psql
   docker exec -it notes-db psql -U user -d notes_db
   
   # Or using any PostgreSQL client
   ```

2. **Run the update query:**
   ```sql
   UPDATE "User" 
   SET role = 'ADMIN' 
   WHERE email = 'your-email@example.com';
   ```

3. **Verify the change:**
   ```sql
   SELECT id, name, email, role FROM "User" WHERE email = 'your-email@example.com';
   ```

4. **Exit and refresh** your app

### Accessing Admin Dashboard

Once promoted to admin:
1. Log in to the application
2. Look for the **Admin** link in the navbar (with shield icon 🛡️)
3. Click to access the admin dashboard at `/admin`

### Admin Capabilities

- **Overview Tab:** View platform statistics and recent activity
- **Users Tab:** Manage users, promote/demote roles, delete accounts
- **Notes Tab:** View all notes (including private), moderate content

## Development Commands

- `npm run dev`: Start dev server
- `npx prisma studio`: Open Prisma Studio UI to inspect/edit database
- `npx prisma db push`: Push schema changes to database
- `npm run lint`: Run linting

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard
│   ├── notes/[id]/        # Note viewing page
│   ├── upload/            # Upload page
│   └── users/[id]/        # User profile page
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── PdfViewer.tsx     # PDF viewer with keyboard navigation
│   ├── FullPageNoteViewer.tsx  # Focus mode viewer
│   └── ...
├── server/
│   └── api/
│       └── routers/      # tRPC API routes
│           ├── admin.ts  # Admin endpoints
│           ├── notes.ts  # Notes CRUD
│           ├── votes.ts  # Vote system
│           └── ...
└── lib/                  # Utilities (S3, Prisma)
```

## Features Deep Dive

### Keyboard Navigation
- Use **← (Left Arrow)** to go to previous page
- Use **→ (Right Arrow)** to go to next page
- Works in both normal and focus mode

### View Tracking
- Automatically tracks when users view notes
- Prevents duplicate views within 24 hours
- Authors don't count views on their own notes
- Displayed with 👁️ icon on note pages

### Voting System
- Page-level voting (can vote on each page separately)
- Vote score aggregated to note level
- Used for leaderboard rankings
- Toggle between upvote/downvote or remove vote

### Leaderboard
- **Top Notes**: Sorted by total upvotes (voteScore)
- **Top Contributors**: Ranked by total karma from all their notes
- Updates in real-time as users interact

## Security

- Server-side authentication with NextAuth.js
- Role-based authorization (USER, ADMIN)
- Admin-only tRPC procedures
- Client and server-side route protection
- Author-only note editing
- Admin override for content moderation

## Troubleshooting

### "Failed to load PDF"
- Ensure MinIO container is running: `docker-compose ps`
- Check MinIO console at http://localhost:9001
- Verify S3 credentials in `.env` match docker-compose

### "Database connection error"
- Ensure PostgreSQL container is running
- Check `DATABASE_URL` in `.env`
- Run `npx prisma db push` to sync schema

### Admin link not showing
- Verify your user role is set to `ADMIN` in database
- Clear browser cache and refresh
- Check browser console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
