# Changelog

## v1.1.86
- Apply the auto-lowercase option before all other formatting while preserving tags and backing-vocal parentheses.
- Lowercase the main vocal text immediately after a backing-vocal split unless the word is an exception.
- Bump the userscript, extension, and package metadata to the 1.1.86 release.

## v1.1.84
- Normalize key phrases like "nighttime", "one-night-stand", and "very, very" while enforcing capitalization for "Jesus" and "Christ".
- Bump the userscript, extension, and package metadata to the 1.1.84 release.

## v1.1.81
- Refresh the floating format button with Musixmatch Formatter blue and gold theming plus a subtle click glow animation.
- Bump the userscript, extension, and package metadata to the 1.1.81 release.

## v1.1.80
- Wire the extension manifest to the bundled blue icon set so browser menus display the correct artwork.
- Bump the userscript, extension, and package metadata to the 1.1.80 release.

## v1.1.78
- Prevent the syllable normalizer from merging across lines by ignoring matches that include newlines and tightening the match pattern.
- Bump the userscript, extension, and package metadata to the 1.1.78 release.

## v1.1.77
- Remove the comma/quote spacing collapse that merged lines ending with punctuation into the next quoted line.
- Bump the userscript, extension, and package metadata to the 1.1.77 release.

## v1.1.76
- Update project licensing to Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International.
- Bump the userscript, extension, and package metadata to the 1.1.76 release.

## v1.1.73-internal.14
- Preserve apostrophe spacing fixes while tightening the punctuation callback so closing quotes (", ', ”, ’) stay attached to
  their punctuation without triggering the apostrophe letter guard.
- Limit the comma/quote normalizer to touch only the next non-space character so embedded whitespace inside quotes remains
  intact.
- Bump the userscript, extension, and package metadata to the 1.1.73-internal.14 build.

## v1.1.73-internal.13
- Prevent the punctuation-spacing cleanup from inserting spaces before closing quotes when commas precede them.
- Bump the userscript, extension, and package metadata to the 1.1.73-internal.13 build.

## v1.1.73-internal.12
- Re-run the formatter automatically when Musixmatch Studio swaps SPA routes by listening for URL mutations and re-applying the
  initialization logic.
- Gate the floating controls behind the edit route, including new Tampermonkey `@include` entries and a safety flag to avoid
  injecting duplicate UI on successive tasks.
- Bump the userscript, extension, and package metadata to the 1.1.73-internal.12 build.

## v1.1.73
- Restore canonical capitalization for a curated set of brands, locations, and acronyms using a static helper.
- Run the proper-noun normalization after backing-vocal lowercasing so parentheses stay fixed.
- Bump the userscript, extension, and package metadata to reflect the 1.1.73 release.

## v1.1.72
- Limit parenthetical title-casing to lines that begin with "(" so inline parentheses remain untouched.
- Rework backing vocal normalization with dictionary-driven proper noun handling gated by the BV toggle.
- Bump the userscript, extension, and package metadata to reflect the 1.1.72 release.
- Skip CSV-driven language replacements and BV lowercasing when formatting Russian lyrics so Cyrillic text stays intact.
- Use Unicode-aware capitalization after exclamation and question marks to keep Cyrillic letters from being skipped.

## v1.1.70
- Correct Christmas spellings, title-case proper nouns in backing vocal parentheses, and lowercase interjection syllables.
- Collapse duplicate structure headers and reduce excessive blank lines so tags stay unique.
- Bump the userscript, extension, and package metadata to reflect the 1.1.70 release.

## v1.1.69
- Extend the Russian structure tag map with bridge, pre-chorus, and hook synonyms to cover common Musixmatch variants.
- Normalize Russian section headings that include performer names, numbering, or brackets so they convert to canonical tags.
- Preserve em dashes for Russian lyrics while continuing to normalize dashes for other languages.
- Bump the userscript, extension, and package metadata to reflect the 1.1.69 release.

## v1.1.68
- Load dropped-G exclusions from a shared Google Sheets CSV with local caching so the list stays synced for the team.
- Bump the userscript, extension, and package metadata to reflect the 1.1.68 release.

## v1.1.67
- Normalize holiday and festive references (including inside parentheses) so phrases like "christmas eve" and
  "new-years day" become consistently capitalized forms.
- Capitalize proper names and title phrases inside parentheses while respecting common lowercase exceptions such as
  "of" and "the".
- Bump the userscript, extension, and package metadata to reflect the 1.1.67 release.

## v1.1.66
- Normalize repeated syllables like "na na na" and "nananana" into dashed groups while preserving capitalization after
  line-ending punctuation.
- Bump the userscript, extension, and package metadata to reflect the 1.1.66 release.

## v1.1.65
- Normalize AM/PM meridian variants to consistently output "a.m." and "p.m." using the formatter pipeline.
- Bump the userscript, extension, and package metadata to reflect the 1.1.65 release.

## v1.1.64
- Recorded the MIT license metadata and bumped the package version for the 1.1.64 release.

## v1.1.63
- Added localized language profiles so the formatter can translate section labels and respect script-specific casing rules.
- Limited Cyrillic "e" transliteration to Latin-script profiles while leaving Cyrillic and Greek stanzas untouched.
- Bumped the userscript, extension, and package metadata to reflect the 1.1.63 release.

## v1.1.58
- Restore single-pass instrumental section normalization and apply structure tag spacing earlier in the pipeline so stanza
  boundaries remain stable.
- Drop redundant newline sanitization and other late-stage reprocessing to keep the formatter idempotent.
- Bump the userscript, extension, and package metadata to reflect the 1.1.58 release.

## v1.1.55
- Expanded the dropped-G exclusions with rhyme-based terms like "rain" and "train" to avoid false positives.
- Bumped the userscript, extension, and package metadata to reflect the 1.1.55 release.

## v1.1.54
- Expanded first-letter capitalization and backing vocal casing rules to respect lowercase Unicode letters (e.g., Cyrillic and Greek) using locale-aware transforms.
- Bumped the userscript, extension, and package metadata to reflect the 1.1.54 release.

## v1.1.53
- Refined backing vocal parenthetical casing to respect proper nouns and preserve leading exceptions like I/I'm/I'ma.
- Bumped the userscript, extension, and package metadata to reflect the new release.

## v1.1.52
- Tightened dropped-G handling so bare "-in" words receive apostrophes while protecting exclusions like "begin" and "violin".
- Bumped the userscript, extension, and package metadata to reflect the new release.

## v1.1.51
- Improved dropped-G detection so longer "-in" words receive smart apostrophes with accurate casing.
- Normalized structure tags that include optional numbering (e.g., "Verse 2", "Chorus 3") without leaving blank lines.
- Bumped the userscript, extension, and package metadata to reflect the new release.

## v1.1.50
- Trim and normalize multiple backing-vocal parentheticals per line while preserving the capitalized "I" pronoun.
- Bump the userscript, extension, and package metadata to reflect the new release.
- 
- Merged the r2 local edits into the public userscript so standalone parenthetical lines keep their original spacing and casing when restored.
- Updated sentence ender capitalization to skip over nested parentheses and quotation marks before uppercasing the following lyric.
- Relaxed aggressive punctuation cleanup so quote spacing and repeated commas are left untouched unless absolutely required.

## v1.1.48
- Added regression tests for the rhythmic count-off spelling rules that convert sequences such as `1 2 3 4` into `One Two Three Four` while tidying comma spacing.
- Verified the new o'clock normalisation logic that converts `3 o clock` into `three o'clock` without altering already-correct phrases.
- Ensured aggressive number handling still respects contextual safeguards (like times and o'clock phrases) while collapsing standalone words such as "twenty one" into numerals.
