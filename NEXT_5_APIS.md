# Next 5 APIs to Pull from Flex

## ✅ Already Complete (4 APIs)
1. **Contacts** - 1,600 records with full details
2. **Resource Types** - 20 classification types
3. **Payment Terms** - 13 payment options
4. **Maintenance Procedures** - 5 procedures

---

## 🎯 NEXT 5 TO PULL (In Priority Order)

### 1. **Business Locations** 🏆 TOP PRIORITY
- **Endpoint:** `GET /business-location` (list) and `GET /business-location/{id}` (detail)
- **Status:** ✅ **CONFIRMED WORKING**
- **Why First:** Referenced by 150 contacts in `homebase_location_id` field
- **Expected Data:**
  - Location name and code
  - Address information
  - Warehouse/facility details
  - Onsite information
  - Associated contacts

**Next Step:** Create sync script for business locations

---

### 2. **Pricing Models** 💰 HIGH PRIORITY
- **Endpoint:** `GET /pricing-model` (to discover)
- **Why:** Referenced in contacts (`default_pricing_model_id`)
- **Expected Data:**
  - Pricing tiers
  - Rate structures
  - Discount models
  - Price calculations

---

### 3. **Tax Rules** 📋 HIGH PRIORITY
- **Endpoint:** `GET /tax-rule` (to discover)
- **Why:** Referenced in contacts (`standard_tax_rule_id`) and payment terms
- **Expected Data:**
  - Tax rates
  - Tax jurisdictions
  - Taxable item rules
  - Tax calculations

---

### 4. **Currency** 💵 MEDIUM PRIORITY
- **Endpoint:** `GET /currency` (to discover)
- **Why:** Referenced in contacts (`currency_id`)
- **Expected Data:**
  - Currency codes (USD, EUR, etc.)
  - Exchange rates
  - Display formats

---

### 5. **Discount Models** 🎟️ MEDIUM PRIORITY
- **Endpoint:** `GET /discount-model` (to discover)
- **Why:** Referenced in contacts (`standard_discount_id`)
- **Expected Data:**
  - Discount types (percentage, fixed)
  - Discount rules
  - Eligibility criteria

---

## 🔍 Discovery Method

Since direct endpoint listing isn't available, we're using:
1. **Entity ID References** - Following foreign keys in existing data
2. **Resource Type Hints** - Classes mentioned in resource types
3. **Pattern Testing** - Common REST API patterns

---

## 📊 Data Relationships Found

```
Contacts (1,600)
├─→ Business Locations (via homebase_location_id) ✅ FOUND
├─→ Pricing Models (via default_pricing_model_id)
├─→ Tax Rules (via standard_tax_rule_id)
├─→ Currencies (via currency_id)
├─→ Discount Models (via standard_discount_id)
├─→ Payment Terms (via standard_terms_id) ✅ DONE
└─→ Other Contacts (via employer_id) ✅ ALREADY IN DB
```

---

## 🚀 Immediate Action: Business Locations

**Business Locations is confirmed and ready to sync!**

To get count:
```bash
curl -H "X-Auth-Token: $FLEX_API_KEY" \
  "$FLEX_BASE_URL/business-location?size=1" | jq '.totalElements'
```

Expected fields (from test):
- id, imageId, name, locationCode, onsite, and more

---

## 📝 Sync Order Recommendation

**Phase 1 - Financial Reference Data:**
1. Business Locations (confirmed working)
2. Pricing Models (discover)
3. Tax Rules (discover)
4. Currency (discover)
5. Discount Models (discover)

**Phase 2 - Transactional Data** (future):
- Once we discover the endpoints for:
  - Inventory items (equipment)
  - Orders/Projects (rentals)
  - Users (who created/modified records)

---

## 🔧 Implementation Plan

### Step 1: Sync Business Locations (NOW)
```javascript
// Create sync-business-locations.js
// Follow same pattern as sync-all-data.js
// Fetch list, then fetch details for each location
```

### Step 2: Discover Remaining Endpoints
```javascript
// Test common patterns:
- /pricing-model
- /pricing-model-instance
- /tax-rule
- /tax-rate
- /currency
- /discount
- /discount-model
```

### Step 3: Update Database Schema
```sql
ALTER TABLE contacts ADD REFERENCES...
CREATE TABLE business_locations...
CREATE TABLE pricing_models...
```

---

## 💡 Key Insight

**The Flex API exposes reference data more readily than transactional data.**

This makes sense for a rental management system:
- ✅ Contacts (customers/vendors)
- ✅ Locations (warehouses)
- ✅ Pricing/Payment/Tax rules
- ❓ Inventory (equipment) - may require special permissions
- ❓ Orders/Rentals - may require special permissions

The reference data we can access provides the foundation for understanding the business structure.
