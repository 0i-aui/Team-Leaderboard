أكيد. ده README.md جاهز تحطه في GitHub، مكتوب بشكل professional وطبيعي من غير مبالغة:

# 🏆 Team Leaderboard

A modern, real-time leaderboard platform built for managing and tracking team performance, weekly points, rankings, zones, and activity history.

The project is designed as a lightweight public leaderboard with a clean Apple-inspired Liquid Glass interface and a mobile-first experience.

---

## ✨ Features

- 🏆 Team-based leaderboards
- 👥 Separate Team A and Team B leaderboards
- 📊 Independent ranking for each team
- 🟢 Safe Zone / 🔴 Red Zone classification
- 📈 Point and rank movement indicators
- 🕒 Activity & scoring history
- 🔔 Browser notifications
- 🔊 Sound effects
- 🌙 Dark / Light theme support
- 🌐 Arabic / English support
- 📱 Mobile-first responsive design
- ⚡ Real-time updates
- 🎨 Apple-inspired Liquid Glass UI
- 🔒 Supabase Row Level Security
- 🗄️ Database migrations managed through Supabase
- 🧩 Public read-only leaderboard interface

---

## 🏗️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide Icons

### Backend & Database

- Supabase
- PostgreSQL
- Supabase Realtime
- Supabase Storage

### Deployment

- Vercel
- GitHub

---

## 📋 Leaderboard Structure

The leaderboard is divided into two teams.

### Team A

10 members.

### Team B

9 members.

Each team has its own independent ranking.

Members are divided into:

| Rank | Zone |
|------|------|
| 1–5 | 🟢 Safe Zone |
| Remaining ranks | 🔴 Red Zone |

The ranking is calculated separately for each team.

---

## 📊 Scoring

The project uses a weekly scoring system.

All normal members receive their weekly points through the administration scoring system.

The scoring system is enforced at the database level rather than relying only on frontend validation.

The project is currently maintained as an experimental system, so the current scoring baseline may be reset while the platform is being developed.

---

## 👤 Roles

The platform supports several roles:

- `MEMBER`
- `SUPERVISOR`
- `LEADER`
- `MOD`
- `ADMIN`

Roles control how users are represented within the leaderboard and management system.

---

## 🌐 Internationalization

The interface supports:

- 🇬🇧 English
- 🇪🇬 Arabic

The language preference is persisted so users don't need to select their language every time.

Arabic layouts support RTL while English uses LTR.

---

## 🎨 Design

The interface follows a minimal Apple/macOS-inspired visual direction.

Main design principles:

- Liquid Glass surfaces
- Subtle transparency
- Soft borders
- Smooth transitions
- Minimal shadows
- Clear typography
- Responsive layouts
- Lightweight animations
- Mobile-first interaction

The goal is to keep the interface clean and functional rather than making it look like a typical gaming or generic SaaS dashboard.

---

## 🕒 Activity History

The History section provides a human-readable activity feed.

Activities can include:

- Point changes
- Previous → new score
- Point source
- Timestamp
- Team
- Rank movement

Technical database or RPC details are intentionally hidden from normal users.

---

## 🔔 Notifications

The application includes browser notification support for important leaderboard updates.

Notifications are designed around:

- User interaction
- Browser permission requirements
- Push subscriptions
- Service workers
- Secure server-side notification handling

Sensitive notification credentials are never intended to be exposed to the client.

---

## 🔊 Sound Effects

The application includes optional sound effects for selected interactions and leaderboard events.

Sound can be enabled or disabled from the interface.

---

## 🔐 Security

Security is an important part of the project architecture.

The application uses Supabase security features including:

- Row Level Security (RLS)
- Database-level access control
- Restricted database functions
- Server-side handling of sensitive credentials
- Controlled data exposure
- Secure scoring operations

Secrets such as service-role credentials and private VAPID keys must never be exposed in frontend code.

---

## 🗄️ Database

Supabase migrations are treated as the source of truth for the database schema.

Typical structure:

```text
supabase/
├── migrations/
│   ├── ...
│
└── seed.sql

The repository is designed so the database can be recreated consistently from the migration history.


---

🚀 Getting Started

1. Clone the repository

git clone https://github.com/0i-aui/Team-Leaderboard.git
cd Team-Leaderboard

2. Install dependencies

npm install

3. Configure environment variables

Create a local environment file:

.env.local

Add the required Supabase configuration:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_key

Never commit real secrets to GitHub.


---

4. Start the development server

npm run dev

The application will be available through the local Vite development server.


---

🧪 Build

To create a production build:

npm run build

To preview the production build locally:

npm run preview


---

🛠️ Development

Before pushing changes, it is recommended to verify:

npm run build

and, if available in the project:

npm run lint

TypeScript errors should also be resolved before merging changes.


---

📁 Project Structure

A simplified structure:

Team-Leaderboard/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   └── ...
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── public/
│
├── package.json
├── vite.config.*
├── tsconfig.json
└── README.md

The exact structure may evolve as the project develops.


---

🔄 Data Flow

Supabase / PostgreSQL
        │
        │
        ▼
   Database Logic
        │
        ▼
   React Application
        │
        ├── Leaderboard
        ├── History
        ├── Notifications
        └── Team Navigation

Real-time changes can be reflected in the frontend through Supabase Realtime.


---

📱 Responsive Design

The interface is designed primarily with mobile devices in mind.

Supported layouts include small mobile screens through desktop displays.

Special attention is given to:

Touch targets

Navigation

RTL layouts

Horizontal overflow

Leaderboard readability

Performance on lower-end devices



---

⚡ Performance

Performance is considered throughout the application.

Optimization areas include:

React rendering

Supabase queries

Realtime subscriptions

Bundle size

CSS

Fonts

Images

Animations

Network requests


The project avoids unnecessary optimizations that add complexity without measurable benefit.


---

🔒 Project Status

> 🚧 Experimental / Development



This project is currently under active development.

Features, database structures, scoring rules, and UI components may change as the system is tested and improved.

The current data should not be considered production data.


---

👨‍💻 Developer

Ahmed Sameh

Built and maintained as a university cybersecurity/IT project.


---

📄 License

This project is currently intended for educational and team use.

No explicit open-source license has been defined yet. 
