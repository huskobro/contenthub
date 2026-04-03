# Test Report — Phase 148: URL / Link Surface Safety & External Target Hygiene Pack

## Summary

Audited all URL/link rendering surfaces across the frontend. Fixed anchor null guard and rel attribute in NewsItemDetailPanel, added overflowWrap to SourceDetailPanel UrlField. Created 13 structural guard tests covering anchor hygiene, UrlField safety, unsafe href patterns, and form validation.

## Audit Results

**Link rendering surfaces found:** 2 primary locations
- `SourceDetailPanel.tsx` UrlField — renders base_url, feed_url, api_endpoint as raw text (already had null guard + wordBreak)
- `NewsItemDetailPanel.tsx` — renders data.url as clickable anchor

**Surfaces already safe (not touched):**
- All Field/Row components (overflow protected in Phase 147)
- All form URL inputs (native input overflow handling)
- Summary components (use URL as data signal, not rendered)
- No other `<a>` tags exist in components

## New Files
| File | Purpose |
|------|---------|
| `frontend/src/tests/url-link-safety.smoke.test.tsx` | 13 structural guard tests for anchor hygiene, UrlField safety, unsafe href patterns, form validation |

## Modified Files
| File | Change |
|------|--------|
| `NewsItemDetailPanel.tsx` | Added null guard (`data.url ?`) before anchor render; changed `rel="noreferrer"` to `rel="noopener noreferrer"` |
| `SourceDetailPanel.tsx` | Added `overflowWrap: "anywhere"` to UrlField value span for consistency |

## URL/Link Safety Improvements
- **Null guard**: NewsItemDetailPanel anchor now checks `data.url` before rendering `<a>` — prevents `<a href="undefined">undefined</a>`
- **rel attribute**: Updated from `rel="noreferrer"` to `rel="noopener noreferrer"` for maximum browser compatibility
- **Overflow**: SourceDetailPanel UrlField now has both `wordBreak: "break-all"` and `overflowWrap: "anywhere"`

## Test Results
- **13 new guard tests** in `url-link-safety.smoke.test.tsx`
  - 4 anchor hygiene tests (rel, target, null guard, overflow)
  - 1 scan-all-components test (no anchor without rel)
  - 4 UrlField safety tests (null guard, wordBreak, overflowWrap, fallback)
  - 2 unsafe href pattern tests (no javascript:, no href="#")
  - 2 form input validation tests
- **1184 total tests**, all passing (+13 new)
- **tsc**: clean (0 errors)
- **vite build**: clean

## What Was NOT Changed
- No link preview cards added
- No favicon/metadata preview added
- No URL normalization policy
- No new clickable links created (UrlField stays raw text)
- No badge styles touched
- No backend changes
- No business logic changes
