# Changelog

## v1.1.52
- Clean and capitalize standalone parenthetical lines before preservation so they reinsert tidily.
- Standardize spacing after question or exclamation marks when followed by quotes or parentheses.
- Tighten final safety passes for quote-prefixed parentheses and stray spaces before closing brackets.

## v1.1.51
- Make post-? and post-! capitalization resilient to intervening quotes, parentheses, and whitespace.
- Keep parenthetical capitalization intact when the preceding punctuation is a question or exclamation mark.
- Ensure stanza endings of "oh", "ah", or "uh" retain exactly one blank line before the following structure tag.

## v1.1.50
- Restore the blank line before structure tags after interjections by removing the special-case collapse for "oh" and "uh" endings.
- Continue honouring the spacing rules that keep dedicated gaps after endings such as "yeah", "whoa", "huh", or a closing parenthesis.

## v1.1.49
- Ensure stanza endings of "oh" or "uh" butt directly against the following structure tag instead of retaining an empty separator line.
- Keep dedicated structure-tag spacing for stanzas ending in "yeah", "whoa", "huh", or closing parentheses.

## v1.1.48
- Added regression tests for the rhythmic count-off spelling rules that convert sequences such as `1 2 3 4` into `One Two Three Four` while tidying comma spacing.
- Verified the new o'clock normalisation logic that converts `3 o clock` into `three o'clock` without altering already-correct phrases.
- Ensured aggressive number handling still respects contextual safeguards (like times and o'clock phrases) while collapsing standalone words such as "twenty one" into numerals.
