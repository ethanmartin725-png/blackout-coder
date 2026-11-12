# Device checklist

Chromium in CI covers phone, tablet and laptop widths (390, 412, 768, 1024 and 1366 px). It cannot
cover Safari, touch keyboards or real hardware. Before sharing widely, try these on each device
friends will use: a Windows laptop in Chrome or Edge, an iPhone in Safari, an Android phone in Chrome.

On each device:

1. Open the site in a private window. Start here should open by itself. Pick "I work with PLCs":
   PLC Ladder lesson 1 opens, ready to type.
2. Type lesson 1 to the end. Each line should turn green as it matches, and the done card should
   show. On a phone, check the on-screen keyboard does not hide the line being typed.
3. Reload. Start here should not open again, and the lesson should be where you left it.
4. Switch to Projects. The project tabs should be one row you can swipe sideways (on a phone), with
   the selected project in view.
5. Open a ladder lesson with a machine scene (PLC Ladder, "Feed after spin-up"), press Check, then
   Run. The jointer should animate, and the hold-to-press buttons should respond to a press and hold.
6. Open About and Report a problem. Report a problem should open GitHub's new-issue page in a new
   tab with the lesson in the title (signing in to GitHub is needed to submit).
7. Save progress, then Load progress from the saved file. On an iPhone the file goes to Files.
8. Turn Sound on and finish a lesson: a chime should play (iPhone: the silent switch mutes it).

9. Screen reader (NVDA with Chrome on Windows; VoiceOver with Safari on a Mac or iPhone): open a
   lesson at Student rank or above and read the Code to match panel. Hidden words should be read as
   "blank"; press Peek and they should be read for two seconds. Typing a line to the end should
   announce "Line 1 of N done", and finishing should announce the accuracy and speed.
10. Keyboard only: Tab into the typing box, type, press Escape and then Tab: focus should leave the
   box. In the lane tabs, Left and Right should move between tabs and Enter open one. In About,
   Tab should stay inside the dialog until Escape closes it.
11. Colour: with a colour-blindness filter (Chrome DevTools, Rendering, Emulate vision deficiencies,
   Deuteranopia), finished lines should still be told apart by their check mark and the Lines count.

Note anything odd as a GitHub issue with the device and browser, using Report a problem.
