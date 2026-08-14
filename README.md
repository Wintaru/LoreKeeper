# LoreKeeper

A PWA DM companion app for D&D. Players join campaigns by code — no accounts required. The flagship feature is the **Fate Engine**: the DM sets intent, the app secretly picks a target, and the targeted player gets a push notification before the DM even knows who was chosen.

---

## Before You Start

This guide walks you through every step from a fresh computer to a running app. You don't need to know how to code — just follow each step in order.

You'll be typing commands into a **terminal** (also called a command prompt). Here's how to open one:

- **macOS:** Press `Command + Space`, type `Terminal`, press Enter
- **Windows:** Press `Windows + R`, type `cmd`, press Enter (or search for "Command Prompt" in the Start menu)

When a step shows a command in a grey box like this:
```
npm install
```
Type it exactly as shown and press Enter. Wait for it to finish before moving to the next step.

---

## Step 1 — Install Git

Git is a tool for downloading code from the internet.

**macOS:**
1. Open Terminal
2. Type `git --version` and press Enter
3. If it prints a version number, Git is already installed — skip to Step 2
4. If it prompts you to install "Command Line Tools", click Install and wait for it to finish

**Windows:**
1. Go to [git-scm.com/download/win](https://git-scm.com/download/win)
2. Download and run the installer — the default options are fine
3. Open a new Command Prompt window after installing

---

## Step 2 — Install Node.js

Node.js is the engine that runs the app.

1. Go to [nodejs.org](https://nodejs.org)
2. Click the button labeled **LTS** (the recommended version)
3. Run the downloaded installer — the default options are fine
4. Close and reopen your terminal window
5. Verify the install worked:
   ```
   node --version
   ```
   You should see a version number like `v20.x.x`.

---

## Step 3 — Install Docker Desktop

Docker runs the local database (Supabase) on your machine.

**Windows users — enable WSL2 first:**

Docker on Windows requires WSL2 (Windows Subsystem for Linux 2). To enable it:

1. Open the Start menu, search for **PowerShell**, right-click it, and choose **Run as administrator**
2. Run this command:
   ```
   wsl --install
   ```
3. Restart your computer when prompted
4. After restarting, a terminal window may open to finish the Ubuntu setup — follow the prompts to create a username and password

If `wsl --install` says WSL is already installed, you're good — move on to the Docker install below.

**Install Docker Desktop (all platforms):**

1. Go to [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Click **Download Docker Desktop** for your operating system
3. Run the installer — the default options are fine
   - On Windows, make sure **"Use WSL 2 instead of Hyper-V"** is checked (it usually is by default)
4. Launch Docker Desktop after installation
5. Wait until the whale icon in your menu bar (macOS) or system tray (Windows) stops animating — this means Docker is ready
6. Verify it's running:
   ```
   docker --version
   ```

> **Important:** Docker Desktop must be running any time you work on the app. If your computer restarts, open Docker Desktop again before continuing.

---

## Step 4 — Install the Supabase CLI

The Supabase CLI manages your local database.

**macOS:**

First check if Homebrew is installed:
```
brew --version
```
If not, install it by running this command (copy the whole thing):
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Then install Supabase:
```
brew install supabase/tap/supabase
```

**Windows:**

> **Do not use `npm install -g supabase` on Windows** — the npm package may download the wrong binary for your processor and silently fail. Use one of these instead:

Option A — **Scoop** (recommended, easy to use):
1. Open PowerShell and run:
   ```
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   ```
2. Then install Supabase:
   ```
   scoop install supabase
   ```

Option B — **Winget** (built into Windows 10/11):
```
winget install Supabase.CLI
```

Option C — **Direct download:**
1. Go to [github.com/supabase/cli/releases](https://github.com/supabase/cli/releases)
2. Download the file ending in `windows_amd64.tar.gz` from the latest release
3. Extract it and move `supabase.exe` to a folder that's in your PATH (e.g. `C:\Windows\System32`)

After installing via any method, open a **new** terminal window and verify:
```
supabase --version
```

---

## Step 5 — Download the Code

1. Open your terminal
2. Navigate to where you want to put the project. For example, to put it in your Documents folder:
   - **macOS:** `cd ~/Documents`
   - **Windows:** `cd %USERPROFILE%\Documents`
3. Download the code:
   ```
   git clone <repo-url>
   ```
   Replace `<repo-url>` with the actual URL of this repository.
4. Move into the project folder:
   ```
   cd LoreKeeper
   ```
5. Install the app's dependencies (this may take a minute):
   ```
   npm install
   ```

---

## Step 6 — Start the Local Database

This step starts a local copy of the database on your machine. Docker Desktop must be open and running.

```
supabase start
```

The first time you run this it downloads some files (~1 GB) and takes a few minutes. You'll see a lot of output — this is normal. When it finishes, you'll see a summary of URLs.

Once running, you can open the database browser at **[http://127.0.0.1:54333](http://127.0.0.1:54333)** to see your tables and data.

> **Note:** If `supabase start` fails with a port conflict, see the [Troubleshooting](#troubleshooting) section below.

---

## Step 7 — Create Your Environment File

The app needs a configuration file with connection details and security keys. Start by copying the example:

**macOS/Linux:**
```
cp .env.local.example .env.local
```

**Windows:**
```
copy .env.local.example .env.local
```

The Supabase database settings are already filled in for local development. Now you need to add Web Push keys (these are required for the Fate Engine notifications).

Run this command to generate a pair of keys:
```
npx web-push generate-vapid-keys
```

It will print something like:
```
Public Key:
BFj3abc...long string of characters...

Private Key:
Kx9def...another long string...
```

Open `.env.local` in a text editor (Notepad on Windows, TextEdit on macOS, or any code editor) and replace the placeholder values at the bottom:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=paste-your-public-key-here
VAPID_PRIVATE_KEY=paste-your-private-key-here
VAPID_CONTACT_EMAIL=mailto:your@email.com
```

Replace `your@email.com` with your real email address (this is required by the push notification standard).

Save the file.

---

## Step 8 — Run the App

```
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the LoreKeeper home page. To try it:
- Go to `/dm/new` to create a campaign as the DM
- Open a second browser tab or window and go to `/play` to join as a player using the campaign code

---

## Stopping and Restarting

When you're done working:
```
supabase stop
```

Your data is saved between stops. The next time you want to work on the app:
1. Open Docker Desktop and wait for it to start
2. In your terminal, navigate back to the project folder
3. Run `supabase start`
4. Run `npm run dev`

To wipe the database and start fresh:
```
supabase db reset
```

---

## Troubleshooting

**`supabase` command not found after installing on Windows**

Close your terminal window and open a new one — the PATH may not have updated in the existing session. If it still doesn't work, you installed via npm (which can download the wrong binary on Windows). Uninstall it (`npm uninstall -g supabase`) and reinstall using Scoop or Winget as described in Step 4.

**`supabase start` fails on Windows with a Docker or image error**

Make sure WSL2 is enabled (Step 3) and that Docker Desktop is using the WSL2 backend: open Docker Desktop → Settings → General → confirm "Use the WSL 2 based engine" is checked. Restart Docker Desktop and try again.

**`supabase start` says a port is already in use**

Another process is using the same port. Check the port numbers in `supabase/config.toml` and change them to something free, or stop whatever is using those ports.

**`npm install` fails with permission errors (macOS/Linux)**

Do not use `sudo npm install`. Instead, fix npm's permissions by following the guide at [docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

**The app opens but shows a database error**

Make sure `supabase start` is running. Open a new terminal window and check:
```
supabase status
```
If Supabase is not running, start it again.

**Push notifications don't work in local dev**

Browsers only allow push notifications on HTTPS — except for `localhost`, which works fine. If you want to test on your phone, run a tunnel:
```
npx localtunnel --port 3000
```
Use the URL it gives you instead of `localhost:3000`.

---

## Deploying to the Internet (Optional)

If you want to make the app publicly accessible, you'll need:
1. A free [Supabase](https://supabase.com) account for the hosted database
2. A free [Vercel](https://vercel.com) account for hosting

### 1. Create a hosted Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → API** and copy your project URL and keys
3. Push your database schema to the hosted project:
   ```
   supabase db push
   ```
   When prompted, link to your project using the URL shown in the Supabase dashboard.

### 2. Deploy to Vercel

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```
2. Deploy:
   ```
   npx vercel
   ```
   Follow the prompts — it will ask you to log in the first time.

3. In the [Vercel dashboard](https://vercel.com), open your project → **Settings → Environment Variables** and add:

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same value from your `.env.local` |
   | `VAPID_PRIVATE_KEY` | Same value from your `.env.local` |
   | `VAPID_CONTACT_EMAIL` | Your email |

4. Redeploy after adding the variables:
   ```
   npx vercel --prod
   ```

---

## Project Structure (for contributors)

```
src/
├── managers/        # Orchestration layer — workflow and sequencing
├── engines/         # Business logic — pure functions, no I/O
├── accessors/       # Data access — Supabase, Web Push
├── utilities/       # Cross-cutting helpers — dice, tables, push payloads
├── common/          # Shared base types and HandlerResolver infrastructure
│   └── resolver/
└── container/       # Dependency wiring — all composition happens here

src/app/
├── dm/              # DM-facing pages
├── play/            # Player-facing pages
└── api/             # Next.js API routes

supabase/
├── config.toml      # Local Supabase configuration and port settings
└── migrations/      # SQL migration files (applied in order)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full layer map, data models, and Fate Engine flow.
See [PLANNING.md](PLANNING.md) for the feature roadmap and phase breakdown.

This project follows iDesign / volatility-based decomposition. Every component belongs to one layer (Client, Manager, Engine, Accessor, Utility) with strict call rules between them. Read [ARCHITECTURE.md](ARCHITECTURE.md) before writing new code.
