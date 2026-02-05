# Flex Contacts Sync

Sync contact data from Flex Rental Solutions API to a local SQLite database.

## Features

- ✅ Sync all contacts from Flex API to SQLite
- ✅ Automatic upsert (insert new, update existing)
- ✅ Comprehensive logging with Winston
- ✅ Error handling and retry logic with exponential backoff
- ✅ Sync history tracking
- ✅ Rate limit handling
- ✅ Full JSON data storage for each contact

## Prerequisites

- Node.js 16.0 or higher
- Flex Rental Solutions API key
- Access to Flex5 instance

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd flex-contacts-sync
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Flex API credentials:
   ```
   FLEX_API_KEY=your-api-key-here
   FLEX_BASE_URL=https://yoursite.flexrentalsolutions.com/f5/api
   ```

## Getting Your API Key

1. Log into your Flex5 instance
2. Navigate to **Main Menu > Integrations > API**
3. Accept the Terms of Service (first time only)
4. Click **Add API Key**
5. Enter a description (e.g., "Contact Sync")
6. Copy the generated API key to your `.env` file

## Usage

### Run a full contact sync

```bash
npm start
```

This will:
1. Connect to Flex API
2. Fetch all contacts
3. Insert new contacts or update existing ones
4. Log sync statistics

### Development mode with auto-reload

```bash
npm run dev
```

## Project Structure

```
flex-contacts-sync/
├── src/
│   ├── api/
│   │   └── flexApi.js          # Flex API client with retry logic
│   ├── database/
│   │   ├── schema.js           # Database schema and initialization
│   │   └── operations.js       # CRUD operations
│   ├── services/
│   │   └── syncService.js      # Main sync orchestration
│   └── utils/
│       └── logger.js           # Winston logger configuration
├── data/
│   └── contacts.db             # SQLite database (auto-created)
├── logs/
│   ├── app.log                 # Application logs
│   └── error.log               # Error logs
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── index.js                    # Application entry point
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## Database Schema

### contacts table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-increment primary key |
| contact_id | TEXT | Unique Flex contact ID |
| first_name | TEXT | Contact first name |
| last_name | TEXT | Contact last name |
| contact_type | TEXT | Individual, Company, etc. |
| status | TEXT | Active, Inactive |
| default_bill_to_contact_id | TEXT | Default billing contact |
| pricing_model_id | TEXT | Associated pricing model |
| flex_data | TEXT | Full JSON data from API |
| created_at | DATETIME | Record creation timestamp |
| updated_at | DATETIME | Last update timestamp |

### sync_log table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-increment primary key |
| sync_started_at | DATETIME | Sync start time |
| sync_completed_at | DATETIME | Sync completion time |
| records_fetched | INTEGER | Number of records fetched |
| records_inserted | INTEGER | Number of new records |
| records_updated | INTEGER | Number of updated records |
| status | TEXT | success, failed, partial |
| error_message | TEXT | Error details if failed |
| created_at | DATETIME | Log entry timestamp |

## Querying the Database

You can query the SQLite database directly:

```bash
# Open database in SQLite CLI
sqlite3 data/contacts.db

# Count total contacts
SELECT COUNT(*) FROM contacts;

# View recent contacts
SELECT contact_id, first_name, last_name, status
FROM contacts
ORDER BY updated_at DESC
LIMIT 10;

# View sync history
SELECT * FROM sync_log ORDER BY created_at DESC LIMIT 5;

# Export to CSV
.mode csv
.output contacts.csv
SELECT * FROM contacts;
.quit
```

## API Rate Limits

Flex5 API has the following rate limits:
- **Monthly:** 100,000 requests (250,000 with upgrade)
- **Daily:** Monthly limit / 10
- **Hourly:** Monthly limit / 50
- **Concurrent:** 30 simultaneous requests

The application handles rate limits with:
- Exponential backoff retry logic
- Request throttling
- Error logging for 429 responses

## Error Handling

The application handles various error scenarios:
- **401 Unauthorized:** Invalid API key
- **404 Not Found:** Resource doesn't exist
- **429 Too Many Requests:** Rate limit exceeded (auto-retry)
- **Network errors:** Connection issues (auto-retry)
- **Database errors:** Transaction rollback

All errors are logged to:
- Console (with colors)
- `logs/app.log`
- `logs/error.log` (errors only)

## Logging

Logs are stored in the `logs/` directory:
- **app.log** - All application logs (info, warn, error)
- **error.log** - Error logs only

Configure log level in `.env`:
```
LOG_LEVEL=info   # Options: error, warn, info, debug
```

## Development

### VS Code Setup

1. Open project in VS Code:
   ```bash
   code ~/Documents/CoWork\ Output/flex-contacts-sync
   ```

2. Recommended extensions:
   - ESLint
   - Prettier
   - SQLite Viewer
   - GitLens

3. Use integrated terminal for npm commands

### Adding Features

The modular structure makes it easy to extend:
- **New API endpoints:** Add to `src/api/flexApi.js`
- **New database operations:** Add to `src/database/operations.js`
- **New sync strategies:** Add to `src/services/syncService.js`

## Future Enhancements

Potential improvements:
- [ ] Sync other entities (financial documents, inventory)
- [ ] Incremental sync (only changed records)
- [ ] Scheduled sync with cron
- [ ] Web dashboard for monitoring
- [ ] Export to CSV/Excel
- [ ] Multi-tenant support
- [ ] GraphQL API wrapper

## Troubleshooting

### "FLEX_API_KEY must be set"
- Ensure `.env` file exists
- Verify API key is correct
- Check no extra spaces in `.env` values

### "Authentication failed: Invalid API key"
- Verify API key is active in Flex5
- Check API key hasn't been revoked
- Ensure correct Flex instance URL

### "Rate limit exceeded"
- Wait for rate limit reset (check hourly/daily limits)
- Consider adding delays between sync operations
- Upgrade Flex plan for higher limits

### Database locked errors
- Ensure only one sync process is running
- Check no other programs have database open

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT

## Support

For issues related to:
- **This application:** Create a GitHub issue
- **Flex API:** Contact Flex Rental Solutions support
- **API documentation:** See Flex API Getting Started Guide

## Changelog

### Version 1.0.0 (2026-02-05)
- Initial release
- Contact sync functionality
- SQLite storage
- Comprehensive logging
- Error handling and retry logic
