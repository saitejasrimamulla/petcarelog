# PetCareLog

PetCareLog is a beginner-friendly full-stack web app for keeping pet profiles and their care history in one place. It is designed for first-year B.Tech students and uses plain HTML, CSS, and JavaScript, a Node.js/Express API, and Supabase PostgreSQL.

## Problem and objectives

Pet owners may have vaccination dates, vet visits, medication notes, and grooming history scattered across paper records or messages. PetCareLog provides one private dashboard to organize these details and record upcoming care dates.

### Implemented features

- Register, log in, check the current session, and log out.
- Create, view, update, search, and delete pet profiles.
- Record vet visits, vaccinations, medication, grooming, feeding, and other care events.
- Add an optional next due date and see upcoming care counts.
- Keep each pet and its records private to its owner through server-side authorization.
- Responsive layout, validation messages, and delete confirmations.

### Roles

There is one role: registered pet owner. An admin role is intentionally not included in this MVP.

## Technology stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js 20+ and Express 5
- Database: Supabase PostgreSQL
- Security/helper packages: Supabase JS client, bcryptjs, jsonwebtoken, cookie-parser, dotenv, helmet, express-rate-limit

## Folder structure

```text
petcarelog/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── middleware/auth.js
│   ├── routes/auth.js
│   ├── routes/pets.js
│   ├── routes/records.js
│   ├── utils/validation.js
│   ├── supabase.js
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── database/schema.sql
├── .gitignore
└── README.md
```

## Prerequisites

Install:
- [Node.js LTS](https://nodejs.org/) (includes npm)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/downloads)
- A free [Supabase](https://supabase.com/) account

After installing Node.js and Git, open a new terminal and verify:

```powershell
node --version
npm --version
git --version
```

Node should report version 20 or newer.

## Set up Supabase

1. Sign in to Supabase and create a new project.
2. Set a strong database password and wait for the project to finish provisioning.
3. Open **SQL Editor** in the Supabase dashboard.
4. Open `database/schema.sql` in VS Code, copy the entire file, paste it into a new SQL Editor query, and click **Run**.
5. In **Project Settings → API** (or the current API keys page), copy the project URL and the server-side service-role/secret key. Labels may differ as Supabase updates its dashboard. Never use a publishable/anon key for this server configuration and never expose the service key publicly.
6. In the table editor, verify that `app_users`, `pets`, and `care_records` exist.

This starter uses custom email/password authentication in Express, not Supabase Auth. Passwords are hashed with bcryptjs. The backend accesses the database using a privileged server-only key, so it explicitly checks pet ownership in every private API route. RLS is enabled and direct `anon`/`authenticated` table access is revoked. Do not create frontend code that uses the service key.

## Configure and run (Windows)

1. Open the `petcarelog` folder in VS Code.
2. In VS Code choose **Terminal → New Terminal**.
3. Change to the backend folder:

   ```powershell
   cd backend
   ```

4. Install dependencies:

   ```powershell
   npm install
   ```

5. Copy the example environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

6. Generate a strong JWT secret. Run this command in the backend terminal:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

7. Open `backend/.env` in VS Code and replace the sample values:

   ```dotenv
   PORT=3000
   NODE_ENV=development
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_actual_server_side_secret_key
   JWT_SECRET=paste_the_generated_random_secret_here
   ```

   Use your real Supabase URL and server-side secret key. Do not include quotes unless your value requires them. Do not commit `.env`.

8. From the `backend` folder, check JavaScript syntax:

   ```powershell
   npm run check
   ```

9. Start the server:

   ```powershell
   npm start
   ```

10. Open **http://localhost:3000** in your browser. Create an account and add a pet. Keep the terminal open while using the app.

For development with automatic restart on supported Node versions, use `npm run dev`.

## How the application works

The browser loads the HTML, CSS, and vanilla JavaScript served from `frontend/`. Browser `fetch()` calls send requests to `/api/...`. Express validates request bodies, verifies the signed HttpOnly session cookie, checks ownership, and performs database operations through the Supabase client. PostgreSQL constraints provide another layer of data validation.

The JWT is stored in an HttpOnly, SameSite=Strict cookie for up to eight hours. In production, `NODE_ENV=production` makes the cookie Secure, so HTTPS is required. This is a student MVP; review the production considerations below before deploying.

## API reference

All responses are JSON. Private endpoints require the `petcarelog_token` cookie.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | API health check | No |
| POST | `/api/auth/register` | Create account; body: `name`, `email`, `password` | No |
| POST | `/api/auth/login` | Log in; body: `email`, `password` | No |
| GET | `/api/auth/me` | Get current user | Yes |
| POST | `/api/auth/logout` | Clear session cookie | No |
| GET | `/api/pets` | List owned pets and counts | Yes |
| POST | `/api/pets` | Create pet profile | Yes |
| PATCH | `/api/pets/:id` | Update owned pet | Yes |
| DELETE | `/api/pets/:id` | Delete owned pet and its care entries | Yes |
| GET | `/api/pets/:petId/records` | List care history for owned pet | Yes |
| POST | `/api/pets/:petId/records` | Add care entry | Yes |
| PATCH | `/api/records/:id` | Update care entry belonging to owned pet | Yes |
| DELETE | `/api/records/:id` | Delete care entry belonging to owned pet | Yes |

Validation failures normally return `400`, unauthenticated requests return `401`, missing/unowned records return `404`, duplicate email returns `409`, and unexpected server errors return a generic `500` message. Register/login requests are rate-limited.

## Test checklist

- `GET http://localhost:3000/api/health` returns `{"status":"ok","service":"PetCareLog API"}`.
- Register an account with a valid email and a password of at least 8 characters.
- Log out and log back in with the same credentials.
- Try registering the same email twice; the second attempt should be rejected.
- Add a pet and verify it appears in the pet list.
- Edit the pet, search for it, and delete it after confirmation.
- Add a vaccination or vet visit, then edit and delete the entry.
- Try submitting a blank pet name or care title; the form should show a validation message.
- Try a next due date earlier than the care entry date; the server should reject it.
- Create a second account and verify it cannot see the first account's pets. The API should return `404` for a pet/record that does not belong to the current account.
- Resize the browser to mobile width and verify cards/forms fit the screen.
- Restart the server and confirm the database records remain stored.

## Troubleshooting

- **`Missing SUPABASE_URL...`**: Check that `backend/.env` exists and has the exact variable names.
- **Supabase error / dashboard unavailable**: Confirm the project URL and server-side key; ensure the SQL schema ran successfully.
- **Port already in use**: Change `PORT=3001` in `.env`, restart, and open `http://localhost:3001`.
- **`JWT_SECRET must be set...`**: Generate a random secret using the command above and paste it into `.env`.
- **`npm` or `node` not recognized**: Reinstall Node.js LTS, select the option to add it to PATH if offered, and reopen VS Code.
- **Changes not visible**: Refresh the browser; if you changed backend code, restart the server.
- **`relation does not exist`**: Re-run `database/schema.sql` in the correct Supabase project and verify the table names.

## Git and GitHub

1. Create an empty repository on GitHub. Do not upload `.env` or database secrets.
2. Open a terminal in the project root (`petcarelog`, not `backend`).
3. Run:

   ```bash
   git init
   git status
   git add .
   git status
   git commit -m "Build PetCareLog"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPOSITORY_URL
   git push -u origin main
   ```

4. Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.
5. Review the files shown by the second `git status` before committing. `.env`, `node_modules/`, private records, and secrets must not be staged. `.env.example` is safe to include because it contains placeholders.
6. Refresh the GitHub repository page and verify that the frontend, backend, database schema, and README are present.

Adding a secret to `.gitignore` does not remove it from a commit already made. If a credential is exposed, rotate it immediately and remove it from repository history as appropriate.

## Limitations and future improvements

This MVP does not include email verification, password reset, multi-factor authentication, file/photo uploads, reminders sent by email/SMS, or automated browser/database integration tests. The JWT is stateless, so logging out clears the browser cookie but does not revoke a copied token before its eight-hour expiry. For production, consider a revocable server-side session strategy, CSRF review, stronger operational monitoring, backups, and a security review. PetCareLog is a personal record-keeping aid, not a replacement for veterinary advice.

## License

For educational use. Add a license file if you choose a specific open-source license.
