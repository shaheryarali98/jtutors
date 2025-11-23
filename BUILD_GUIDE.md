# Frontend Build Guide

## Quick Start: Building for Production

### Step 1: Make Your Changes
Edit your frontend code in `frontend/src/` as needed.

### Step 2: Build for Production

```bash
cd frontend
npm run build
```

This will:
- ✅ Use `.env.production` file (which has `VITE_API_URL=https://jtutors.onrender.com/api`)
- ✅ Compile TypeScript
- ✅ Build optimized production files
- ✅ Output to `frontend/dist/` folder

### Step 3: Deploy the `dist` Folder

Upload the contents of `frontend/dist/` to your hosting (https://jtutors.com)

---

## Workflow for Making Changes

### Every Time You Make Changes:

1. **Edit your code** in `frontend/src/`

2. **Build the production version**:
   ```bash
   cd frontend
   npm run build
   ```

3. **Check the build output**:
   - Files are in `frontend/dist/`
   - Check `dist/index.html` and `dist/assets/` folder

4. **Deploy the `dist` folder**:
   - Upload `dist/` contents to your hosting provider
   - Or use your hosting provider's deployment method

---

## Important Notes

### ✅ The `.env.production` file is already configured
- It has `VITE_API_URL=https://jtutors.onrender.com/api`
- This ensures your frontend connects to the backend
- **Don't delete this file!**

### ⚠️ Always Rebuild After Changes
- Vite embeds environment variables at **build time**
- If you change code, you **must rebuild** before deploying
- The `dist/` folder needs to be regenerated

### 🔍 Verify Your Build

After building, check:

1. **Open `dist/index.html`** - should exist
2. **Check `dist/assets/`** - should have JS and CSS files
3. **Search for API URL** in built files:
   ```bash
   # On Windows PowerShell:
   Select-String -Path "dist\assets\*.js" -Pattern "jtutors.onrender.com"
   
   # On Mac/Linux:
   grep -r "jtutors.onrender.com" dist/
   ```
   You should see `https://jtutors.onrender.com/api` in the built files.

---

## Troubleshooting

### Problem: Login/Register still not working after rebuild

**Check:**
1. Did you rebuild? (`npm run build`)
2. Did you deploy the new `dist/` folder?
3. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console - should show: `✅ API Base URL configured: https://jtutors.onrender.com/api`

### Problem: Build fails

**Check:**
1. TypeScript errors: `npm run build` will show them
2. Missing dependencies: `npm install`
3. Check `frontend/.env.production` exists

### Problem: Old code still showing

**Solution:**
1. Make sure you rebuilt: `npm run build`
2. Clear browser cache
3. Check that you deployed the new `dist/` folder
4. Some hosting providers cache aggressively - check their cache settings

---

## Development vs Production

### Development (Local)
```bash
npm run dev
```
- Uses `vite.config.ts` proxy (localhost:5000)
- Hot reload enabled
- Uses `/api` relative path (works with proxy)

### Production (Live Site)
```bash
npm run build
```
- Uses `.env.production` file
- Optimized and minified
- Uses `https://jtutors.onrender.com/api` (full URL)

---

## Quick Reference

| Task | Command |
|------|---------|
| Run locally | `cd frontend && npm run dev` |
| Build for production | `cd frontend && npm run build` |
| Preview production build | `cd frontend && npm run preview` |
| Check build output | Look in `frontend/dist/` |

---

## Example Workflow

```bash
# 1. Make changes to your code
# Edit frontend/src/pages/auth/Login.tsx

# 2. Test locally (optional)
cd frontend
npm run dev
# Test at http://localhost:3000

# 3. Build for production
npm run build

# 4. Check the output
ls dist/  # Should see index.html and assets/

# 5. Deploy dist/ folder to your hosting
# (Upload to https://jtutors.com)
```

---

**Remember:** Every code change requires a new build and deployment!

