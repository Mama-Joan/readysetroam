# ChatGPT import (v1)

Open the deployed app root with a fragment: `#import=` followed by encodeURIComponent(JSON.stringify({version:1,trip})). The trip must conform to src/lib/types.ts. Required arrays must be present, even when empty. Use stable URL-safe IDs and ISO dates. Unknown bookings must not be marked booked. Never include private confirmation numbers or sensitive data in links: fragments are not encrypted and may remain in history or be shared.

For large trips use Import AI trip and paste or upload the same JSON. The preview requires explicit confirmation. Duplicate IDs can only be saved as a separate copy in v1; existing trips are not overwritten. Export files containing multiple trips are not supported by this importer.

## Verification before merge
- Run npm ci and npm run build on Node 22.
- Open the app locally, create a test trip, then import a different valid trip using the fragment.
- Confirm preview does not write until Add to my trips is clicked; cancel leaves storage unchanged.
- Reload and verify both trips and seeded trips remain.
- Import the same ID again; save as separate copy and verify the original is unchanged.
- Try malformed JSON, invalid dates, invalid coordinates, missing place references and javascript: links; verify rejection.
- Test paste and file fallback, storage quota failure, and links on mobile.
- Verify the production base path and browser navigation after save.
- Do not merge until these checks pass.
