# Changelog

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
