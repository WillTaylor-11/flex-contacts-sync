# Flex API Complete Sync Plan

## Discovered Endpoints

Based on API discovery, the following endpoints are available:

| Endpoint | Records | Status | Priority |
|----------|---------|--------|----------|
| `/contact` | 1,699 | ✅ Synced | **DONE** |
| `/resource-type` | 20 | 🔄 To sync | **HIGH** |
| `/payment-term` | 13 | 🔄 To sync | HIGH |
| `/maintenance-procedure` | 5 | 🔄 To sync | MEDIUM |

## Data Model Overview

### 1. Contacts (✅ COMPLETE)
**Endpoint:** `GET /contact` and `GET /contact/{id}`
**Records:** 1,699
**Fields:** 63 detailed fields including:
- Personal info (name, email, phone, address)
- Business info (company, employer, job title)
- Financial (credit limit, pricing, terms)
- Relationships (resource types)

**Database Table:** `contacts` - **CREATED** ✅

---

### 2. Resource Types
**Endpoint:** `GET /resource-type`
**Records:** 20
**Purpose:** Classification system for contacts, inventory, services, etc.

**Sample Data:**
```json
{
  "id": "4ab827cc-abef-11df-b8d5-00e08175e43e",
  "name": "Client",
  "namePlural": "Clients",
  "parentTypeId": null,
  "applicableClassName": "com.shoptick.contacts.domain.Contact",
  "availabilityMode": "permanent-asset",
  "applicableTowardsResourceTypeName": null,
  "discountEnabled": false,
  "taxable": false,
  "domainId": "resource-type"
}
```

**Categories:**
- **Contacts**: Client, Employee, Freelance Labor, Vendor, Venue
- **Inventory**: Rental, Retail, Subrental, Backorders
- **Services**: Labor, Service, Show Expense, Travel
- **Maintenance**: Maintenance, Repair
- **Locations**: Warehouse

**Database Schema:**
```sql
CREATE TABLE resource_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flex_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_plural TEXT,
  parent_type_id TEXT,
  applicable_class_name TEXT,
  availability_mode TEXT,
  applicable_towards_resource_type_name TEXT,
  discount_enabled BOOLEAN DEFAULT 0,
  taxable BOOLEAN DEFAULT 0,
  domain_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  flex_data TEXT
);
```

---

### 3. Payment Terms
**Endpoint:** `GET /payment-term`
**Records:** 13
**Purpose:** Define payment terms and credit card settings

**Database Schema:**
```sql
CREATE TABLE payment_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flex_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_by_user_id TEXT,
  flex_created_date TEXT,
  last_edit_user_id TEXT,
  flex_last_edit_date TEXT,
  grace_period INTEGER,
  credit_card BOOLEAN DEFAULT 0,
  domain_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  flex_data TEXT
);
```

---

### 4. Maintenance Procedures
**Endpoint:** `GET /maintenance-procedure`
**Records:** 5
**Purpose:** Track maintenance and repair procedures for equipment

**Database Schema:**
```sql
CREATE TABLE maintenance_procedures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flex_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  procedure_type TEXT,
  created_by_user_id TEXT,
  flex_created_date TEXT,
  last_edit_user_id TEXT,
  flex_last_edit_date TEXT,
  domain_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  flex_data TEXT
);
```

---

## Relationships

### Contact ↔ Resource Type
**Relationship:** Many-to-Many
- Each contact can have multiple resource types (Client, Venue, etc.)
- Stored in `contacts.resource_types` as JSON array

### Resource Type Hierarchy
**Relationship:** Self-referential
- Some resource types have parent types
- `parentTypeId` references another resource type

---

## Implementation Plan

### Phase 1: Core Reference Data ✅
- [x] Contacts with full details (1,699 records)

### Phase 2: Reference Tables 🔄
- [ ] Resource Types (20 records) - Classification system
- [ ] Payment Terms (13 records) - Financial terms
- [ ] Maintenance Procedures (5 records) - Service procedures

### Phase 3: Future Expansion 📋
Based on common Flex functionality, potential future endpoints:
- Inventory items (equipment, rentals)
- Projects/Work orders
- Business locations
- Users/System accounts
- Orders and quotes
- Tags and categories

---

## Sync Strategy

### For Reference Data (Resource Types, Payment Terms, etc.)
```javascript
// Simple full sync - small datasets, rarely change
async function syncReferenceData(endpoint, tableName) {
  const response = await api.get(endpoint);
  const records = Array.isArray(response.data)
    ? response.data
    : response.data.content;

  for (const record of records) {
    upsertRecord(tableName, record);
  }
}
```

### For Large Datasets (Contacts, Items, etc.)
```javascript
// Paginated sync with full details
async function syncLargeDataset(listEndpoint, detailEndpoint, tableName) {
  // 1. Fetch all IDs from list
  const ids = await fetchAllIds(listEndpoint);

  // 2. Fetch full details for each
  for (const id of ids) {
    const fullData = await api.get(`${detailEndpoint}/${id}`);
    upsertRecord(tableName, fullData);

    // Rate limiting
    await sleep(120);
  }
}
```

---

## Database File Structure

```
data/
├── contacts.db          # Main database (current)
│   ├── contacts         # 1,699 records ✅
│   ├── resource_types   # 20 records (to add)
│   ├── payment_terms    # 13 records (to add)
│   ├── maintenance_procedures  # 5 records (to add)
│   └── sync_log         # Sync history
```

---

## API Rate Limiting

**Current Settings:**
- Rate: ~8 requests/second (120ms delay)
- Timeout: 30 seconds
- Retry: 3 attempts with exponential backoff
- Batch size: 100 records per page

**Observed Limits:**
- ✅ No rate limiting detected at 7 req/sec
- ✅ Conservative setting of 8 req/sec is safe
- ✅ Zero errors in 1,700+ contact sync

---

## Next Steps

1. **Create reference data tables**
   - Add resource_types table
   - Add payment_terms table
   - Add maintenance_procedures table

2. **Create sync scripts**
   - sync-resource-types.js
   - sync-payment-terms.js
   - sync-maintenance-procedures.js

3. **Update main sync**
   - Create sync-all.js to run all syncs
   - Add relationship validation

4. **Create query tools**
   - Enhanced query-contacts.js with resource type filtering
   - New query scripts for reference data

---

## API Documentation Notes

Based on discovered patterns:

**List Endpoints:**
- Return paginated results with `totalElements`
- Support `page` and `size` parameters
- Basic fields only (9-11 fields)

**Detail Endpoints:**
- Pattern: `/{entity}/{id}`
- Full record with 60+ fields
- Includes relationships as nested objects/arrays

**Domain IDs:**
- All entities have a `domainId` field
- Examples: "contact", "resource-type", "payment-term"
- Useful for entity type identification
