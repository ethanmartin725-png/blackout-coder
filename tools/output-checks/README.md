# Output checks

The "What it produces" text in tracks 2–4 and 6 comes from running the lesson code, not from typing it by hand. These scripts reproduce those outputs on the sample data, with the database connection replaced by a stand-in.

Requires Python 3 with pandas and openpyxl. Track 6 also needs the .NET 8 SDK.

```
cd tools/output-checks/track2-db      && python gen.py && python run.py
cd tools/output-checks/track3-oee     && python run3.py
cd tools/output-checks/track4-handoff && python run4.py
cd tools/output-checks/track6-mes     && python3 build6.py
```

`steps*.py` hold the lesson code exactly as it appears in `site/data/tracks/`. If you change a step's code, change it here too, re-run, and paste the new output into the lesson's `out` field.

Track 6 works the other way round: `lessons6.py` is the source. `build6.py` compiles the C# with `FakeDb.cs` in place of the lesson's `Db.cs` (same API, Shift Handoff sample data), runs `Program.cs` one step at a time, and writes `site/data/tracks/06-mes.js` with each step's real output. It also compiles the real `Db.cs`.

Generated files (`*.pkl`, `*.xlsx`, `*.sql`, `outs*.json`, `handoff_*.html`, `track6-mes/build/`) are ignored by git.
