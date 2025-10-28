# Changelog

## v1.1.48
- Added regression tests for the rhythmic count-off spelling rules that convert sequences such as `1 2 3 4` into `One Two Three Four` while tidying comma spacing.
- Verified the new o'clock normalisation logic that converts `3 o clock` into `three o'clock` without altering already-correct phrases.
- Ensured aggressive number handling still respects contextual safeguards (like times and o'clock phrases) while collapsing standalone words such as "twenty one" into numerals.
