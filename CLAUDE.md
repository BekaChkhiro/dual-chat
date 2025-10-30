# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DualChat is a team-client communication platform with dual-mode messaging, project management, and multi-organization support built on React, TypeScript, Vite, Supabase, and shadcn-ui. Key features include:
- **Staff mode**: Team members toggle between client-visible messages and internal staff-only notes
- **Multi-organization**: Users can create and switch between multiple organizations, each with isolated chats
- **Project management**: Tasks with kanban board, calendar view, file attachments, and review workflow
- **Documentation**: Per-chat notes (with pinning) and multi-page documentation
- **Setup wizard**: New users complete a 3-step onboarding process (profile, organization, completion)
- **Web push notifications**: Browser push notification support for real-time message alerts (see PUSH-NOTIFICATIONS-SETUP.md)

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
- `profiles` - User profile information with phone, bio, avatar_url, and setup_completed flag
- `user_roles` - Maps users to their roles (security critical, separate table)
- `organizations` - Organizations that users can create and belong to
- `organization_members` - Maps users to organizations with roles (owner, admin, member)
- `chats` - Chat conversations with client/company metadata, organization_id, and project_description
- `chat_members` - Many-to-many relationship between users and chats
- `messages` - Chat messages with `is_staff_only` flag for dual-mode messaging
- `chat_invitations` - Pending email invitations with tokens (7-day expiry)
- `tasks` - Project tasks with status (to_start, in_progress, review, completed, failed), due dates, and attachments
- `chat_notes` - Free-form project notes per chat with pinning capability
- `chat_docs` - Multi-page documentation per chat with ordering
- `web_push_subscriptions` - Browser push notification subscriptions per user

**Key RLS Policies**:
- Messages: `is_staff_only` messages only visible to admin/team_member roles
- Chats: Users can only see chats they're members of AND belong to the chat's organization
- Chat Members: Only team members can add/remove members
- Organizations: Users can only see organizations they're members of
- Organization Members: Members can view other members in their organizations
- Owners/admins can manage organization settings and members
- Tasks: Only staff can create/update tasks; creators, assignees, and admins can update; visibility limited to chat members
- Chat Notes: Only staff can create; authors and admins can update/delete; all chat members can view
- Chat Docs: Only staff can create; authors and admins can update/delete; all chat members can view
- Web Push: Users can only manage their own subscriptions

### Dual-Mode Messaging

The core feature implemented in `src/components/chat/ChatWindow.tsx`:
- `ModeToggle` component switches between client and staff mode
- Messages are filtered client-side based on `isStaffMode` state and `is_staff_only` flag
- Staff mode shows **only** staff-only messages (internal notes)
- Client mode shows **only** non-staff messages (visible to clients)
- RLS ensures clients never receive staff-only messages from database

### Staff Tabbed Interface

Staff users see a tabbed interface (`StaffTabs` component) with multiple views:
- **Messages** - Dual-mode chat messages (staff-only or client-visible)
- **About Project** (`AboutProjectTab`) - Project description and documentation pages
- **Tasks** (`TasksTab`) - List view of all tasks with filters
- **Kanban** (`KanbanBoard`) - Drag-and-drop kanban board grouped by task status
- **Calendar** (`CalendarView`) - Calendar view of tasks by due date
- **Files** (`FilesTab`) - File attachments from messages and tasks

The UI text is in Georgian language (საქართული).

### Project Management Features

**Tasks System:**
- Tasks belong to chats and have: title, description, status, due_date, assignee_id, attachments
- Status enum: `to_start`, `in_progress`, `review`, `completed`, `failed`
- Task attachments stored in `task-attachments` bucket (private, 10MB limit per file)
- Attachment metadata stored in JSONB column with same structure as message attachments
- Only staff (admin/team_member) can create tasks
- Task creators, assignees, and admins can update tasks
- Assignees can update task status (for workflow progression)

**Chat Notes:**
- Free-form project notes attached to chats (max 2000 characters)
- Can be pinned for important notes (boolean `pinned` flag)
- Only staff can create; authors and admins can update/delete

**Chat Documentation:**
- Multi-page documentation system per chat
- Each doc has: title (max 200 chars), content (max 20,000 chars), order_index
- Ordered by `order_index` for custom sorting
- Only staff can create; authors and admins can update/delete

**Storage Buckets:**
- `chat-attachments` - Message file attachments (private, 10MB limit)
- `task-attachments` - Task file attachments (private, 10MB limit)
- `avatars` - User profile avatars (private)
- `organization-logos` - Organization logos (public)

### Real-time Updates

Messages table has realtime enabled:
```sql
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

Components subscribe to Supabase realtime channels and invalidate React Query cache on INSERT events.

### Web Push Notifications

The app supports browser push notifications for real-time message alerts:

**Architecture:**
- `src/lib/push.ts` - Client-side subscription management
- `public/sw.js` - Service worker handling push events and notification clicks
- `src/components/notifications/NotificationPermissionBanner.tsx` - UI for requesting permission
- `supabase/functions/notify-new-message/` - Edge Function to send notifications
- `web_push_subscriptions` table - Stores active push subscriptions per user
- `get_chat_member_subscriptions()` - Database function to query subscriptions

**Flow:**
1. User enables notifications via banner (calls `enablePushForCurrentUser()`)
2. Browser creates push subscription with VAPID public key
3. Subscription stored in `web_push_subscriptions` table
4. When message sent, client invokes `notify-new-message` Edge Function
5. Edge Function queries chat members' subscriptions (excluding sender)
6. Notifications sent to all chat members via web-push library
7. Service worker receives push event and displays notification
8. User clicks notification → app opens to specific chat

**Key Features:**
- Automatic cleanup of expired subscriptions (410/404 responses)
- Staff-only messages only notify staff members
- Notifications include chat context and message preview
- Deep linking to specific chat on notification click
- iOS PWA support (iOS 16.4+, requires Add to Home Screen)

**Setup:** See `PUSH-NOTIFICATIONS-SETUP.md` for complete configuration guide including VAPID key generation, environment variables, and deployment steps.

### Member Management & Invitations

`AddMemberDialog` component handles two scenarios:
1. **Existing users**: Directly adds to `chat_members`, automatically adds to organization, and assigns role if needed
2. **Non-existent users**: Creates invitation in `chat_invitations` table and calls `send-chat-invitation` Edge Function

**Automatic Organization Membership:**
- When a user is added to a chat (either as existing user or via invitation), they are automatically added to the chat's parent organization
- Uses `add_user_to_chat_organization(_user_id, _chat_id)` database function (SECURITY DEFINER)
- New members are assigned the `member` role in the organization by default
- Function is idempotent - safe to call multiple times
- Implemented in:
  - `AddMemberDialog.tsx` (line ~187) - when adding existing users to chat
  - `Auth.tsx` (line ~133) - when new users accept invitation during signup
- Backfill migration `20251030130000` ensures existing chat members are added to their organizations

Invitations:
- Generate unique token and 7-day expiration
- Edge Function sends email with invitation URL: `${origin}/auth?invitation=${token}`
- Auth page handles invitation token to complete signup flow and add user to both chat and organization

### State Management

- **Auth**: `AuthContext` (React Context) provides `user`, `session`, `loading`
- **Organizations**: `OrganizationContext` provides `currentOrganization`, `organizations`, `switchOrganization()`, `createOrganization()`, `updateOrganization()`, `deleteOrganization()`
- **Data fetching**: TanStack Query (React Query) with Supabase
- **Forms**: react-hook-form + zod validation
- **Local Storage**: `currentOrganizationId` persists selected organization between sessions

### Styling

- Tailwind CSS with custom color scheme including `staff` colors for staff-mode UI
- shadcn-ui components in `src/components/ui/`
- Custom CSS variables in `src/index.css` for theming

### User Flows

**New User Registration:**
1. Sign up on `/auth` (email, password, full name)
2. Redirect to `/setup` (3-step wizard)
   - Step 1: Profile details (phone, bio, avatar - all optional)
   - Step 2: Create first organization (name required, description & logo optional)
   - Step 3: Success screen, auto-redirect to dashboard
3. Profile `setup_completed` set to `true`
4. User becomes `owner` of their first organization

**Existing User Login:**
1. Login on `/auth`
2. If `setup_completed` is `false`, redirect to `/setup`
3. Otherwise, redirect to `/` (dashboard)
4. OrganizationContext auto-selects last used organization (from localStorage)

**Organization Switching:**
- Header contains `OrganizationSwitcher` dropdown
- Shows all organizations user belongs to with their role badge (owner/admin/member)
- Click to switch → ChatList refreshes with selected organization's chats
- Selection persisted in localStorage

**Creating Chats:**
- Chats belong to `currentOrganization`
- All chats in ChatList filtered by `organization_id`
- When switching organizations, chat list automatically updates

### File Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── tabs/              - Tab views (MessagesTab, TasksTab, KanbanBoard, CalendarView, FilesTab, AboutProjectTab)
│   │   ├── tasks/             - Task components (TaskCard, KanbanTaskCard, CreateTaskDialog, TaskDetailDialog)
│   │   ├── chat-details/      - Chat details sidebar (MembersList, MediaGrid, FilesList, LinksList)
│   │   ├── ChatWindow.tsx     - Main chat interface with tabbed views
│   │   ├── ChatList.tsx       - List of chats in sidebar
│   │   ├── StaffTabs.tsx      - Tabbed interface for staff mode
│   │   ├── ModeToggle.tsx     - Toggle between staff/client mode
│   │   └── ...                - Other chat components (MessageBubble, FileUpload, etc.)
│   ├── organization/          - Organization components (OrganizationSwitcher, CreateOrganizationDialog)
│   ├── setup/                 - Setup wizard components (ProfileSetupForm, OrganizationSetupForm, AvatarUpload)
│   └── ui/                    - shadcn-ui components
├── contexts/                  - React contexts (AuthContext, OrganizationContext)
├── hooks/                     - Custom hooks
├── integrations/
│   └── supabase/              - Supabase client and generated types
├── lib/                       - Utilities
├── pages/                     - Route pages (Index, Auth, Setup, NotFound)
└── App.tsx                    - Root component with routing and providers
```

## Supabase Integration

### Local Development Setup

Environment variables required in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon public key
- `VITE_SUPABASE_PROJECT_ID` - Project ID

Edge function environment variables (set in Supabase dashboard):
- `RESEND_API_KEY` - Required for `send-chat-invitation` function to send emails

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
- `20251015120000_*` - File attachments storage bucket and policies
- `20251015170000_*` - Auto-assign admin role to first user, allow staff to add members
- `20251015190000_*` - Organizations system: organizations, organization_members tables, profiles enhancements (phone, bio, setup_completed), avatars & organization-logos storage buckets
- `20251015200000_*` - Tasks and project management (tasks table, task_status enum, project_description on chats)
- `20251015210000_*` - Task attachments (attachments JSONB column, task-attachments bucket)
- `20251016123001_*` - Add 'review' status to task_status enum
- `20251016133002_*` - Chat notes table for free-form project notes
- `20251016134005_*` - Add pinned flag to chat_notes
- `20251016135210_*` - Chat docs table for multi-page documentation
- `20251016170510_*` - Web push subscriptions table
- `20251030120000_*` - Auto-add chat members to organization (add_user_to_chat_organization function)
- `20251030130000_*` - Backfill existing chat members into organizations

### Edge Functions

- `send-chat-invitation` - Sends invitation emails to non-existent users
  - Requires `RESEND_API_KEY` environment variable
  - Uses Resend API for email delivery
  - Sends email with invitation URL format: `${origin}/auth?invitation=${token}`

### File Attachments

Messages support file attachments stored in Supabase Storage:
- Bucket: `chat-attachments` (private, 10MB limit per file)
- Allowed types: images, PDFs, Word docs, text files, spreadsheets
- Storage structure: `{user_id}/{chat_id}/{timestamp}-{random}.{ext}`
- Signed URLs with 1-year expiration are generated for access
- RLS policies: Users can only upload/view files in their own folders (first path segment = user_id)

Attachment data stored in `messages.attachments` JSONB column:
```typescript
{
  name: string;    // Original filename
  type: string;    // MIME type
  url: string;     // Signed URL
  size: number;    // File size in bytes
}
```

See `src/components/chat/ChatWindow.tsx:214-256` for upload implementation.

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

### Working with Tasks

Tasks are queried with chat_id and support various filtering:
```typescript
// Fetch tasks for a chat
const { data: tasks } = await supabase
  .from("tasks")
  .select("*, assignee:assignee_id(full_name), creator:created_by(full_name)")
  .eq("chat_id", chatId)
  .order("created_at", { ascending: false });

// Filter by status for kanban columns
const tasksInProgress = tasks?.filter(t => t.status === 'in_progress');
```

Task status workflow: `to_start` → `in_progress` → `review` → `completed` (or `failed`)

### Task and Message Attachments

Both use JSONB columns with identical structure:
```typescript
interface Attachment {
  name: string;   // Original filename
  type: string;   // MIME type
  url: string;    // Signed URL from Supabase Storage
  size: number;   // File size in bytes
}
```

Upload pattern (see `ChatWindow.tsx:214-256` and task upload components):
1. Upload file to appropriate bucket with path: `{user_id}/{chat_id}/{timestamp}-{random}.{ext}`
2. Generate signed URL (1-year expiration)
3. Store attachment metadata in JSONB column
4. Display with appropriate preview/download UI

## Testing Roles

To test different roles, manually insert into `user_roles` table:
```sql
INSERT INTO user_roles (user_id, role) VALUES
  ('<user-uuid>', 'admin'),
  ('<user-uuid>', 'team_member');
```

Note: A user can have multiple roles (unique constraint on `user_id, role` pair).

## Organization Roles

Organizations use a separate role system from global app roles:
- `owner` - Full control, can delete organization, manage all members
- `admin` - Can manage organization settings and members (except owners)
- `member` - Can view organization, create/view chats

Helper functions available:
```sql
is_organization_owner(_user_id, _organization_id) -- Returns boolean
is_organization_admin(_user_id, _organization_id) -- Returns boolean (owner OR admin)
get_user_organization_role(_user_id, _organization_id) -- Returns role as text
```

## Important Implementation Notes

- Always check `currentOrganization` before creating chats or fetching chat lists
- ChatList query explicitly filters by `chat_members` to show only chats where the user is a member
  - First fetches user's `chat_members` entries to get chat IDs
  - Then filters chats by both `organization_id` and `chat_id IN (...)`
  - This ensures users only see chats they're explicitly added to, not all organization chats
  - **Sorting**: Chats are sorted client-side by last message timestamp (most recent first)
    - Chats with messages sorted by `last_message.created_at` (descending)
    - Chats without messages appear at bottom, sorted by `created_at` (descending)
- ChatList query includes `organization_id` in queryKey: `["chats", currentOrganization?.id]`
- Setup wizard sets `setup_completed = true` in profiles table
- Dashboard checks `setup_completed` and redirects to `/setup` if false
- Organization logo upload uses public bucket, avatar upload uses private bucket
- First user in setup wizard automatically becomes organization owner
- **UI Language**: The interface uses Georgian language (საქართული) for staff-facing components (tab labels, buttons, etc.)
- **Kanban Board**: Uses `@dnd-kit` library for drag-and-drop task management between status columns
- **Calendar View**: Uses `react-big-calendar` for displaying tasks by due date
- **Query Keys**: Include mode/status in query keys for proper cache invalidation (e.g., `["messages", chatId, isStaffMode ? 'staff' : 'client']`)
- **Task Assignment**: Assignees can update task status even if they didn't create the task (enables workflow delegation)
