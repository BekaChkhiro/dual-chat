# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DualChat is a team-client communication platform with dual-mode messaging built on React, TypeScript, Vite, Supabase, and shadcn-ui. The key feature is **staff mode**: team members can toggle between client-visible messages and internal staff-only notes within the same chat thread.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Authentication & Authorization

The app uses a **role-based access control (RBAC)** system with three roles defined in `app_role` enum:
- `admin` - Full system access
- `team_member` - Can create chats, manage members, see all messages including staff-only
- `client` - Can view and send regular messages only

**Important**: Role checks use `has_role(_user_id, _role)` function (security definer) to prevent RLS recursion. This function is defined in the initial migration.

### Database Schema

Core tables (all with RLS enabled):
- `profiles` - User profile information (auto-created on signup via trigger)
- `user_roles` - Maps users to their roles (security critical, separate table)
- `chats` - Chat conversations with client/company metadata
- `chat_members` - Many-to-many relationship between users and chats
- `messages` - Chat messages with `is_staff_only` flag for dual-mode messaging
- `chat_invitations` - Pending email invitations with tokens (7-day expiry)

**Key RLS Policies**:
- Messages: `is_staff_only` messages only visible to admin/team_member roles
- Chats: Users can only see chats they're members of
- Chat Members: Only team members can add/remove members

### Dual-Mode Messaging

The core feature implemented in `src/components/chat/ChatWindow.tsx`:
- `ModeToggle` component switches between client and staff mode
- Messages are filtered client-side based on `isStaffMode` state and `is_staff_only` flag
- Staff mode shows **only** staff-only messages (internal notes)
- Client mode shows **only** non-staff messages (visible to clients)
- RLS ensures clients never receive staff-only messages from database

### Real-time Updates

Messages table has realtime enabled:
```sql
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

Components subscribe to Supabase realtime channels and invalidate React Query cache on INSERT events.

### Member Management & Invitations

`AddMemberDialog` component handles two scenarios:
1. **Existing users**: Directly adds to `chat_members` and assigns role if needed
2. **Non-existent users**: Creates invitation in `chat_invitations` table and calls `send-chat-invitation` Edge Function

Invitations:
- Generate unique token and 7-day expiration
- Edge Function sends email with invitation URL: `${origin}/auth?invitation=${token}`
- Auth page should handle invitation token to complete signup flow

### State Management

- **Auth**: `AuthContext` (React Context) provides `user`, `session`, `loading`
- **Data fetching**: TanStack Query (React Query) with Supabase
- **Forms**: react-hook-form + zod validation

### Styling

- Tailwind CSS with custom color scheme including `staff` colors for staff-mode UI
- shadcn-ui components in `src/components/ui/`
- Custom CSS variables in `src/index.css` for theming

### File Structure

```
src/
├── components/
│   ├── chat/          - Chat-specific components (ChatWindow, ChatList, etc.)
│   └── ui/            - shadcn-ui components
├── contexts/          - React contexts (AuthContext)
├── hooks/             - Custom hooks
├── integrations/
│   └── supabase/      - Supabase client and generated types
├── lib/               - Utilities
├── pages/             - Route pages (Index, Auth, NotFound)
└── App.tsx            - Root component with routing
```

## Supabase Integration

### Local Development Setup

Environment variables required in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon public key
- `VITE_SUPABASE_PROJECT_ID` - Project ID

### Type Generation

Types are auto-generated in `src/integrations/supabase/types.ts`. To regenerate:
```bash
# Use Supabase CLI to generate types
npx supabase gen types typescript --project-id <project-id> > src/integrations/supabase/types.ts
```

### Migrations

Located in `supabase/migrations/`. Key migrations:
- `20251013142138_*` - Initial schema with RBAC, profiles, chats, messages
- `20251015065952_*` - Chat invitations system

### Edge Functions

- `send-chat-invitation` - Sends invitation emails to non-existent users

## Important Patterns

### Checking User Roles

Always use the `has_role` function in SQL policies:
```sql
WHERE has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'team_member')
```

Never query `user_roles` directly in RLS policies to avoid recursion.

### Fetching Messages with Profiles

Messages don't directly join profiles. Fetch separately and map:
```typescript
// Fetch messages
const messages = await supabase.from("messages").select("*").eq("chat_id", chatId);
// Fetch profiles for unique sender IDs
const profiles = await supabase.from("profiles").select("id, full_name, email").in("id", senderIds);
// Map profiles to messages
```

See `src/components/chat/ChatWindow.tsx` for reference implementation.

### Staff-Only Message Filtering

When displaying messages, filter based on mode:
```typescript
const filteredMessages = messages?.filter((msg) =>
  isStaffMode ? msg.is_staff_only : !msg.is_staff_only
);
```

RLS handles database-level security; client-side filtering is for UX only.

## Testing Roles

To test different roles, manually insert into `user_roles` table:
```sql
INSERT INTO user_roles (user_id, role) VALUES
  ('<user-uuid>', 'admin'),
  ('<user-uuid>', 'team_member');
```

Note: A user can have multiple roles (unique constraint on `user_id, role` pair).
