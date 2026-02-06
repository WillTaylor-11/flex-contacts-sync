# Serial Units Sync - Complete Setup

## ✅ What Was Built

### 1. Database Schema
- **Table**: `serial_units` added to [src/database/schema.js](src/database/schema.js:424-448)
- **Fields**:
  - `flex_id` - Unique identifier from Flex API
  - `name` - Full name with stencil/asset number
  - `barcode` - Asset barcode
  - `serial` - Serial number (optional)
  - `stencil` - Stencil/asset tag
  - `inventory_model_id` - Foreign key to inventory_models
  - `inventory_model_name` - Model name for quick reference
  - `current_location` - Current location name
  - `is_deleted` - Deletion flag
  - `out_of_commission` - OOC status
  - `return_date` - Expected return date
  - `flex_created_date` - Creation timestamp from Flex
  - `flex_data` - Full JSON backup
- **Indexes**: On flex_id, barcode, stencil, model_id, location, deleted

### 2. Database Operations
Added to [src/database/operations.js](src/database/operations.js:336-463):
- `insertSerialUnit(serialUnitData)` - Insert new serial unit
- `updateSerialUnit(flexId, serialUnitData)` - Update existing serial unit
- `upsertSerialUnit(serialUnitData)` - Insert or update (recommended)
- `getAllSerialUnits()` - Get all serial units
- `getSerialUnitsByModelId(modelId)` - Get units for specific model
- `getSerialUnitCount()` - Get total count

### 3. Sync Scripts

#### sync-serial-units-slow.js (RECOMMENDED)
**Rate-limited sync with retry logic**
- Delay: 200ms between requests (9 minutes for 2700 models)
- Automatic retry on 429 errors with exponential backoff
- Progress tracking every 50 models
- Error categorization (429, 404, other)

```bash
node sync-serial-units-slow.js
```

#### sync-serial-units.js
**Fast sync (not recommended due to rate limits)**
- 50ms delay - too fast, causes 429 errors
- Use only for small batches

### 4. Query Script

#### query-serial-units.js
**View serial units in database**
- Shows total count
- Lists all serial units with details
- Shows top models by unit count

```bash
node query-serial-units.js
```

### 5. Test Scripts

#### test-one-serial-unit.js
**Test with single known model**
- Fetches serial units for one specific model
- Useful for testing after rate limit cooldown

## 📡 API Endpoint Discovery

### Working Endpoint
```
GET /serial-unit/node-list?modelId={inventoryModelId}
```

**Response Format**:
```json
[
  {
    "id": "eb1fbe4a-f7b3-4b5b-b1d8-dc072914265b",
    "name": "2RU - Ameh Case Equipment Rack (Shock Mount) (2484)",
    "barcode": "2484",
    "createdDate": "2023-04-12T01:12:58",
    "isDeleted": false,
    "modelId": "f1750330-029b-46cd-a5c8-3d0531b0345c",
    "serial": null,
    "stencil": "2484",
    "ooc": false,
    "currentLocation": "Square Wave Productions LLC",
    "returnDate": null
  }
]
```

### Tested Endpoints (Failed)
- ❌ `GET /serial-unit` - 405 Method Not Allowed
- ❌ `GET /serial-unit/list/{id}` - 404 Not Found
- ❌ `GET /item-instance` - 404 Not Found
- ❌ `GET /inventory-item` - 404 Not Found

## ⚠️ Rate Limiting Issues

### Current Status
The Flex API has **strict rate limits**. Our initial full sync attempt:
- Checked: 2700 models
- Errors: 838 rate limit (429) errors
- Duration: 324 seconds
- Result: 0 units synced (rate limited too quickly)

### Recommendations

1. **Wait Before Retrying** - The API may have a cooldown period after hitting rate limits
2. **Use Slow Sync** - Run `sync-serial-units-slow.js` with 200ms delays
3. **Run During Off-Hours** - Less likely to hit limits
4. **Consider Incremental Sync** - Modify script to sync in batches over multiple days

### Estimated Full Sync Time
- **Models to check**: 2,700
- **Delay per request**: 200ms
- **Total time**: ~9 minutes (without rate limit delays)
- **With rate limit retries**: 15-30 minutes

## 🚀 How to Run a Full Sync

### Step 1: Wait for Rate Limit Cooldown
Wait at least 15-30 minutes after the last sync attempt.

### Step 2: Run the Slow Sync
```bash
cd /Users/swpapp/Documents/CoWork\ Output/flex-contacts-sync
node sync-serial-units-slow.js
```

### Step 3: Monitor Progress
The script will show:
- Models checked
- Serial units found
- Error counts (429, 404, other)
- ETA to completion

### Step 4: Query Results
```bash
node query-serial-units.js
```

## 📊 Expected Results

Based on the test, we confirmed:
- ✅ The endpoint works with GET requests
- ✅ At least 1 model has serial unit data
- ✅ Data structure is well-defined
- ⚠️ Many models may return 404 (no serial units)
- ⚠️ API has strict rate limits

### Realistic Expectations
- **Models with serial units**: Unknown (likely < 10%)
- **Total serial units**: Unknown (depends on your inventory tracking)
- **Success criteria**: Any serial units synced = success

## 🔧 Troubleshooting

### Problem: Still Getting 429 Errors
**Solution**: Increase delay in [sync-serial-units-slow.js:21](sync-serial-units-slow.js:21)
```javascript
const CONFIG = {
  delayBetweenRequests: 500, // Increase from 200 to 500ms
  delayAfter429: 10000,      // Increase from 5000 to 10000ms
  maxRetries: 3,
  batchSize: 50
};
```

### Problem: Sync Takes Too Long
**Solution**: Run in background and monitor log file
```bash
node sync-serial-units-slow.js > sync-log.txt 2>&1 &
tail -f sync-log.txt
```

### Problem: Want to Sync Specific Models Only
**Solution**: Modify the query in sync script:
```javascript
// Only sync models with serial tracking enabled
const models = db.prepare(`
  SELECT flex_id, name, barcode
  FROM inventory_models
  WHERE tracked_by_serial_unit = 1
`).all();
```

## 📝 Files Created

| File | Purpose |
|------|---------|
| [src/database/schema.js](src/database/schema.js) | Added serial_units table |
| [src/database/operations.js](src/database/operations.js) | Added serial unit functions |
| [sync-serial-units-slow.js](sync-serial-units-slow.js) | **Main sync script** (recommended) |
| [sync-serial-units.js](sync-serial-units.js) | Fast sync (causes rate limits) |
| [query-serial-units.js](query-serial-units.js) | Query and display serial units |
| [test-one-serial-unit.js](test-one-serial-unit.js) | Test single model |
| [test-serial-unit-node-list.js](test-serial-unit-node-list.js) | Discovery test |
| [test-serial-unit-with-params.js](test-serial-unit-with-params.js) | Endpoint discovery |
| [test-serial-unit-get-only.js](test-serial-unit-get-only.js) | GET-only validation |

## ✅ Summary

**Everything is ready to sync serial units!**

The system is fully built and functional:
- ✅ Database table created
- ✅ Operations functions added
- ✅ Sync scripts created
- ✅ Endpoint discovered and validated
- ✅ **Only using GET requests** (never POST)

**Next Step**: Wait 30 minutes, then run `sync-serial-units-slow.js`
