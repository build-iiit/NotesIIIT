# NotesIIIT Platform 📚

**Team hack0d3** presents a modern, full-featured notes sharing platform built with the T3 Stack.

> 🚧 **Hackathon Development Note**:
> We created a very basic authentication system 5 days before the hackathon started.
> **The entire rest of the application (PDF engine, Social features, Admin dashboard, UI/UX, etc.) was built during the hackathon.**
>
> 🤖 **Built with help from Antigravity**

---

## ❓ The Problem
In the current academic ecosystem, students face a significant challenge in accessing and sharing quality study materials.
- **Fragmentation**: Notes are scattered across WhatsApp groups, Google Drive links, and personal folders.
- **Lack of Collaboration**: Static PDFs don't allow for discussion, questions, or collaborative highlighting.
- **Quality Control**: It's hard to distinguish high-quality notes from poor ones without a rating or review system.

## 💡 Our Solution
We developed a centralized **Collaborative Learning Hub** that transforms how students interact with study materials.
- **Interactive Viewing**: Not just reading—students can annotate, highlight, and comment on specific pages.
- **Community Driven**: A leaderboard and voting system incentivizes uploading high-quality content.
- **Socially Connected**: Friends and Groups features allow for private sharing and collaborative study sessions.
- **Structured Knowledge**: An organized hierarchy (Branch > Semester > Course) makes finding resources effortless.

## 🛠️ Tech Stack & Architecture

We utilized the **T3 Stack** for end-to-end type safety and rapid development.

| Category | Technology | Usage |
|----------|-----------|-------|
| **Framework** | **Next.js 16** (App Router) | Full-stack React framework |
| **Language** | **TypeScript** | Strict type safety across the entire app |
| **Styling** | **Tailwind CSS v4** | Modern, utility-first styling with Glassmorphism |
| **Database** | **PostgreSQL** | Relational data for users, notes, and social graph |
| **ORM** | **Prisma** | Type-safe database access |
| **Storage** | **MinIO** (S3 Compatible) | Secure, self-hostable object storage for PDFs |
| **API** | **tRPC** | End-to-end typesafe APIs without schemas |
| **Auth** | **NextAuth.js v5** | Secure authentication sessions |
| **PDF Engine** | **PDF.js** | Client-side PDF rendering and interaction |

### Architecture Diagram
```mermaid
flowchart TD
    Client[Next.js Client] <-->|tRPC Typed API| Server[Next.js / API Routes]
    Server <-->|Prisma ORM| DB[(PostgreSQL)]
    Server <-->|AWS SDK| Storage[(MinIO / S3)]
    Client <-->|NextAuth| Auth[Auth Provider]
```

## 🌟 Key Features

### 🎨 Premium User Experience
- **Glassmorphic Design**: A visually stunning UI with background blurs, gradients, and a "premium" feel.
- **Dark Mode**: Fully supported system-aware dark/light themes.
- **Responsive**: Mobile-first design for studying on the go.

### 📚 Advanced Content Management
- **Smart PDF Viewer**: Custom-built viewer supporting zoom, rotation, and lazy loading.
- **Annotations**: Draw, highlight, and add text directly on note pages.
- **Granular Organization**: File hierarchy supports Folders, Courses, and Semesters.
- **Page-Level Interaction**: Comment on and upvote specific pages, not just the whole document.

### 🤝 Social & Gamification
- **Friend System**: Send requests and follow peers.
- **Groups**: Create private study groups for focused collaboration.
- **Leaderboards**: Compete for "Top Contributor" status based on uploads and likes.

### 🛡️ Admin & Security
- **Role-Based Access Control (RBAC)**: Distinct USER and ADMIN roles.
- **Admin Dashboard**: Moderation tools for users and content.
- **Secure Uploads**: Presigned URLs ensure secure file transfer to storage.

## 🚀 Instructions to Run

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### 1. Clone & Install
```bash
git clone https://github.com/Entropy-rgb/NotesIIIT.git
cd NotesIIIT
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/notes_db"

# Auth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Storage (MinIO Defaults for Docker)
S3_REGION="us-east-1"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET_NAME="notes-bucket"
```

### 3. Start Infrastructure
Run the database and storage services:
```bash
docker-compose up -d
```

### 4. Initialize Database
```bash
npx prisma db push
```
*Note: This creates the tables in your local Postgres instance.*

### 5. Start the App
```bash
npm run dev
```
Visit **http://localhost:3000** to see the app in action!

## 🛡️ Admin Setup

Accessing the admin dashboard requires the `ADMIN` role. **By default, all new users are assigned the `USER` role.** You must manually promote the first admin using one of the methods below.

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

## 👥 Team hack0d3

We are a team of passionate developers building cool things.

1. **Somesh Kamad**
2. **Arjun Tikoo**
3. **Parth Nyati**
4. **Swayam Hadape**

---
Built with ❤️ during the hackathon.
