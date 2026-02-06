# Full Contact Sync Guide

## Overview

The Flex API provides two types of endpoints:

1. **List Endpoint** (`GET /contact`) - Returns basic fields (9 fields per contact)
2. **Detail Endpoint** (`GET /contact/{id}`) - Returns complete details (**63 fields** per contact)

## What's Included in Full Sync

### Personal Information
- ✅ First Name, Middle Name, Last Name
- ✅ Salutation, Birthday
- ✅ Display preferences

### Contact Details
- ✅ Email addresses (all)
- ✅ Phone numbers (all)
- ✅ Physical addresses (all)
- ✅ Fax numbers

### Business Information
- ✅ Company name
- ✅ Job title
- ✅ Employer ID and relationships
- ✅ Organization vs Individual flag
- ✅ Homebase location
- ✅ Corporate entity

### Financial Data
- ✅ Credit limit
- ✅ Currency preferences
- ✅ Pricing models
- ✅ Discount settings
- ✅ Terms and tax rules
- ✅ Bill-to contact settings

### Relationships
- ✅ Resource types (Client, Venue, etc.)
- ✅ Contact types
- ✅ Tag assignments

### System & Audit
- ✅ Created date and user
- ✅ Last edit date and user
- ✅ Associated user ID
- ✅ Deletion history
- ✅ Import status

### Identifiers
- ✅ Barcodes
- ✅ RFID tags
- ✅ External numbers
- ✅ Assigned numbers
- ✅ Reference data

## Running the Full Sync

### Option 1: Full Sync (Recommended for Complete Data)

```bash
node scripts/sync-contacts-full.js
```

**What it does:**
- Fetches list of all 1,600 contact IDs
- Fetches full details for each contact
- Stores complete data in database

**Estimated time:** ~4-5 minutes (at 10 requests/sec with rate limiting)

**Progress:** Shows real-time progress with ETA and statistics

### Option 2: Quick Sync (Basic Data Only)

```bash
node scripts/sync-contacts.js
```

**What it does:**
- Fetches contacts from list endpoint only
- Stores basic fields (9 fields per contact)
- Much faster but limited data

**Estimated time:** ~10 seconds

## Database Comparison

### Before (List Endpoint Only)
- 9 fields per contact
- No email addresses
- No phone numbers
- No financial data
- No relationships

### After (Full Detail Endpoint)
- 63+ fields per contact
- Complete email list
- Complete phone list
- All addresses
- Financial details
- Resource types and relationships
- Full audit trail

## Example: What You Get

**Contact: Scott McPhee**

Before (List):
```
- ID: 002b4bee-bd62-43f1-90ee-af8d535b2718
- Name: Scott McPhee
- Deleted: false
- (6 more basic fields)
```

After (Full):
```
- ID: 002b4bee-bd62-43f1-90ee-af8d535b2718
- Full Name: Scott McPhee
- Email: scott@meshbroadcast.com
- Company: Mesh Broadcast
- Employer ID: 15dec07c-60af-4930-990b-bfdf149de50e
- Homebase: 2f49c62c-b139-11df-b8d5-00e08175e43e
- Created: 2024-04-16T18:31:30
- Resource Types: Client
- (+ 50 more detailed fields)
```

## Database Schema

The enhanced database now includes:

```sql
-- Personal (7 fields)
first_name, middle_name, last_name, salutation, birthday, ...

-- Business (4 fields)
organization, company, job_title, employer_id

-- Contact Details (5 reference IDs + JSON arrays)
default_email_id, default_phone_id, ...
addresses, internet_addresses, phone_numbers

-- Financial (10 fields)
credit_limit, default_bill_to_contact, currency_id,
default_pricing_model_id, standard_discount_id, ...

-- Relationships (JSON arrays)
resource_types, contact_types, tag_ids

-- Audit & System (15+ fields)
created_by_user_id, flex_created_date, last_edit_user_id,
deleted_by_user_id, deleted_by_date, ...

-- And much more...
```

## Querying Full Data

### Search by company
```bash
node scripts/query-contacts.js search "Mesh Broadcast"
```

### Get contacts with email
```sql
SELECT * FROM contacts
WHERE json_array_length(internet_addresses) > 0;
```

### Find organizations vs individuals
```sql
SELECT
  organization,
  COUNT(*) as count
FROM contacts
GROUP BY organization;
```

### Get contacts by resource type
```sql
SELECT
  name,
  json_extract(resource_types, '$[0].name') as type
FROM contacts
WHERE resource_types != '[]';
```

## Performance Notes

- **Rate Limiting:** Built-in 100ms delay between requests (~10 req/sec)
- **Retry Logic:** Automatic retry with exponential backoff
- **Progress Tracking:** Real-time ETA and statistics
- **Error Handling:** Continues sync even if some contacts fail
- **Resumable:** Database stores partial progress

## Before Running Full Sync

✅ **Backup created automatically:** `data/contacts.db.backup-before-full-sync`

✅ **Test passed:** 3 contacts synced successfully

✅ **Database schema:** Updated with 61 fields

## Running Full Sync Now

To sync all 1,600 contacts with complete data:

```bash
cd "/Users/swpapp/Documents/CoWork Output/flex-contacts-sync"
node scripts/sync-contacts-full.js
```

Expected output:
```
🔄 Starting FULL contact sync (with detailed information)

📋 Fetching contact list...
📊 Total contacts: 1600
📄 Total pages: 17

📥 Fetching full details for each contact...
⏱️  Estimated time: ~4 minutes

Progress: 100/1600 (6%) - ETA: 4m | Rate: 6.2/s | Inserted: 98, Updated: 2, Errors: 0
...
✅ Full sync completed successfully!
```

## After Sync

Once complete, you'll have:
- Complete contact information for all 1,600 contacts
- Email addresses, phone numbers, and physical addresses
- Business relationships and resource types
- Financial and pricing information
- Full audit trail

Query the data using:
```bash
node scripts/query-contacts.js stats
node scripts/query-contacts.js search <name>
sqlite3 data/contacts.db
```
