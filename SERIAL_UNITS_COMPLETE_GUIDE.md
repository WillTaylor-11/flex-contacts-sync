# Complete Serial Units Sync Guide

## Overview

This system fetches **complete serial unit data** from the Flex API in two steps:

1. **Step 1**: Get list of all serial units from `/serial-unit/node-list?modelId={id}`
2. **Step 2**: Get detailed data for each unit from `/serial-unit/{serialUnitId}`

## API Endpoints

### Endpoint 1: Serial Unit List (by Model)
```
GET /serial-unit/node-list?modelId={inventoryModelId}
```

**Returns**: Array of serial units for a specific inventory model
- Basic info: id, name, barcode, stencil, serial, location
- Used to discover all serial unit IDs

### Endpoint 2: Serial Unit Detail
```
GET /serial-unit/{serialUnitId}
```

**Returns**: Complete details for a single serial unit
- All fields from list endpoint PLUS:
- Financial data (replacement cost, purchase cost, depreciation)
- User tracking (created by, last edited by)
- Maintenance schedule data
- Full audit trail
- Complete notes and descriptions

## Database Schema

The `serial_units` table stores both list and detail data:

### Key Fields
- `flex_id` - Unique serial unit ID
- `name` - Full display name
- `barcode` - Asset barcode/tag
- `serial` - Serial number
- `stencil` - Stencil/asset number
- `inventory_model_id` - Parent inventory model

### Detail Fields (from Step 2)
- `replacement_cost`, `purchase_cost`, `salvage_value`
- `rfid_tag`, `notes`, `short_name`
- `scheduled_maintenance_enabled`, `last_maintenance_date`
- `created_by_user_id`, `last_edit_user_id`
- Many more...

### Tracking Fields
- `detail_fetched` - 0 = only list data, 1 = has detail data
- `detail_fetch_date` - When detail was fetched
- `flex_list_data` - JSON from list endpoint
- `flex_detail_data` - JSON from detail endpoint

## Important: API Rate Limit

**The Flex API has a hard limit of 2,000 requests per hour.**

Error message when limit is hit:
```json
{
  "exceptionMessage": "Maximum API request limit of 2,000 reached for this hour.",
  "httpStatusCode": 429
}
```

### What This Means

With 2,700 inventory models:
- **Step 1**: ~2,700 requests (one per model) = **Rate limited**
- **Step 2**: N requests (one per serial unit found)

**You WILL hit rate limits during a full sync.**

The scripts are designed to:
1. Stop gracefully when rate limited
2. Save progress to database
3. Allow you to resume later

## Running the Sync

### Option 1: Complete Two-Step Sync (Recommended)

**Script**: `sync-serial-units-full.js`

Runs both steps automatically:
```bash
node sync-serial-units-full.js
```

**What it does**:
1. Fetches serial unit lists for all models (Step 1)
2. Immediately fetches details for each unit found (Step 2)
3. Stops gracefully if rate limited
4. Shows exactly where it stopped

**When to use**: First sync, or when you want everything

### Option 2: List Only (Fast)

**Script**: `sync-serial-units-slow.js`

Only runs Step 1 (lists):
```bash
node sync-serial-units-slow.js
```

**What it does**:
- Gets serial unit IDs and basic info only
- Faster (fewer requests)
- Sets `detail_fetched = 0` for all units

**When to use**:
- Just want to know what serial units exist
- Will fetch details later in batches

### Option 3: Details Only (Resume)

**Script**: `sync-serial-units-details.js`

Only runs Step 2 (details):
```bash
node sync-serial-units-details.js
```

**What it does**:
- Finds all serial units with `detail_fetched = 0`
- Fetches detail data for each
- Updates `detail_fetched = 1`
- Stops gracefully if rate limited

**When to use**:
- Already have serial unit lists
- Resuming after rate limit
- Want to re-fetch details for updated data

## Recommended Workflow

### Initial Sync (Expect Rate Limits)

1. **Run the full sync:**
   ```bash
   node sync-serial-units-full.js
   ```

2. **When rate limited (it will be):**
   - Script stops and shows progress
   - Wait 1 hour
   - Run again to continue

3. **After Step 1 completes, fetch remaining details:**
   ```bash
   node sync-serial-units-details.js
   ```

4. **Check progress:**
   ```bash
   node query-serial-units.js
   ```

### Multi-Day Approach (Safest)

**Day 1 - Morning**: Run list sync
```bash
node sync-serial-units-slow.js
```
- Gets ~2,000 models before rate limit
- Sets baseline

**Day 1 - Afternoon**: Resume list sync
```bash
node sync-serial-units-slow.js
```
- Gets remaining ~700 models
- Now have all serial unit IDs

**Day 2+**: Fetch details in batches
```bash
node sync-serial-units-details.js
```
- Run multiple times throughout the day
- Each run gets ~2,000 unit details
- Repeat until `detail_fetched = 0` count is zero

## Query and Verify

### Check Status
```bash
node query-serial-units.js
```

Shows:
- Total serial units in database
- How many have details vs. lists only
- Breakdown by model

### SQL Queries

```sql
-- Total count
SELECT COUNT(*) FROM serial_units;

-- Units with details
SELECT COUNT(*) FROM serial_units WHERE detail_fetched = 1;

-- Units without details
SELECT COUNT(*) FROM serial_units WHERE detail_fetched = 0;

-- Serial units by model
SELECT
  inventory_model_name,
  COUNT(*) as unit_count,
  SUM(detail_fetched) as with_details
FROM serial_units
GROUP BY inventory_model_name
ORDER BY unit_count DESC;
```

## Configuration

All scripts have configurable delays in the `CONFIG` object:

```javascript
const CONFIG = {
  delayBetweenRequests: 300,    // ms between requests (slower = safer)
  delayAfter429: 10000,          // ms to wait after rate limit hit
  maxRetries: 3,                 // retry attempts for failed requests
  batchSize: 25                  // progress update frequency
};
```

**Increase delays if you still hit rate limits:**
- Change `delayBetweenRequests` to 500ms or 1000ms
- Change `delayAfter429` to 30000ms (30 seconds)

## Troubleshooting

### Problem: Still hitting rate limits immediately

**Cause**: You recently ran a sync that made 2,000+ requests

**Solution**: Wait a full hour from when you last hit the limit

---

### Problem: 404 errors on detail endpoint

**Cause**: Some serial units may not have detail endpoints, or were deleted

**Solution**: This is normal, the script tracks these as `not_found` errors

---

### Problem: Want to re-fetch details for specific units

**Solution**: Update the `detail_fetched` flag to 0:
```sql
UPDATE serial_units
SET detail_fetched = 0
WHERE barcode = 'SOME_BARCODE';
```

Then run:
```bash
node sync-serial-units-details.js
```

---

### Problem: Need to sync only specific models

**Solution**: Modify query in sync script:
```javascript
const models = db.prepare(`
  SELECT flex_id, name, barcode
  FROM inventory_models
  WHERE name LIKE '%Rack%'  -- Only racks
`).all();
```

## Files Created

| File | Purpose |
|------|---------|
| **Sync Scripts** | |
| [sync-serial-units-full.js](sync-serial-units-full.js) | Complete two-step sync (list + details) |
| [sync-serial-units-slow.js](sync-serial-units-slow.js) | List-only sync (Step 1 only) |
| [sync-serial-units-details.js](sync-serial-units-details.js) | Details-only sync (Step 2 only) - **Resume script** |
| **Query Scripts** | |
| [query-serial-units.js](query-serial-units.js) | View database contents |
| **Test Scripts** | |
| [test-serial-unit-detail.js](test-serial-unit-detail.js) | Test detail endpoint |
| **Database** | |
| [src/database/schema.js](src/database/schema.js) | Updated with detail fields |
| [src/database/operations.js](src/database/operations.js) | Added detail functions |

## Database Operations

New functions in [src/database/operations.js](src/database/operations.js):

```javascript
// Upsert serial unit from list endpoint
upsertSerialUnit(serialUnitData)

// Update with detail endpoint data
updateSerialUnitDetail(flexId, detailData)

// Get units needing details
getSerialUnitsWithoutDetail(limit)
getSerialUnitsWithoutDetailCount()
```

## Summary

✅ **Database schema updated** with all detail fields
✅ **Two-step sync process** implemented
✅ **Three sync scripts** for different scenarios
✅ **Rate limit handling** with graceful stops
✅ **Resume capability** via detail_fetched flag
✅ **Only uses GET requests** (never POST)

**To start syncing:**
1. Wait for API rate limit to reset (check time since last 429 error)
2. Run `node sync-serial-units-full.js`
3. Resume with `node sync-serial-units-details.js` after rate limits

**Expected timeline**: 2-3 days to fetch all serial units with full details (due to 2,000 requests/hour limit)
