# Logdrio PWA 💼

> ⚠️ **Work in Progress** - This is an experimental financial management PWA currently under active development. Features may be incomplete or change frequently.

A personal finance tracking app built with Next.js and TypeScript. Experimenting with PWA capabilities, offline storage, and double-entry accounting concepts.

## ✨ Features

### 🏦 Financial Management
- Basic double-entry accounting system (still refining the implementation)
- Multi-currency support (CLP, USD, EUR, BTC) - working on precision handling
- Simple account management with balances
- Category-based organization 
- Transaction types: Expenses, Income, and Transfers

### 📱 PWA Experiment  
- Basic offline functionality with service worker
- Responsive design (mobile-first approach)
- Connection status indicator 
- Can be installed as a PWA on supported devices

### 🔐 Authentication
- Google OAuth integration using NextAuth.js
- Guest mode for trying the app without signing up
- Basic JWT token handling

### 🎨 User Interface
- Dark/Light mode toggle
- Spanish localization (dates, numbers)
- Color-coded transactions (red for expenses, green for income)
- Toast notifications for feedback
- Real-time updates (experimental)

### 🛠️ Development Tools
- Debug menu with fake data generator (faker.js)
- Nuclear data reset option for testing
- Development mode indicators

### 💾 Data Storage
- IndexedDB for client-side data persistence
- Basic validation with Zod schemas
- Still working on: import/export, backups, sync

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd logdrio-pwa

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file with:

```env
# Google OAuth (required for authentication)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth (required)
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Database (if using external storage)
DATABASE_URL=your_database_url
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components  
- **Database**: IndexedDB (client-side) with validation layer
- **Authentication**: NextAuth.js with Google provider
- **State Management**: React hooks with reactive updates
- **PWA**: Custom service worker with caching strategies
- **Currency**: Custom MoneyAmount class with proper precision

### Key Components

```
src/
├── app/                    # Next.js app router
├── components/            
│   ├── auth/              # Authentication components
│   ├── data/              # Data tables and displays  
│   ├── debug/             # Development tools
│   ├── forms/             # Transaction/account forms
│   ├── layout/            # Header, sidebar, navigation
│   ├── tabs/              # Main app tabs (Dashboard, Transactions, etc.)
│   └── ui/                # shadcn/ui components
├── contexts/              # React contexts (Auth, Database)
├── hooks/                 # Custom React hooks
├── lib/                   # Core business logic
│   ├── auth/              # Authentication services
│   ├── business-rules/    # Financial validation rules
│   ├── database/          # IndexedDB layer with events
│   ├── queries/           # Data access patterns
│   ├── schemas/           # Zod validation schemas
│   └── utils/             # Helper functions
├── providers/             # App-level providers
└── types/                 # TypeScript type definitions
```

### Financial Model (Experimental)

**Double-Entry Accounting Attempt:**
- Trying to implement proper double-entry (every transaction balanced)
- User accounts vs System accounts concept
- Amounts stored as integers to avoid floating point issues
- Still figuring out multi-currency precision

**Basic Transaction Flow:**
1. User creates simple transaction (Expense/Income/Transfer)
2. System tries to generate proper double-entry lines
3. Basic validation (work in progress)
4. Real-time updates (sometimes works!)

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check
```

### Debug Features

Access the debug menu (🐛 icon) in development mode:

- **Insert 100 Transactions**: Generates fake transactions for testing
- **Nuke All Data**: Wipes all local data (useful for fresh starts)

### Development Mode

Enable advanced features by setting in browser console:
```javascript
localStorage.setItem('debug-mode', 'true')
```

## 📱 PWA Features

### Service Worker Caching
- **Static assets**: Cache-first strategy for CSS, JS, images
- **API routes**: Network-first with offline fallback  
- **Navigation**: Network-first with offline page fallback
- **Dynamic content**: Intelligent caching with background sync

### Offline Capabilities (Basic)
- App works without internet (mostly)
- Can create transactions offline
- Connection status shown in header
- Sync when reconnected (experimental)

### Installation (PWA)
You can install this as a native-like app:
- Chrome: Look for "Install" in the address bar
- Safari: "Add to Home Screen" 
- Android: Should show install prompt

## 🔒 Security (Basic)

### Data Protection
- Trying to avoid storing sensitive data in logs
- Basic JWT token handling
- Input validation with Zod
- Standard NextAuth.js security practices

### Authentication
- Google OAuth through NextAuth.js
- Guest mode stores everything locally
- Still learning about proper session management

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Deploy to Vercel
npm run build
vercel --prod
```

### Other Platforms
Should work on other Next.js hosting:
- Netlify
- Railway  
- Any Node.js hosting

### PWA Notes
- Needs HTTPS for service worker to work
- Test offline features before deploying
- PWA manifest included but could be improved

## 🤝 Contributing

Since this is a work-in-progress personal project, contributions are welcome but keep in mind things change frequently!

1. Fork it
2. Create a branch (`git checkout -b feature/cool-thing`)
3. Make your changes
4. Push and create a PR

### Code Notes
- Using TypeScript (learning as I go)
- ESLint setup included
- No tests yet (I know, I know...)
- Try to follow existing patterns

## 📄 License

License not yet determined. All rights reserved for now.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [NextAuth.js](https://next-auth.js.org/) for authentication
- [Zod](https://zod.dev/) for schema validation
- [faker.js](https://fakerjs.dev/) for test data generation

---

Built while learning about PWAs, double-entry accounting, and trying not to break things too often. 🤞