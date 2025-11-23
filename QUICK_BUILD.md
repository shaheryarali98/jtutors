# Quick Build Guide - Making Changes to Frontend

## 🚀 Simple 3-Step Process

### Step 1: Create `.env.production` file

**If you don't have this file yet**, create it:

1. Go to `frontend/` folder
2. Create a file named `.env.production`
3. Add this content:
   ```
   VITE_API_URL=https://jtutors.onrender.com/api
   ```

**OR** copy the example file:
```bash
cd frontend
copy .env.production.example .env.production
```

### Step 2: Make Your Changes

Edit your code in `frontend/src/` as needed.

### Step 3: Build and Deploy

**Option A: Using the build script (Windows)**
```bash
cd frontend
build-production.bat
```

**Option B: Using the build script (Mac/Linux)**
```bash
cd frontend
chmod +x build-production.sh
./build-production.sh
```

**Option C: Manual build**
```bash
cd frontend
npm run build
```

### Step 4: Deploy the `dist` Folder

Upload the contents of `frontend/dist/` to your hosting (https://jtutors.com)

---

## ✅ That's It!

After these steps:
- Your frontend will connect to `https://jtutors.onrender.com/api`
- Login and register will work
- All API calls will go to the correct backend

---

## 🔄 When You Make New Changes

**Every time you change code, repeat Step 2 and Step 3:**

1. Edit code in `frontend/src/`
2. Run `npm run build` (or use the build script)
3. Deploy the new `dist/` folder

**Important:** You must rebuild after every code change!

---

## 🐛 Still Not Working?

1. **Check `.env.production` exists** in `frontend/` folder
2. **Verify it has the correct URL**: `VITE_API_URL=https://jtutors.onrender.com/api`
3. **Rebuild**: `npm run build`
4. **Clear browser cache** (Ctrl+Shift+R)
5. **Check browser console** - should show: `✅ API Base URL configured: https://jtutors.onrender.com/api`

---

## 📝 Quick Checklist

- [ ] `.env.production` file exists in `frontend/` folder
- [ ] `.env.production` contains: `VITE_API_URL=https://jtutors.onrender.com/api`
- [ ] Ran `npm run build`
- [ ] Deployed the new `dist/` folder
- [ ] Cleared browser cache
- [ ] Checked browser console for API URL confirmation

