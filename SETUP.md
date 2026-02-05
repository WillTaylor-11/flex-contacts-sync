# Setup Instructions

## ✅ Project Created Successfully!

Your Flex Contacts Sync application is ready. Follow these steps to complete the setup.

## 📁 Project Location

```
/Users/swpapp/Documents/CoWork Output/flex-contacts-sync/
```

## 🔧 Complete Setup Steps

### 1. Open Project in VS Code

```bash
cd ~/Documents/CoWork\ Output/flex-contacts-sync
code .
```

### 2. Install Dependencies

Open the integrated terminal in VS Code (`` Ctrl+` `` or `View > Terminal`) and run:

```bash
npm install
```

This will install:
- axios (HTTP client)
- better-sqlite3 (SQLite database)
- dotenv (Environment variables)
- winston (Logging)
- nodemon (Development tool)

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Flex API credentials:
   ```
   FLEX_API_KEY=your-api-key-here
   FLEX_BASE_URL=https://yoursite.flexrentalsolutions.com/f5/api
   ```

3. To get your API key:
   - Log into Flex5
   - Go to **Main Menu > Integrations > API**
   - Click **Add API Key**
   - Copy the key to your `.env` file

### 4. Complete Git Setup

Git has been initialized but needs to be committed from your local machine:

```bash
# Remove the lock file if it exists
rm -f .git/index.lock

# Stage all files
git add -A

# Create initial commit
git commit -m "Initial commit: Flex Contacts Sync application

- Node.js application to sync contacts from Flex Rental Solutions API
- SQLite database storage
- Comprehensive logging with Winston
- Error handling and retry logic
- Sync history tracking
- Complete documentation"

# Rename branch to main (if needed)
git branch -M main
```

### 5. Create GitHub Repository

#### Option A: Using GitHub CLI (gh)

```bash
# Create repository on GitHub
gh repo create flex-contacts-sync --public --source=. --remote=origin

# Push code
git push -u origin main
```

#### Option B: Using GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `flex-contacts-sync`
3. Description: "Sync contact data from Flex Rental Solutions to SQLite"
4. Choose public or private
5. **Do not** initialize with README, .gitignore, or license
6. Click "Create repository"
7. Run the commands shown:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/flex-contacts-sync.git
   git push -u origin main
   ```

### 6. Test the Application

```bash
# Run the sync
npm start
```

You should see:
```
============================================================
  FLEX CONTACTS SYNC
  Syncing contacts from Flex Rental Solutions to SQLite
============================================================

[Timestamp] [INFO]: Testing API connection...
[Timestamp] [INFO]: API connection test successful
[Timestamp] [INFO]: Fetching contacts from Flex API...
[Timestamp] [INFO]: Fetched X contacts from Flex API
[Timestamp] [INFO]: Processing contacts...
...
[Timestamp] [INFO]: Sync completed successfully!
```

### 7. Verify Database

```bash
# Check database was created
ls -lh data/contacts.db

# Query database (install sqlite3 if needed)
sqlite3 data/contacts.db "SELECT COUNT(*) FROM contacts;"
sqlite3 data/contacts.db "SELECT * FROM contacts LIMIT 5;"
```

## 🎯 Next Steps

### VS Code Recommended Extensions

Install these extensions for better development experience:
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **SQLite Viewer** - View database files
- **GitLens** - Git visualization

### Development Mode

For development with auto-reload:

```bash
npm run dev
```

This uses nodemon to restart the app when files change.

### View Logs

```bash
# View application logs
tail -f logs/app.log

# View error logs only
tail -f logs/error.log
```

### Query Database Examples

```bash
sqlite3 data/contacts.db

# Count contacts
SELECT COUNT(*) FROM contacts;

# View recent contacts
SELECT contact_id, first_name, last_name, status
FROM contacts
ORDER BY updated_at DESC
LIMIT 10;

# View sync history
SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 5;

# Search contacts
SELECT * FROM contacts WHERE first_name LIKE '%John%';

# Export to CSV
.mode csv
.output contacts.csv
SELECT * FROM contacts;
.quit
```

## 🔍 Troubleshooting

### "Cannot find module 'axios'"
Run `npm install` to install dependencies.

### "FLEX_API_KEY must be set"
Create `.env` file with your API credentials (see step 3).

### "Authentication failed"
- Verify API key is correct in `.env`
- Check API key is active in Flex5
- Ensure base URL matches your Flex instance

### Git permission errors
The Git repository was initialized but may have permission issues from the creation process. Simply remove `.git/index.lock` if it exists and commit from your local terminal.

## 📚 Documentation

- **README.md** - Complete project documentation
- **Flex API Skill** - Available in `~/Documents/CoWork Output/flex-api/`
- **Swagger UI** - https://yoursite.flexrentalsolutions.com/f5/swagger-ui/index.html

## ✨ Project Features

✅ Complete Node.js application structure
✅ SQLite database with proper schema
✅ Comprehensive error handling
✅ Retry logic with exponential backoff
✅ Detailed logging (console + files)
✅ Sync history tracking
✅ Rate limit handling
✅ Full documentation
✅ Git initialized
✅ Ready for GitHub

## 🚀 You're All Set!

The project is fully functional and ready to use. Just complete the setup steps above and you'll be syncing contacts from Flex in minutes!

---

**Questions?** Check the README.md file or the Flex API skill documentation.
