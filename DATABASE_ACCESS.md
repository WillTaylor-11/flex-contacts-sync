# Database Access Guide

## Quick Stats

- **Location**: `./data/contacts.db`
- **Total Contacts**: 1,600
- **All contacts are active** (0 deleted)
- **Database Type**: SQLite 3
- **Schema**: Fully matches Flex API response structure

## Database Schema

```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flex_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  preferred_display_string TEXT,
  barcode TEXT,
  deleted BOOLEAN DEFAULT 0,
  short_name TEXT,
  domain_id TEXT,
  class_name TEXT,
  short_name_or_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  flex_data TEXT  -- Complete JSON from Flex API
);
```

## Access Methods

### 1. Command Line Scripts (Easiest)

```bash
# Search contacts
node scripts/query-contacts.js search "Meyer Sound"

# Get specific contact by ID
node scripts/query-contacts.js id 0144e47a-443b-4aa9-b385-dfbdebf9b7f7

# Show statistics
node scripts/query-contacts.js stats

# Show recent updates
node scripts/query-contacts.js recent 20

# Show contact count
node scripts/query-contacts.js count

# Show deleted contacts
node scripts/query-contacts.js deleted
```

### 2. Direct SQLite Access

```bash
# Open database in SQLite CLI
sqlite3 data/contacts.db

# Common queries once inside:
.headers on
.mode column

SELECT * FROM contacts LIMIT 10;
SELECT COUNT(*) FROM contacts;
SELECT * FROM contacts WHERE name LIKE '%Meyer%';
```

### 3. Programmatic Access (Node.js)

```javascript
require('dotenv').config();
const { getDatabase } = require('./src/database/schema');
const db = getDatabase();

// Raw SQL queries
const contacts = db.prepare('SELECT * FROM contacts WHERE name LIKE ?').all('%Meyer%');

// Or use the operations module
const { getAllContacts, getContactById } = require('./src/database/operations');

const allContacts = getAllContacts();
const contact = getContactById('0144e47a-443b-4aa9-b385-dfbdebf9b7f7');
```

## Common Queries

### Search by name
```sql
SELECT * FROM contacts
WHERE name LIKE '%search_term%'
ORDER BY name;
```

### Get all contacts with specific pattern
```sql
SELECT * FROM contacts
WHERE name LIKE '%Hotel%'
OR name LIKE '%Theater%';
```

### Count by category
```sql
SELECT
  CASE
    WHEN name LIKE '%Hotel%' THEN 'Hotels'
    WHEN name LIKE '%Theater%' THEN 'Theaters'
    WHEN name LIKE '%Arena%' THEN 'Arenas'
    ELSE 'Other'
  END as category,
  COUNT(*) as count
FROM contacts
GROUP BY category
ORDER BY count DESC;
```

### Recently updated contacts
```sql
SELECT * FROM contacts
ORDER BY updated_at DESC
LIMIT 10;
```

### Extract JSON field
```sql
SELECT
  name,
  json_extract(flex_data, '$.id') as flex_id,
  json_extract(flex_data, '$.className') as class
FROM contacts
LIMIT 10;
```

## Export Data

### Export to CSV
```bash
sqlite3 -header -csv data/contacts.db "SELECT * FROM contacts;" > contacts.csv
```

### Export to JSON
```bash
node -e "
require('dotenv').config();
const { getAllContacts } = require('./src/database/operations');
const fs = require('fs');
const contacts = getAllContacts();
fs.writeFileSync('contacts.json', JSON.stringify(contacts, null, 2));
console.log('Exported to contacts.json');
"
```

## Database Tools

### VS Code Extensions
- **SQLite** by alexcvzz - Browse and query SQLite databases
- **SQLite Viewer** by Florian Klampfer - View SQLite databases in VS Code

### Desktop Apps
- **DB Browser for SQLite** (Free) - https://sqlitebrowser.org/
- **TablePlus** (Free/Paid) - https://tableplus.com/
- **DBeaver** (Free) - https://dbeaver.io/

## Backup & Restore

### Create Backup
```bash
cp data/contacts.db data/contacts.db.backup-$(date +%Y%m%d-%H%M%S)
```

### Restore from Backup
```bash
cp data/contacts.db.backup-20260205-143749 data/contacts.db
```

## Re-sync from Flex

To fetch latest data from Flex and update the database:

```bash
node scripts/sync-contacts.js
```

This will:
- Fetch all contacts from Flex API
- Insert new contacts
- Update existing contacts
- Log the sync operation

## Database Maintenance

### Optimize Database
```bash
sqlite3 data/contacts.db "VACUUM;"
```

### Check Database Integrity
```bash
sqlite3 data/contacts.db "PRAGMA integrity_check;"
```

### View Database Size
```bash
ls -lh data/contacts.db
```

## Contact Categories

Based on current data (1,600 contacts):

| Category | Count |
|----------|-------|
| Other | 1,276 |
| Production Companies | 66 |
| Centers | 56 |
| Theaters | 48 |
| Arenas/Stadiums | 34 |
| Parks | 33 |
| Studios | 30 |
| Hotels | 30 |
| Churches | 11 |
| Resorts | 10 |
| Schools/Universities | 6 |
