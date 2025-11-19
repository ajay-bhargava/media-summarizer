# PS15 Social Media System 📱✨

A comprehensive social media content management system designed for schools and organizations. This application automatically processes incoming emails, extracts images, and uses AI to generate engaging Instagram posts with captions. 🎨🤖

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, React Router, Convex, and more.

## Overview 🚀

The PS15 Social Media System streamlines social media content creation by:
- 📧 Automatically receiving and processing emails with images
- 🤖 Using AI (Anthropic Claude) to generate Instagram-ready captions
- 🎯 Providing a user-friendly interface to review, customize, and manage posts
- 📬 Sending daily email digests of generated content
- ⏰ Supporting scheduled automated post generation via cron jobs

## Architecture 🏗️

### Frontend (`apps/web`) 💻

The frontend is a React application built with React Router that provides:

**Purpose:**
- 📧 **Email Management Interface**: View and browse incoming emails with images, grouped by date (Today, Yesterday, This Week, Older)
- 📱 **Post Management Interface**: Display AI-generated Instagram posts with captions, organized chronologically
- 🖼️ **Image Selection**: Interactive interface to select multiple images from emails to create custom posts
- ✨ **Post Generation**: Manual trigger for AI-powered post generation from selected images
- 🔐 **User Authentication**: Sign in/sign up interface with Better Auth integration
- 🏢 **Organization Management**: Multi-tenant support for different organizations

**Key Features:**
- 🎨 Modern, responsive UI built with shadcn/ui components
- ⚡ Real-time data synchronization via Convex reactive queries
- 🎠 Image carousel for viewing multiple photos from emails
- 📋 Copy-to-clipboard functionality for captions and images
- 💾 Download images directly from posts
- 🏷️ Visual indicators for user-generated vs. AI-generated posts

**Routes:**
- 🔑 `/` - Authentication page (login/signup)
- 📱 `/posts` - View all generated Instagram posts
- 📧 `/emails` - Browse emails with images

### Convex Backend (`packages/backend/convex`) ⚙️

The Convex backend provides a reactive, serverless backend with the following capabilities:

**Purpose:**
- 📨 **Email Processing**: Receives emails via Resend webhooks, extracts images and text content, stores parsed email data
- 🤖 **AI Content Generation**: Uses Anthropic Claude API to analyze email images and generate engaging Instagram captions
- 💾 **Post Management**: Stores, queries, and manages AI-generated posts with metadata
- ⏰ **Automated Workflows**: Cron jobs for scheduled post generation and email digest delivery
- 🏢 **Organization Management**: Multi-tenant architecture supporting multiple organizations with user profiles and roles
- 📬 **Email Digest System**: Sends formatted HTML emails with daily post summaries

**Key Components:**

1. **Schema** 📊 (`schema.ts`):
   - `organizations` - Organization configuration with cron settings
   - `emails` - Incoming email records
   - `parsedEmailContent` - Extracted text and image URLs from emails
   - `aiGeneratedPosts` - Generated Instagram posts with captions
   - `userProfiles` - User-organization relationships
   - `emailRecipients` - Email digest recipients

2. **HTTP Endpoints** 🌐 (`http.ts`):
   - `/api/email/received` - Webhook handler for incoming emails (Resend)
   - `/api/email/webhook` - Webhook handler for outbound email events
   - Better Auth routes for authentication

3. **Actions** ⚡ (`actions/`):
   - `emailContent.ts` - Fetches and processes email attachments, uploads to Convex Storage
   - `posts.ts` - Generates posts using AI, handles cron-based post generation
   - `storage.ts` - Manages file storage operations

4. **Queries** 🔍 (`queries/`):
   - `emails.ts` - Fetch emails with parsed content and images
   - `posts.ts` - Retrieve posts by organization, date range, email association
   - `organizations.ts` - Organization and recipient management
   - `userProfiles.ts` - User profile and authentication queries

5. **Mutations** ✏️ (`mutations/`):
   - `emails.ts` - Create and update email records
   - `posts.ts` - Create and manage posts
   - `crons.ts` - Configure scheduled post generation
   - `organizations.ts` - Organization management
   - `events.ts` - Handle email webhook events

6. **AI Generation** 🤖 (`lib/aiGenerator.ts`):
   - `generateInstagramCaptions()` - Batch processes email images to generate multiple posts
   - `generateCombinedPost()` - Creates a single post from user-selected images
   - Image batching and size optimization for Claude API
   - Retry logic for API rate limits

7. **Email Templates** 📧 (`emails.tsx`):
   - React Email templates for daily post digests
   - Scheduled email delivery via Convex scheduler
   - HTML email rendering with post previews

8. **Cron Jobs** ⏰ (`mutations/crons.ts`):
   - Configurable cron schedules per organization
   - Automated daily post generation from emails
   - Automatic email digest scheduling after post generation

## Features 🎯

### Technical Stack 🛠️

- **TypeScript** 📘 - For type safety and improved developer experience
- **React Router** 🧭 - Declarative routing for React
- **TailwindCSS** 🎨 - Utility-first CSS for rapid UI development
- **shadcn/ui** 🧩 - Reusable UI components
- **Convex** ⚡ - Reactive backend-as-a-service platform
- **Better Auth** 🔐 - Authentication and user management
- **Anthropic Claude** 🤖 - AI-powered caption generation
- **Resend** 📧 - Email sending and receiving
- **React Email** ✉️ - Email template rendering
- **Turborepo** 🚀 - Optimized monorepo build system
- **Biome** ✨ - Linting and formatting

### Core Functionality 🎪

1. **Email-to-Post Pipeline** 📨➡️📱:
   - Emails sent to organization-specific addresses are automatically received
   - Images and text are extracted and stored
   - AI analyzes content and generates Instagram-ready captions
   - Posts are stored and made available in the dashboard

2. **Manual Post Creation** ✋:
   - Users can browse emails and select specific images
   - AI generates a combined caption for selected images
   - Posts can be customized before saving

3. **Automated Scheduling** ⏰:
   - Organizations can configure cron schedules for automatic post generation
   - Daily email digests are automatically sent with generated posts
   - Configurable timezone support

4. **Multi-Tenant Architecture** 🏢:
   - Support for multiple organizations
   - User profiles linked to organizations
   - Organization-specific email addresses and settings

## Getting Started 🚀

### Prerequisites 📋

- Node.js 18+ or Bun 🦄
- Convex account ☁️
- Anthropic API key (for AI generation) 🤖
- Resend API key (for email handling) 📧

### Installation 📦

First, install the dependencies:

```bash
bun install
```

### Convex Setup ⚙️

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
bun run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

### Environment Variables 🔧

Configure the following environment variables in your Convex deployment. You can set them using:

```bash
cd packages/backend
bun run convex env set <VARIABLE_NAME> <value>
```

Or view all configured variables:

```bash
cd packages/backend
bun run convex env list
```

**Required Environment Variables:** ✅

- 🔑 `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude AI caption generation
- 🔐 `BETTER_AUTH_SECRET` - Secret key for Better Auth authentication (auto-generated or set manually)
- 🤖 `CLAUDE_MODEL` - Claude model to use (e.g., `claude-haiku-4-5`, `claude-3-5-sonnet-20241022`)
- 🌐 `CONVEX_SITE_URL` - Your Convex deployment URL (required for Better Auth, typically auto-configured)
- 📧 `RESEND_API_KEY` - Resend API key for sending and receiving emails
- 🔒 `RESEND_INBOUND_WEBHOOK_SECRET` - Webhook secret for verifying inbound email webhooks from Resend
- 🔐 `RESEND_WEBHOOK_SECRET` - Webhook secret for verifying outbound email event webhooks from Resend
- 🌍 `SITE_URL` - Your frontend application URL (e.g., `http://localhost:5173` for dev, production URL for prod)

**Optional Environment Variables:** ⚙️

- 🖼️ `IMAGE_RETENTION_DAYS` - Number of days to retain images in storage (default: `60`)
- 💾 `STORAGE_RETENTION_DAYS` - Number of days to retain stored files before cleanup (default: `30`, used by storage cleanup cron)
- 🕐 `TIMEZONE_OFFSET` - Timezone offset in hours from UTC (default: `-5` for EST)

### Running the Application 🏃

Start the development server:

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the web application.
Your app will connect to the Convex cloud backend automatically.

## Project Structure 📁

```
socialmedia/
├── apps/
│   └── web/                    # Frontend React application
│       ├── src/
│       │   ├── components/     # React components (UI, cards, dialogs)
│       │   ├── routes/         # React Router pages
│       │   ├── stores/         # Client-side state management
│       │   └── lib/            # Utilities and auth client
│       └── package.json
├── packages/
│   ├── backend/                # Convex backend
│   │   └── convex/
│   │       ├── actions/         # Server actions (AI generation, email processing)
│   │       ├── mutations/       # Database mutations
│   │       ├── queries/         # Database queries
│   │       ├── handlers/       # Webhook handlers
│   │       ├── lib/            # Shared utilities (AI, auth, webhooks)
│   │       ├── schema.ts       # Database schema
│   │       ├── http.ts         # HTTP endpoints
│   │       └── emails.tsx      # Email templates
│   └── config/                 # Shared TypeScript config
└── package.json
```

## Available Scripts 📜

- 🚀 `bun run dev` - Start all applications in development mode
- 🏗️ `bun run build` - Build all applications
- 💻 `bun run dev:web` - Start only the web application
- ⚙️ `bun run dev:setup` - Setup and configure your Convex project
- 🔍 `bun run check-types` - Check TypeScript types across all apps
- ✨ `bun run check` - Run Biome formatting and linting

## Workflow 🔄

1. 📨 **Email Reception**: Emails sent to organization-specific addresses trigger webhooks
2. 🔍 **Content Extraction**: Images and text are extracted and stored in Convex
3. 🤖 **AI Processing**: Claude analyzes images and generates captions (automated or manual)
4. 💾 **Post Storage**: Generated posts are saved with metadata and source references
5. 👀 **User Review**: Posts appear in the dashboard for review and management
6. 📬 **Email Digest**: Daily summaries are automatically sent to configured recipients

## License 📄

This project is part of the PS15 Social Media System, lovingly crafted by [Ajay Bhargava Ph.D.](https://ajay-bhargava.github.io) and the Fractal Tech NYC community. ❤️
