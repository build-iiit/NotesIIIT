# Notes Platform 📚

A modern, full-featured notes sharing platform built with the T3 Stack (Next.js, tRPC, Prisma, Tailwind CSS). Upload, share, and collaborate on PDF notes with rich engagement features including bookmarks, page-level voting, comments, and gamification through leaderboards.

## 🌟 Features

### 📚 content & Organization
- **Smart PDF Viewing**: High-performance PDF viewer with lazy loading, zoom, and rotation.
- **Academic Structure**: Organize notes by **Courses**, **Branches**, and **Semesters**.
- **Personal Library**: "My Files" section with nested **Folder** support for organizing personal notes.
- **Annotations**: Draw, highlight, and add text notes directly onto PDF pages (Shared or Private).
- **Bookmarks**: Save important pages for quick access later.

### 🤝 Social & Collaboration
- **Friend System**: Send and accept friend requests to build your network.
- **Groups**: Create study groups, invite members, and share private notes within the group.
- **Comments**: Threaded discussions at both the Note level and specific Page level.
- **Voting**: Upvote/Downvote specific pages to find the most valuable content.
- **Leaderboards**: Real-time rankings for Top Notes and Top Contributors.

### 🛡️ Admin & Security
- **Role-Based Access**: Granular permissions for USER and ADMIN roles.
- **Dashboard**: Comprehensive admin panel to manage users, notes, and content moderation.
- **Secure Uploads**: S3-compatible storage (MinIO) with signed URLs and strict validation.

## 🛠️ Architecture & Tech Stack

The application follows the **T3 Stack** architecture, ensuring end-to-end type safety.

```mermaid
flowchart TD
    Client[Next.js Client] <-->|tRPC Typed API| Server[Next.js / API Routes]
    Server <-->|Prisma ORM| DB[(PostgreSQL)]
    Server <-->|AWS SDK| Storage[(MinIO / S3)]
    Client <-->|NextAuth| Auth[Auth Provider]
```

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Next.js (App Router) | v16 |
| **Language** | TypeScript | v5 |
| **Styling** | Tailwind CSS | v4 |
| **Database** | PostgreSQL | v15 |
| **ORM** | Prisma | v6 |
| **Storage** | MinIO (S3 Compatible) | - |
| **API** | tRPC | v11 |
| **Authentication** | NextAuth.js | v5 (Beta) |
| **State** | TanStack Query | v5 |
| **PDF Engine** | PDF.js | v5.4 |

## 🗄️ Database Schema

The database is normalized and handles complex relationships for social and content features.

```mermaid
erDiagram
    User ||--o{ Note : creates
    User ||--o{ Folder : owns
    User ||--o{ Comment : writes
    User ||--o{ Vote : casts
    User ||--o{ Group : "creates/joins"
    
    Note ||--o{ NoteVersion : has
    NoteVersion ||--o{ Page : contains
    
    Page ||--o{ Comment : "has page-level"
    Page ||--o{ Vote : "has votes"
    Page ||--o{ Annotation : "has drawings"
    
    Folder ||--o{ Folder : "parent/child"
    Folder ||--o{ Note : contains
    
    Course ||--o{ Note : "categorizes"
    
    Group ||--o{ User : members
    Group ||--o{ Note : "shared with"
```

### Key Models
- **Course**: Represents academic subjects (e.g., "Linear Algebra").
- **Folder**: Recursive structure for user organization.
- **NoteVersion**: accurate version control for PDF files.
- **Annotation**: Stores JSON data for canvas drawings (strokes, highlighters).
- **Group**: Manages study groups and shared permissions.

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **Docker** & Docker Compose
- **npm** or **yarn**

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd NotesIIIT
npm install
```

### 2. Environment Setup
Create a `.env` file in the root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/notes_db"

# Auth
NEXTAUTH_SECRET="super-secure-secret-generated-by-openssl"
NEXTAUTH_URL="http://localhost:3000"

# Storage (MinIO Defaults)
S3_REGION="us-east-1"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_NAME="notes-bucket"
```

### 3. Start Infrastructure
Run the backend services (Postgres & MinIO) in the background:
```bash
docker-compose up -d
```

### 4. Initialize Database
Push the schema to Postgres:
```bash
npx prisma db push
```

### 5. Run Application
```bash
npm run dev
```
Visit **http://localhost:3000**

## � Admin Setup

Accessing the admin dashboard requires the `ADMIN` role.

### Option 1: Using Prisma Studio (Recommended)
1. Run `npx prisma studio`
2. Open http://localhost:5555
3. Select the **User** model
4. Find your user record and change `role` to `ADMIN`
5. Save changes

### Option 2: Using SQL
```bash
docker exec -it notes-postgres psql -U user -d notes_db -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your-email@example.com';"
```

Once promoted, you will see the **Admin** shield icon in the navigation bar.

## �📁 Project Structure

```text
src/
├── app/
│   ├── admin/          # Admin dashboard
│   ├── courses/        # Course browsing & filtering
│   ├── my-files/       # Personal folder system
│   ├── notes/          # Note view & management
│   ├── social/         # Friends & Groups UI
│   ├── upload/         # File upload wizard
│   └── users/          # User profiles
├── components/
│   ├── admin/          # Admin-specific UI
│   ├── PdfViewer.tsx   # Complex PDF rendering logic
│   └── ...
├── server/
│   ├── api/root.ts     # Main tRPC router
│   └── api/routers/    # Domain-specific routers
│       ├── auth.ts
│       ├── courses.ts
│       ├── folders.ts  # Recursive folder logic
│       ├── notes.ts
│       └── social.ts   # Friend/Group logic
└── lib/
    ├── db.ts           # Prisma singleton
    └── s3.ts           # Storage utilities
```

## 🐛 Troubleshooting

### Common Issues

**1. "Failed to load PDF" or 404 on Images**
- **Cause**: MinIO bucket doesn't exist or is private.
- **Fix**: Run the helper service manually if it failed:
  ```bash
  docker-compose up createbuckets
  ```
  Or manually create the bucket `notes-bucket` in the MinIO console (`http://localhost:9001`) and set it to **Public**.

**2. "Prisma Client not initialized"**
- **Fix**: Run `npx prisma generate` after any schema changes.

**3. Annotations not saving**
- **Check**: Ensure you are logged in. Guest users cannot save annotations.

## 🤝 Contributing
1. Fork the repo
2. Create feature branch (`git checkout -b feature/cool-thing`)
3. Commit changes (`git commit -m 'Add cool thing'`)
4. Push to branch
5. Create Pull Request

---
Built with ❤️ using the [T3 Stack](https://create.t3.gg/)
