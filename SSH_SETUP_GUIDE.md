# SSH Key Setup for Multiple GitHub Accounts

This guide will help you set up a separate SSH key for the jtutors repository with email shaheryarali446@gmail.com.

## Step 1: Generate a New SSH Key

Open PowerShell or Git Bash and run:

```bash
ssh-keygen -t ed25519 -C "shaheryarali446@gmail.com" -f "$HOME/.ssh/id_ed25519_jtutors"
```

**When prompted:**
- **Enter file location**: Press Enter to use the default (`C:\Users\YourName\.ssh\id_ed25519_jtutors`)
- **Enter passphrase**: You can set a passphrase for extra security, or press Enter twice to skip

## Step 2: Add SSH Key to SSH Agent

Start the SSH agent:
```powershell
# In PowerShell
Start-Service ssh-agent
ssh-add $HOME/.ssh/id_ed25519_jtutors
```

Or in Git Bash:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_jtutors
```

## Step 3: Create SSH Config File

Create or edit `~/.ssh/config` (or `C:\Users\YourName\.ssh\config`):

```bash
# Your existing GitHub account (keep this)
Host github.com-existing
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# New GitHub account for jtutors
Host github.com-jtutors
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_jtutors
    IdentitiesOnly yes
```

## Step 4: Add Public Key to GitHub

1. **Copy your public key:**
   ```powershell
   Get-Content $HOME/.ssh/id_ed25519_jtutors.pub | Set-Clipboard
   ```

2. **Add to GitHub:**
   - Go to https://github.com/settings/keys
   - Click "New SSH key"
   - Title: "JTutors Repository Key"
   - Key: Paste the copied key
   - Click "Add SSH key"

## Step 5: Update Git Remote URL

If you've already cloned the repository, update the remote URL:

```bash
cd D:\jtutor
git remote set-url origin git@github.com-jtutors:shaheryarali98/jtutors.git
```

Or if you're cloning fresh:
```bash
git clone git@github.com-jtutors:shaheryarali98/jtutors.git
```

## Step 6: Configure Git User for This Repository

Set the Git user for this specific repository:

```bash
cd D:\jtutor
git config user.name "shaheryarali98"
git config user.email "shaheryarali446@gmail.com"
```

## Step 7: Test SSH Connection

Test the connection:
```bash
ssh -T git@github.com-jtutors
```

You should see: `Hi shaheryarali98! You've successfully authenticated...`

## Troubleshooting

### If SSH agent isn't working:
```powershell
# Remove and re-add
ssh-add -D
ssh-add $HOME/.ssh/id_ed25519_jtutors
```

### If you get "Permission denied":
- Make sure the public key is added to GitHub
- Check that the SSH config file is correct
- Verify the key is loaded: `ssh-add -l`

### To use different keys for different repos:
Always use the custom hostname (`github.com-jtutors`) in your Git remote URLs.

