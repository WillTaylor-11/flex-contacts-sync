#!/usr/bin/env node

const { getDatabase } = require('../src/database/schema');

function showFinalSummary() {
  console.log('\n🎉 Flex API Sync Complete!\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();

  // Get counts for all tables
  const tables = [
    { name: 'elements', emoji: '📦' },
    { name: 'inventory_models', emoji: '🔨' },
    { name: 'contacts', emoji: '👤' },
    { name: 'inventory_groups', emoji: '📁' },
    { name: 'resource_types', emoji: '🏷️' },
    { name: 'payment_terms', emoji: '💳' },
    { name: 'pricing_models', emoji: '💰' },
    { name: 'maintenance_procedures', emoji: '🔧' },
    { name: 'standard_discounts', emoji: '🎟️' },
    { name: 'units_of_measure', emoji: '📏' },
    { name: 'business_locations', emoji: '🏢' }
  ];

  console.log('📊 Database Summary:\n');

  let totalRecords = 0;
  tables.forEach(table => {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    const count = result.count;
    totalRecords += count;

    const displayName = table.name.split('_').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');

    console.log(`   ${table.emoji}  ${displayName.padEnd(25)} ${String(count).padStart(5)} records`);
  });

  console.log('   ' + '-'.repeat(35));
  console.log(`   ✨  Total Records                  ${String(totalRecords).padStart(5)}`);

  // Show sync log summary
  const syncStats = db.prepare(`
    SELECT
      entity_type,
      MAX(sync_completed_at) as last_sync,
      SUM(records_fetched) as total_fetched,
      SUM(records_inserted) as total_inserted,
      SUM(records_updated) as total_updated
    FROM sync_log
    WHERE status = 'success'
    GROUP BY entity_type
    ORDER BY last_sync DESC
  `).all();

  console.log('\n' + '='.repeat(70));
  console.log('\n📅 Recent Sync Activity:\n');

  syncStats.slice(0, 5).forEach(stat => {
    const displayName = stat.entity_type.split('_').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');

    const date = new Date(stat.last_sync);
    const timeAgo = getTimeAgo(date);

    console.log(`   ${displayName.padEnd(30)} ${timeAgo.padStart(15)}`);
    console.log(`   ${''.padEnd(30)} ↳ ${stat.total_inserted} inserted, ${stat.total_updated} updated`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n📁 Database Location:\n');
  console.log(`   ${process.env.DB_PATH || './data/contacts.db'}\n`);

  console.log('📚 Documentation:\n');
  console.log('   • SYNC_COMPLETE_SUMMARY.md - Full sync summary\n');
  console.log('   • ACTUAL_AVAILABLE_APIS.md - API availability details\n');

  console.log('='.repeat(70));
  console.log('\n✅ All accessible Flex API data has been successfully synced!\n');
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

showFinalSummary();
