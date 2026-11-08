# Output checks

The "What it produces" text in tracks 2–4 comes from running the lesson code, not from typing it by hand. These scripts reproduce those outputs on the sample data, with the database connection replaced by a stand-in.

Requires Python 3 with pandas and openpyxl.

```
cd tools/output-checks/track2-db      && python gen.py && python run.py
cd tools/output-checks/track3-oee     && python run3.py
cd tools/output-checks/track4-handoff && python run4.py
```

`steps*.py` hold the lesson code exactly as it appears in `site/data/tracks/`. If you change a step's code, change it here too, re-run, and paste the new output into the lesson's `out` field.

Generated files (`*.pkl`, `*.xlsx`, `*.sql`, `outs*.json`, `handoff_*.html`) are ignored by git.
