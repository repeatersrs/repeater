# Repeater Web Frontend

A modern React + TypeScript SPA built with Vite and TanStack Router.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Routing**: TanStack Router (file-based, type-safe routing)
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Forms**: React Hook Form + Zod validation
- **Rich Text**: Plate.js
- **Styling**: Tailwind CSS 4

## Getting Started

### Development

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Environment Variables

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── routes/          # File-based routes (TanStack Router)
│   ├── __root.tsx   # Root layout
│   ├── index.tsx    # Home page
│   ├── login.tsx
│   ├── register.tsx
│   ├── review.tsx
│   ├── profile.tsx
│   ├── decks/
│   │   ├── index.tsx
│   │   └── $deckId.tsx  # Dynamic route
│   └── admin/
│       └── index.tsx
├── components/      # Reusable components
├── lib/            # Utilities and config
├── hooks/          # Custom React hooks
└── gen/            # OpenAPI-generated API client
```

## Key Features

- Type-safe routing with automatic route generation
- Optimistic updates with TanStack Query
- Dark mode support
- Keyboard shortcuts
- Drag-and-drop deck organization
- Rich text card editing
- CSV export

## Docker

### Development

```bash
docker compose up web
```

### Production

```bash
docker build -t repeater-web --target production .
docker run -p 80:80 repeater-web
```

The production build uses nginx to serve static assets efficiently.

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build locally
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix linting issues
- `pnpm openapi-ts` - Regenerate API client from OpenAPI spec
