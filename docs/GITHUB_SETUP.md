# Deploying FinTrack to GitHub

## Step 1 — Push the repository

```bash
# From inside the unzipped fintrack-repo folder:
git remote add origin https://github.com/YOUR_USERNAME/fintrack.git
git push -u origin main
git push origin feature/advanced-analytics feature/budget-enhancements
```

For authentication use a Personal Access Token:
- GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
- Scopes: `repo`, `workflow`
- Paste the token when git asks for a password

## Step 2 — Enable GitHub Pages

1. Go to your repo → **Settings → Pages**
2. Source: **GitHub Actions**
3. The `deploy.yml` workflow will auto-build and deploy on every push to `main`
4. Your app will be live at: `https://YOUR_USERNAME.github.io/fintrack/`

## Step 3 — Connect GitHub to Claude (optional)

1. **claude.ai → Settings → Integrations → GitHub**
2. Authorize Claude to access your repos
3. In future sessions Claude can push branches and create PRs directly

## Updating the app

Every time you push to `main`, GitHub Actions re-deploys automatically:

```bash
git add -A
git commit -m "your change"
git push origin main
```

## Branch strategy

```
main                        ← stable, auto-deploys to GitHub Pages
feature/advanced-analytics  ← Monte Carlo, AI analyzer (merge when ready)
feature/budget-enhancements ← latest WIP (merge when ready)
```

To merge a feature branch:
```bash
git checkout main
git merge feature/budget-enhancements
git push origin main
```

## Running the backend server locally

```bash
cd server
npm install
cp .env.example .env   # edit JWT_SECRET!
npm start
# → http://localhost:3001
```

Open `src/dashboard.html` in your browser — it auto-detects the server.
