# Notes Platform 📚

A modern, full-featured notes sharing platform built with the T3 Stack (Next.js, tRPC, Prisma, Tailwind CSS). Upload, share, and collaborate on PDF notes with rich engagement features including bookmarks, page-level voting, comments, and gamification through leaderboards.

## 🌟 Features

### Core Functionality
- 📄 **PDF Upload & Viewing** - Upload PDFs with automated version control and page extraction
- 🔖 **Bookmarks** - Save favorite pages with quick navigation (NEW!)
- 👥 **User Profiles** - Rich author profiles with statistics and note collections
- 💬 **Comments System** - Page-level and note-level comments with threading support
- 👍 **Voting System** - Page-level upvote/downvote with aggregated scoring
- 👁️ **View Tracking** - Smart view counting with 24-hour cooldown per user
- 🏆 **Leaderboards** - Competitive rankings for top notes and contributors

### User Experience
- ⌨️ **Keyboard Navigation** 
  - `←` `→` Arrow keys for page navigation
  - `B` key to toggle bookmarks
- 🎯 **Focus Mode** - Distraction-free full-screen PDF viewer
- 🌓 **Dark Mode** - System-aware theme with manual toggle
- 📱 **Responsive Design** - Mobile-first design that works on all devices
- 🔍 **Direct Page Jump** - Jump to any page by number

### Admin Features
- 👑 **Admin Dashboard** - Comprehensive platform management interface
- 📊 **Analytics** - Platform-wide statistics, trends, and activity metrics
- 👤 **User Management** - Promote/demote roles, search and manage users
- 📝 **Content Moderation** - View all notes (including private), delete content
- 🔒 **Role-Based Access** - Secure admin-only tRPC procedures

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Database** | PostgreSQL 15 |
| **ORM** | Prisma 6 |
| **Storage** | MinIO (S3-compatible) |
| **API** | tRPC 11 |
| **Authentication** | NextAuth.js v5 |
| **State Management** | TanStack Query (React Query) |
| **PDF Rendering** | PDF.js 5.4 |
| **Icons** | Lucide React |

## 📋 Prerequisites

- **Node.js** 18 or higher
- **Docker** and **Docker Compose** (for backend services)
- **npm** or **yarn** package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository (if you haven't already)
git clone <your-repo-url>
cd NotesIIIT

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following configuration:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/notes_db"

# NextAuth Configuration
# Generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# S3 Storage (MinIO) Configuration
# These defaults match the docker-compose setup
S3_REGION="us-east-1"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_NAME="notes-bucket"

# Optional: Auth Providers (Google, GitHub, etc.)
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

> **Important:** Never commit the `.env` file to version control. Use `.env.example` for templates.

### 3. Start Backend Services

Start PostgreSQL and MinIO using Docker Compose:

```bash
docker-compose up -d
```

**Services Overview:**

| Service | Port | Access | Credentials |
|---------|------|--------|-------------|
| **MinIO Console** | 9001 | http://localhost:9001 | `minioadmin` / `minioadmin` |
| **MinIO API** | 9000 | http://localhost:9000 | - |
| **PostgreSQL** | 5432 | localhost:5432 | `user` / `password` |

**Verify services are running:**
```bash
docker-compose ps
```

### 4. Initialize Database

Push the Prisma schema to your database:

```bash
npx prisma db push
```

This creates all necessary tables and relations defined in `prisma/schema.prisma`.

### 5. Run the Application

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at **http://localhost:3000**

## 👑 Admin Setup

To access admin features, you need to promote a user to the ADMIN role.

### Method 1: Using Prisma Studio (Recommended)

1. **Start Prisma Studio:**
   ```bash
   npx prisma studio
   ```

2. **Open the UI** at http://localhost:5555

3. **Navigate to the User model**

4. **Find your user** by email or name

5. **Edit the user:**
   - Click on the user row
   - Change `role` from `USER` to `ADMIN`
   - Click "Save 1 change"

6. **Refresh your app** - The "Admin" link with a shield icon 🛡️ will appear in the navbar

### Method 2: Direct SQL

```bash
# Connect to PostgreSQL
docker exec -it notes-postgres psql -U user -d notes_db

# Update user role
UPDATE "User" 
SET role = 'ADMIN' 
WHERE email = 'your-email@example.com';

# Verify the change
SELECT id, name, email, role FROM "User" WHERE email = 'your-email@example.com';

# Exit
\q
```

### Admin Dashboard Features

Once you have admin access, navigate to `/admin` to access:

- **Overview Tab:** Platform statistics, recent activity, growth metrics
- **Users Tab:** User management with search, role management, account deletion
- **Notes Tab:** Content moderation, view private notes, bulk actions

## 📁 Project Structure

```
NotesIIIT/
├── prisma/
│   └── schema.prisma          # Database schema with all models
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── admin/            # Admin dashboard pages
│   │   ├── bookmarks/        # Bookmarks page (NEW!)
│   │   ├── leaderboards/     # Leaderboards page
│   │   ├── notes/[id]/       # Individual note viewer
│   │   ├── upload/           # Note upload interface
│   │   ├── users/[id]/       # User profile pages
│   │   ├── layout.tsx        # Root layout with providers
│   │   ├── page.tsx          # Homepage with note feed
│   │   └── _trpc/            # tRPC client setup
│   ├── components/           # React components
│   │   ├── admin/           # Admin-specific components
│   │   ├── FullPageNoteViewer.tsx  # Focus mode viewer
│   │   ├── Navbar.tsx       # Navigation with auth
│   │   ├── PdfViewer.tsx    # Core PDF viewer with bookmarks
│   │   ├── ThemeProvider.tsx
│   │   └── ui/              # Reusable UI components
│   ├── lib/                 # Shared utilities
│   │   ├── db.ts           # Prisma client singleton
│   │   └── s3.ts           # S3/MinIO utilities
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/    # tRPC API endpoints
│   │   │   │   ├── admin.ts      # Admin operations
│   │   │   │   ├── auth.ts       # Authentication
│   │   │   │   ├── bookmarks.ts  # Bookmark operations (NEW!)
│   │   │   │   ├── comments.ts   # Comment CRUD
│   │   │   │   ├── leaderboards.ts
│   │   │   │   ├── notes.ts      # Note CRUD & upload
│   │   │   │   ├── versions.ts   # Version management
│   │   │   │   └── votes.ts      # Voting system
│   │   │   ├── root.ts     # Root tRPC router
│   │   │   └── trpc.ts     # tRPC configuration & middleware
│   │   ├── auth.ts         # NextAuth.js configuration
│   │   └── db.ts           # Database utilities
│   └── styles/
│       └── globals.css      # Global styles
├── docker-compose.yml       # Backend services orchestration
├── next.config.ts          # Next.js configuration
├── package.json
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json

```

## 🗄️ Database Schema

The application uses a comprehensive PostgreSQL schema managed by Prisma:

### Core Models

- **User** - Authentication, profiles, roles (USER, ADMIN)
- **Note** - Main content with versioning support
- **NoteVersion** - PDF versions with S3 storage keys
- **Page** - Individual pages extracted from PDFs
- **Bookmark** - User bookmarks for specific pages 🆕
- **Vote** - Page-level upvotes/downvotes
- **Comment** - Page and note-level comments with threading
- **View** - View tracking with user association

### Key Relationships

```
User (1) ──── (N) Note ──── (N) NoteVersion ──── (N) Page
  │                 │              │                 │
  └─── (N) Bookmark ┴─────────────┘                 │
  │                                                  │
  └─── (N) Vote ──────────────────────────────────┘
  │                                                  │
  └─── (N) Comment ─────────────────────────────────┘
  │
  └─── (N) View ──────────────────┘
```

## 🎮 User Guide

### Uploading Notes

1. Navigate to **Upload** page (button in navbar)
2. Fill in note details:
   - **Title** (required)
   - **Description** (optional)
   - **Privacy** (Public/Private)
3. Select a PDF file
4. Click **Upload**
5. System automatically:
   - Uploads PDF to MinIO
   - Creates version entry
   - Extracts pages into database

### Viewing PDFs

**Navigation:**
- Click **Previous/Next** buttons
- Use **← →** arrow keys
- Enter page number in **Page Jump** input and press Enter or click Go

**Bookmarks:**
- Click the **star icon** or press **B** to bookmark the current page
- View all bookmarks in the **Bookmarks** section below the viewer
- Click any bookmark to jump to that page
- Access all your bookmarks from the **Bookmarks** page in navbar

**Focus Mode:**
- Click the **fullscreen icon** for distraction-free viewing
- All keyboard shortcuts work in focus mode
- Press **Esc** to exit

**Engagement:**
- **Vote** on individual pages with 👍/👎 buttons
- **Comment** on specific pages or the entire note
- **Share** note URL with others

### Leaderboards

- **Top Notes:** Highest-voted notes across the platform
- **Top Contributors:** Users with the highest total karma
- Updated in real-time as votes are cast

## 🔧 API Documentation

The application uses tRPC for type-safe API routes. All endpoints are defined in `src/server/api/routers/`.

### Available Routers

| Router | Endpoints | Description |
|--------|-----------|-------------|
| **auth** | `getSession` | User session management |
| **notes** | `getAll`, `getById`, `create`, `update`, `delete` | Note CRUD operations |
| **bookmarks** 🆕 | `toggle`, `getForNote`, `getAll` | Bookmark management |
| **votes** | `cast`, `getForPage`, `getUserVote` | Voting system |
| **comments** | `create`, `getForPage`, `getForNote` | Comment operations |
| **leaderboards** | `getTopNotes`, `getTopContributors` | Ranking queries |
| **admin** | `getStats`, `getAllUsers`, `updateUserRole`, `deleteUser`, `getAllNotes`, `deleteNote` | Admin operations |

### Example Usage

```typescript
// In a React component
import { api } from "@/app/_trpc/client";

function MyComponent() {
  // Fetch all notes
  const { data: notes } = api.notes.getAll.useQuery();
  
  // Create a bookmark
  const toggleBookmark = api.bookmarks.toggle.useMutation();
  
  const handleBookmark = () => {
    toggleBookmark.mutate({
      noteId: "note-id",
      pageNumber: 5
    });
  };
}
```

## 🔐 Security Features

- **Authentication:** NextAuth.js with session-based auth
- **Authorization:** Role-based access control (RBAC)
- **Protected Routes:** Server-side session validation
- **Admin Procedures:** Middleware-enforced admin checks
- **Database:** Row-level security via Prisma relations
- **File Upload:** Validated file types and size limits
- **XSS Protection:** React's built-in escaping
- **CORS:** Configured for MinIO public access

## 🧪 Development Commands

```bash
# Development
npm run dev              # Start dev server

# Database
npx prisma studio        # Open database GUI
npx prisma db push       # Push schema changes
npx prisma generate      # Regenerate Prisma Client
npx prisma migrate dev   # Create and apply migrations

# Code Quality
npm run lint             # Run ESLint
npm run build            # Production build
npm run start            # Start production server

# Docker
docker-compose up -d     # Start services in background
docker-compose down      # Stop services
docker-compose logs -f   # View logs
```

## 🐛 Troubleshooting

### "Failed to load PDF"

**Causes:**
- MinIO container not running
- Incorrect S3 credentials
- Bucket not created

**Solutions:**
```bash
# Check if MinIO is running
docker-compose ps

# Restart MinIO
docker-compose restart minio

# Recreate bucket
docker-compose up createbuckets

# Verify .env S3 settings match docker-compose.yml
```

### "Database connection error"

**Solutions:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Verify DATABASE_URL in .env
# Should match: postgresql://user:password@localhost:5432/notes_db

# Reset database
docker-compose down -v
docker-compose up -d
npx prisma db push
```

### Admin link not showing

**Solutions:**
1. Verify user role is `ADMIN` in database (use Prisma Studio)
2. Clear browser cache and cookies
3. Log out and log back in
4. Check browser console for errors

### PDF upload failing

**Common Issues:**
- File size too large (check Next.js config)
- Invalid PDF format
- MinIO bucket not accessible

**Debug Steps:**
```bash
# Check MinIO bucket exists
docker exec -it notes-minio mc ls myminio/

# Check bucket policy
docker exec -it notes-minio mc policy get myminio/notes-bucket
```

### TypeScript Errors

```bash
# Regenerate Prisma types
npx prisma generate

# Clear Next.js cache
rm -rf .next
npm run dev
```

## 🚢 Deployment

### Environment Variables for Production

Ensure you set the following in your production environment:

```env
DATABASE_URL="<production-postgresql-url>"
NEXTAUTH_SECRET="<strong-random-secret>"
NEXTAUTH_URL="https://your-domain.com"
S3_ENDPOINT="<production-s3-endpoint>"
S3_ACCESS_KEY="<production-key>"
S3_SECRET_KEY="<production-secret>"
```

### Build for Production

```bash
npm run build
npm run start
```

### Recommended Hosting

- **Next.js App:** Vercel, Railway, or Docker
- **Database:** Supabase, Railway, or managed PostgreSQL
- **Storage:** AWS S3, DigitalOcean Spaces, or self-hosted MinIO

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linting and tests (`npm run lint`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **T3 Stack** for the excellent foundation
- **Vercel** for Next.js
- **Prisma** for the amazing ORM
- **MinIO** for S3-compatible storage
- All contributors and users of this platform

---

**Built with ❤️ using the T3 Stack**
