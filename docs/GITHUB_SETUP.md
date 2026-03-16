# Pushing to GitHub Private Repository

## Step 1 — Create the repo on GitHub
1. Go to https://github.com/new
2. Name: `fintrack` (or anything you like)
3. Select **Private**
4. Do NOT initialize with README (we have one already)
5. Click **Create repository**

## Step 2 — Add your remote and push
Run these commands in your terminal after downloading the repo folder:

```bash
# If you downloaded the zip, cd into the folder first
cd fintrack-repo

# Add GitHub as the remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/fintrack.git

# Push all commits and branches
git push -u origin main
```

## Step 3 — Authenticate
GitHub no longer accepts password auth. Use a Personal Access Token:
1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate new token → select `repo` scope
3. Copy the token
4. When git prompts for password, paste the token

## Step 4 — Future updates
Every time you make changes:
```bash
git add -A
git commit -m "describe your change"
git push
```

## Branching strategy (optional)
```bash
git checkout -b feature/new-feature   # create a branch
git checkout main                     # go back to main
git merge feature/new-feature         # merge when done
```
