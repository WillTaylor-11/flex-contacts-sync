# Flex Contacts Database

## Overview

This database stores all contacts from the Flex Rental Solutions API with a complete mirror of all contact fields.

## Database Schema

### Contacts Table

The `contacts` table stores all contact information from Flex:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key (auto-increment) |
| `flex_id` | TEXT | Unique Flex contact ID (UUID) |
| `name` | TEXT | Contact name |
| `preferred_display_string` | TEXT | Preferred display string |
| `barcode` | TEXT | Barcode identifier |
| `deleted` | BOOLEAN | Deletion status (0=active, 1=deleted) |
| `short_name` | TEXT | Short name |
| `domain_id` | TEXT | Domain identifier |
| `class_name` | TEXT | Contact class (e.g., CONTACT) |
| `short_name_or_name` | TEXT | Short name or full name |
| `created_at` | DATETIME | Record creation timestamp |
| `updated_at` | DATETIME | Record update timestamp |
| `flex_data` | TEXT | Full JSON data from Flex API |

**Indexes:**
- `idx_flex_id` on `flex_id`
- `idx_name` on `name`
- `idx_deleted` on `deleted`
- `idx_class_name` on `class_name`

### Sync Log Table

The `sync_log` table tracks synchronization history:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Primary key |
| `sync_started_at` | DATETIME | Sync start time |
| `sync_completed_at` | DATETIME | Sync completion time |
| `records_fetched` | INTEGER | Number of records fetched |
| `records_inserted` | INTEGER | Number of new records |
| `records_updated` | INTEGER | Number of updated records |
| `status` | TEXT | Sync status (running/success/failed) |
| `error_message` | TEXT | Error message if failed |
| `created_at` | DATETIME | Log entry creation time |

## Current Statistics

- **Total Contacts**: 1,600
- **Active Contacts**: 1,600
- **Deleted Contacts**: 0
- **All contacts are class**: CONTACT

## Scripts

### 1. Sync Contacts (`scripts/sync-contacts.js`)

Fetches all contacts from Flex API and syncs them to the database.

```bash
node scripts/sync-contacts.js
```

**Features:**
- Fetches all pages from Flex API (100 contacts per page)
- Upserts contacts (inserts new, updates existing)
- Handles pagination automatically
- Logs sync statistics
- Progress indicators during sync

### 2. Check Database (`scripts/check-database.js`)

Displays database statistics and sample contacts.

```bash
node scripts/check-database.js
```

**Shows:**
- Total contact count
- Recent sync history
- Sample contacts (first 10)

### 3. Query Contacts (`scripts/query-contacts.js`)

Interactive query tool for searching and exploring contacts.

```bash
# Search by name
node scripts/query-contacts.js search "Meyer Sound"

# Get contact by ID
node scripts/query-contacts.js id 002b4bee-bd62-43f1-90ee-af8d535b2718

# Show statistics
node scripts/query-contacts.js stats

# Show recently updated contacts
node scripts/query-contacts.js recent 20

# Show deleted contacts
node scripts/query-contacts.js deleted

# Show contact count
node scripts/query-contacts.js count
```

## API Integration

### Database Operations Module

Located at `src/database/operations.js`:

```javascript
const {
  insertContact,
  updateContact,
  upsertContact,
  getAllContacts,
  getContactById,
  getContactCount
} = require('./src/database/operations');

// Insert/update a contact
const result = upsertContact(contactData);

// Get all contacts
const contacts = getAllContacts();

// Get specific contact
const contact = getContactById('flex-id-here');

// Get total count
const count = getContactCount();
```

### Flex API Module

Located at `src/api/flexApi.js`:

```javascript
const { getContacts, getContactById, testConnection } = require('./src/api/flexApi');

// Fetch contacts from Flex
const contacts = await getContacts();

// Get specific contact
const contact = await getContactById('contact-id');

// Test connection
const isConnected = await testConnection();
```

## Data Flow

1. **Flex API** → Contacts are fetched from `https://squarewave.flexrentalsolutions.com/f5/api/contact`
2. **Pagination** → API returns paginated results (100 per page, 17 total pages)
3. **Database** → Contacts are upserted into SQLite database
4. **Sync Log** → Each sync operation is logged with statistics

## Backup

Before syncing, the system automatically creates a backup:

```bash
data/contacts.db.backup-YYYYMMDD-HHMMSS
```

## Last Sync

- **Date**: 2026-02-05 22:37:47
- **Status**: Success
- **Fetched**: 1,700 contacts
- **Inserted**: 1,600 new contacts
- **Updated**: 100 contacts
- **Duration**: ~4 seconds

## Database Location

```
./data/contacts.db
```

## Notes

- The database uses SQLite via `better-sqlite3` for maximum performance
- All contact fields from Flex API are stored in individual columns
- Complete JSON data is preserved in `flex_data` column
- Upsert operations prevent duplicates (based on `flex_id`)
- Foreign keys are enabled for data integrity
