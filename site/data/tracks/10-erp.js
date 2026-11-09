// Project track 10: ERP Export (Java)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs: node tools/output-checks/track10-erp/run.mjs (compiles each step's code with a test main)
BC.addTrack({
  id: "t-erp",
  name: "ERP Export",
  sub: "A Java back-office job: shift counts to a fixed-width ERP file with control totals, bad rows held back with reasons, safe to rerun",
  lessons: [
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Imports and constants",
      goal: "Import what the job needs, open public class ShiftExport, and declare MARGIN 42.50 and PAID_HOURS 7.5 as BigDecimal and the ideal rates as a Map.",
      code: `import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class ShiftExport {
    static final BigDecimal MARGIN = new BigDecimal("42.50");
    static final BigDecimal PAID_HOURS = new BigDecimal("7.5");
    static final Map<String, Integer> IDEAL_RATE = Map.of("Char Station 2", 50, "Conveyor 3", 60, "Hoop Driver 1", 55);`,
      about: "This track builds a back-office job: after shift A, turn its counts into a file the ERP imports, and hold back any row that would put bad numbers into the books. The class stays open across steps; the last step closes it. Money is BigDecimal from the start. The margin and rates are the canonical plant's; each step's output comes from compiling the code so far with a short test.",
      terms: [
        ["BigDecimal", "BigDecimal", "Exact decimals, for money."],
        ["static final", "static final", "One shared value that never changes."],
        ["Map.of", "Map.of", "A fixed, read-only map."],
      ],
      out: `margin 42.50, paid hours 7.5
Conveyor 3 ideal 60 per hour`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "The input file",
      goal: "Add SHIFT_CSV as a text block: the shift log header, its three shift A rows, and a broken line with only three fields.",
      code: `    static final String SHIFT_CSV = """
        shift,machine,good,total
        A,Conveyor 3,347,352
        A,Hoop Driver 1,271,274
        A,Char Station 2,310,301
        A,Conveyer 3,12
        """;`,
      about: "The first three rows are the canonical shift_log.csv the Python lane reads, including its known bad row: Char Station 2 with 310 good out of 301 made. The fourth line is added here, a misspelled machine and a missing field, the kind of thing a hand-edited file produces. In production this text would come from a file or a query.",
      terms: [
        ["\"\"\"", "Text block", "Multi-line text, indentation stripped."],
        ["310,301", "Known bad row", "More good than made: must not reach the ERP."],
      ],
      out: `shift,machine,good,total
A,Conveyor 3,347,352
A,Hoop Driver 1,271,274
A,Char Station 2,310,301
A,Conveyer 3,12`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "A shift row",
      goal: "Declare record ShiftRow(shift, machine, good, total).",
      code: `    record ShiftRow(String shift, String machine, int good, int total) {}`,
      about: "One line of the file becomes one record: typed fields instead of a string to be split again and again. A record nested in the class is automatically static, so it needs no ShiftExport object to exist.",
      terms: [
        ["record", "record", "A read-only data class."],
        ["ShiftRow", "ShiftRow", "One machine's counts for one shift."],
      ],
      out: `ShiftRow[shift=A, machine=Conveyor 3, good=347, total=352]
Conveyor 3 made 352`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Parse one line",
      goal: "Write parse(line): split on commas, refuse anything but 4 fields with IllegalArgumentException, and build a ShiftRow with trimmed, parsed fields.",
      code: `    static ShiftRow parse(String line) {
        String[] f = line.split(",");
        if (f.length != 4) throw new IllegalArgumentException("expected 4 fields, found " + f.length);
        return new ShiftRow(f[0].trim(), f[1].trim(), Integer.parseInt(f[2].trim()), Integer.parseInt(f[3].trim()));
    }`,
      about: "Parsing checks the shape: four fields, the last two whole numbers. Integer.parseInt throws NumberFormatException for bad text, and that is a kind of IllegalArgumentException, so one catch later handles both. trim forgives stray spaces, which hand-edited files are full of.",
      terms: [
        ["split", "split(\",\")", "Cuts the line at commas."],
        ["parseInt", "Integer.parseInt", "Text to int; throws on bad text."],
        ["IllegalArgumentException", "IllegalArgumentException", "The error for a bad input."],
      ],
      out: `ShiftRow[shift=A, machine=Conveyor 3, good=347, total=352]
IllegalArgumentException: expected 4 fields, found 3
NumberFormatException: For input string: "x"`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Check a row",
      goal: "Write problem(r) returning a message for an unknown machine, a negative count, or more good than total, and null for a good row.",
      code: `    static String problem(ShiftRow r) {
        if (!IDEAL_RATE.containsKey(r.machine())) return "unknown machine " + r.machine();
        if (r.good() < 0 || r.total() < 0) return "negative count";
        if (r.good() > r.total()) return "good " + r.good() + " is more than total " + r.total();
        return null;
    }`,
      about: "A row can be well-formed and still wrong. These are business rules: the machine must exist, counts cannot be negative, and good cannot exceed what was made. The message names the numbers, so whoever fixes the source does not have to hunt for them.",
      terms: [
        ["containsKey", "containsKey", "True if the map has that machine."],
        ["null", "null", "No problem found."],
      ],
      out: `null
good 310 is more than total 301
unknown machine Conveyer 3`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Read every row",
      goal: "Declare record Parsed(rows, errors) and readAll(csv): skip the header, parse and check each line, and keep good rows and numbered error messages apart.",
      code: `    record Parsed(List<ShiftRow> rows, List<String> errors) {}

    static Parsed readAll(String csv) {
        List<ShiftRow> rows = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        List<String> lines = csv.lines().toList();
        for (int i = 1; i < lines.size(); i++) {
            try {
                ShiftRow r = parse(lines.get(i));
                String p = problem(r);
                if (p == null) rows.add(r);
                else errors.add("line " + (i + 1) + ": " + p);
            } catch (IllegalArgumentException e) {
                errors.add("line " + (i + 1) + ": " + e.getMessage());
            }
        }
        return new Parsed(rows, errors);
    }`,
      about: "One bad row should not stop the whole export, and it must not slip through either. Each line either joins rows or becomes an error with its line number; the loop starts at 1 to skip the header, and i + 1 counts lines the way an editor does. Returning both lists in one record keeps them together.",
      terms: [
        ["Parsed", "record Parsed", "Good rows and errors, returned together."],
        ["lines", "lines()", "The text's lines."],
        ["catch", "catch", "A bad line becomes an error, not a crash."],
      ],
      out: `ShiftRow[shift=A, machine=Conveyor 3, good=347, total=352]
ShiftRow[shift=A, machine=Hoop Driver 1, good=271, total=274]
line 4: good 310 is more than total 301
line 5: expected 4 fields, found 3`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Target",
      goal: "Write target(machine): the ideal rate times PAID_HOURS, as a BigDecimal.",
      code: `    static BigDecimal target(String machine) {
        return BigDecimal.valueOf(IDEAL_RATE.get(machine)).multiply(PAID_HOURS);
    }`,
      about: "A shift's target is the ideal rate times 7.5 paid hours: 450, 412.5 and 375 barrels. BigDecimal arithmetic uses methods, multiply, add, subtract, instead of operators. valueOf turns an int into a BigDecimal exactly.",
      terms: [
        ["multiply", "multiply", "BigDecimal ×."],
        ["valueOf", "BigDecimal.valueOf", "An exact BigDecimal from a number."],
      ],
      out: `Char Station 2: 375.0
Conveyor 3: 450.0
Hoop Driver 1: 412.5`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Shortfall",
      goal: "Write behind(r): the target minus the total made, never below zero.",
      code: `    static BigDecimal behind(ShiftRow r) {
        return target(r.machine()).subtract(BigDecimal.valueOf(r.total())).max(BigDecimal.ZERO);
    }`,
      about: "Barrels short of target: Conveyor 3 made 352 of 450, 98 short, and Hoop Driver 1 274 of 412.5, 138.5 short. max(ZERO) stops a machine that beat its target from reporting a negative loss, which would quietly offset the others in a total.",
      terms: [
        ["subtract", "subtract", "BigDecimal −."],
        ["max", "max(BigDecimal.ZERO)", "Never below zero."],
      ],
      out: `Conveyor 3: 98.0 short
Hoop Driver 1: 138.5 short
Conveyor 3 at 460: 0 short`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Lost margin",
      goal: "Write lostMargin(r): the shortfall times MARGIN, rounded to cents HALF_UP.",
      code: `    static BigDecimal lostMargin(ShiftRow r) {
        return behind(r).multiply(MARGIN).setScale(2, RoundingMode.HALF_UP);
    }`,
      about: "The shortfall in dollars at the illustrative $42.50 margin: Conveyor 3 is $4,165.00, as in every lane. HALF_UP matches how Excel and SQL Server round, so the ERP total agrees with the spreadsheet a finance analyst builds to check it. This counts only lost output, not scrap.",
      terms: [
        ["setScale", "setScale(2, …)", "Rounds to cents."],
        ["HALF_UP", "RoundingMode.HALF_UP", "Halves round away from zero, like Excel."],
      ],
      out: `Conveyor 3: $4165.00
Hoop Driver 1: $5886.25`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Work-center codes",
      goal: "Add WORK_CENTER, a Map from machine name to ERP work-center code: FIN-CH2, ASM-CV3, ASM-HD1.",
      code: `    static final Map<String, String> WORK_CENTER = Map.of(
        "Char Station 2", "FIN-CH2", "Conveyor 3", "ASM-CV3", "Hoop Driver 1", "ASM-HD1");`,
      about: "The plant floor says \"Conveyor 3\"; the ERP knows a work-center code. A mapping table is the bridge, and keeping it in one place means a renamed machine is a one-line change. The codes are illustrative, built from the canonical areas: Assembly and Finishing.",
      terms: [
        ["WORK_CENTER", "Mapping table", "Plant names to ERP codes."],
      ],
      out: `Char Station 2 -> FIN-CH2
Conveyor 3 -> ASM-CV3
Hoop Driver 1 -> ASM-HD1`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "An export line",
      goal: "Declare record ExportLine(workCenter, date, goodQty, scrapQty, lostMargin).",
      code: `    record ExportLine(String workCenter, String date, int goodQty, int scrapQty, BigDecimal lostMargin) {}`,
      about: "The export line holds exactly what the ERP needs, in its own terms: a work center, not a machine name; good and scrap quantities, not good and total. Keeping it separate from ShiftRow means the file layout can change without touching the parsing.",
      terms: [
        ["ExportLine", "ExportLine", "One line of the ERP file, as data."],
        ["scrapQty", "Scrap quantity", "total − good."],
      ],
      out: `ExportLine[workCenter=ASM-CV3, date=20261107, goodQty=347, scrapQty=5, lostMargin=4165.00]`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Map a row",
      goal: "Write toExport(r, date) that builds an ExportLine from a ShiftRow: the work center, good, scrap as total minus good, and the lost margin.",
      code: `    static ExportLine toExport(ShiftRow r, String date) {
        return new ExportLine(WORK_CENTER.get(r.machine()), date, r.good(), r.total() - r.good(), lostMargin(r));
    }`,
      about: "Mapping is where plant data becomes ERP data. Conveyor 3's 347 good of 352 becomes 347 good and 5 scrap. Every row reaching this point has passed problem(), so the machine is known and scrap cannot be negative.",
      terms: [
        ["toExport", "toExport", "ShiftRow in, ExportLine out."],
        ["r.total() - r.good()", "Scrap", "Made minus good."],
      ],
      out: `ExportLine[workCenter=ASM-CV3, date=20261107, goodQty=347, scrapQty=5, lostMargin=4165.00]
ExportLine[workCenter=ASM-HD1, date=20261107, goodQty=271, scrapQty=3, lostMargin=5886.25]`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Fixed-width line",
      goal: "Write fixedWidth(e) that formats a detail record: D, the work center in 8, the date in 8, good and scrap as 7-digit zero-padded numbers, and the margin as 12 characters with 2 decimals.",
      code: `    static String fixedWidth(ExportLine e) {
        return String.format(Locale.US, "D%-8s%-8s%07d%07d%012.2f",
            e.workCenter(), e.date(), e.goodQty(), e.scrapQty(), e.lostMargin());
    }`,
      about: "Many ERP imports still read fixed-width files: each field sits at a set position, so position 18 is always good quantity. That makes widths a contract; a field one character too long shifts every field after it. D marks a detail record. Locale.US keeps the decimal point a point on any server. The layout is illustrative.",
      terms: [
        ["%-8s", "%-8s", "Text, left-aligned, 8 wide."],
        ["%07d", "%07d", "A number, zero-padded to 7."],
        ["%012.2f", "%012.2f", "2 decimals, zero-padded to 12."],
      ],
      out: `DASM-CV3 2026110700003470000005000004165.00  (43 chars)
DASM-HD1 2026110700002710000003000005886.25  (43 chars)`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Header record",
      goal: "Write header(date, shift): H, the date in 8, the shift in 2, and \"SHIFT PRODUCTION\" padded to 32, so it is 43 characters like a detail record.",
      code: `    static String header(String date, String shift) {
        return String.format(Locale.US, "H%-8s%-2s%-32s", date, shift, "SHIFT PRODUCTION");
    }`,
      about: "A header record says what the file is before the importer reads a single detail line. Every record is 43 characters, so the importer can read the file in fixed-size chunks; the trailing spaces are padding, not a mistake.",
      terms: [
        ["H", "Record type", "H header, D detail, T trailer."],
        ["%-32s", "Padding", "Fills the record to 43 characters."],
      ],
      out: `[H20261107A SHIFT PRODUCTION                ] 43 chars`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Trailer record",
      goal: "Write trailer(count, total): T, the line count in 5 digits, the total margin in 15 characters with 2 decimals, padded to 43.",
      code: `    static String trailer(int count, BigDecimal total) {
        return String.format(Locale.US, "T%05d%015.2f%22s", count, total, "");
    }`,
      about: "The trailer is a control total: the importer adds up what it read and compares. If a line was lost in transfer, the counts disagree and the file is rejected rather than half-loaded. It is the same idea as a batch ticket that has to balance.",
      terms: [
        ["%05d", "%05d", "Line count, 5 digits."],
        ["%22s", "%22s", "22 spaces of padding."],
      ],
      out: `[T00002000000010051.25                      ] 43 chars`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Build the file",
      goal: "Write buildFile(rows, date, shift): the header, one detail line per row while adding up the lost margin, then the trailer.",
      code: `    static List<String> buildFile(List<ShiftRow> rows, String date, String shift) {
        List<String> out = new ArrayList<>();
        out.add(header(date, shift));
        BigDecimal total = BigDecimal.ZERO;
        for (ShiftRow r : rows) {
            ExportLine e = toExport(r, date);
            out.add(fixedWidth(e));
            total = total.add(e.lostMargin());
        }
        out.add(trailer(rows.size(), total));
        return out;
    }`,
      about: "The trailer total is added up from the very lines written, not computed separately, so it can only disagree with the details if something breaks. BigDecimal is immutable: add returns a new value, so the result must be assigned back to total.",
      terms: [
        ["total.add", "add", "Returns a new BigDecimal; assign it back."],
        ["out.add", "List add", "Appends a line to the file."],
      ],
      out: `H20261107A SHIFT PRODUCTION                
DASM-CV3 2026110700003470000005000004165.00
DASM-HD1 2026110700002710000003000005886.25
T00002000000010051.25`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Error report",
      goal: "Write errorReport(errors, date, shift): a summary line with the count, then each error indented.",
      code: `    static List<String> errorReport(List<String> errors, String date, String shift) {
        List<String> out = new ArrayList<>();
        out.add("Rows held back from the " + date + " shift " + shift + " export: " + errors.size());
        for (String e : errors) out.add("  " + e);
        return out;
    }`,
      about: "Rows held back must go somewhere a person will see them, or they are quietly lost from the books. A short report with line numbers and reasons lets the shift lead fix the source and rerun. An empty report, \"held back: 0\", is also worth writing: it proves the check ran.",
      terms: [
        ["errorReport", "Error report", "What was held back, and why."],
      ],
      out: `Rows held back from the 20261107 shift A export: 2
  line 4: good 310 is more than total 301
  line 5: expected 4 fields, found 3`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Batch id",
      goal: "Write batchId(date, shift) returning \"SHIFT-\" + date + \"-\" + shift.",
      code: `    static String batchId(String date, String shift) {
        return "SHIFT-" + date + "-" + shift;
    }`,
      about: "One id per shift makes the export safe to rerun. Jobs get rerun, after a failure, by a scheduler, by someone unsure it ran, and posting a shift twice doubles its numbers in the ERP. The MES Helper track solves the same problem with a database check.",
      terms: [
        ["batchId", "Batch id", "One id per date and shift."],
      ],
      out: `SHIFT-20261107-A`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "Run the export",
      goal: "Write run(csv, date, shift, sent, dir): if the batch was already sent, say so and write nothing. Otherwise read the rows, write the export and the error report, record the batch, and print a summary.",
      code: `    static int run(String csv, String date, String shift, Set<String> sent, Path dir) throws IOException {
        String batch = batchId(date, shift);
        if (sent.contains(batch)) {
            System.out.println(batch + " already sent; nothing written");
            return 0;
        }
        Parsed p = readAll(csv);
        Files.write(dir.resolve(batch + ".txt"), buildFile(p.rows(), date, shift));
        Files.write(dir.resolve(batch + "-errors.txt"), errorReport(p.errors(), date, shift));
        sent.add(batch);
        System.out.println(batch + ": " + p.rows().size() + " lines exported, " + p.errors().size() + " held back");
        return p.rows().size();
    }`,
      about: "The check comes first, so a rerun changes nothing. Here the sent ids live in a Set for the test; a real job keeps them in a database table, so they survive a restart. Files.write writes every line and closes the file. throws IOException hands a disk error to the caller.",
      terms: [
        ["sent.contains", "Already sent?", "Stops a rerun before it writes anything."],
        ["Files.write", "Files.write", "Writes all the lines and closes the file."],
        ["resolve", "dir.resolve", "A file inside the folder."],
      ],
      out: `SHIFT-20261107-A: 2 lines exported, 2 held back
SHIFT-20261107-A already sent; nothing written
SHIFT-20261107-A-errors.txt
SHIFT-20261107-A.txt`,
    },
    {
      lang: "java",
      file: "ShiftExport.java",
      t: "main",
      goal: "In main, make a temporary folder, run shift A's export, print both files, run it again, and close the class.",
      code: `    public static void main(String[] args) throws IOException {
        Path dir = Files.createTempDirectory("erp");
        Set<String> sent = new HashSet<>();

        run(SHIFT_CSV, "20261107", "A", sent, dir);
        for (String line : Files.readAllLines(dir.resolve("SHIFT-20261107-A.txt"))) System.out.println(line);
        for (String line : Files.readAllLines(dir.resolve("SHIFT-20261107-A-errors.txt"))) System.out.println(line);

        run(SHIFT_CSV, "20261107", "A", sent, dir);
    }
}`,
      about: "Two rows export: Conveyor 3, $4,165.00 short, and Hoop Driver 1, 138.5 barrels × $42.50 = $5,886.25, for a trailer total of $10,051.25. Char Station 2's impossible row and the broken line are held back with reasons. The second run writes nothing. The final brace closes the class opened in the first step.",
      terms: [
        ["createTempDirectory", "Files.createTempDirectory", "A fresh folder for the test run."],
        ["readAllLines", "Files.readAllLines", "Reads the file back to show it."],
      ],
      out: `SHIFT-20261107-A: 2 lines exported, 2 held back
H20261107A SHIFT PRODUCTION                
DASM-CV3 2026110700003470000005000004165.00
DASM-HD1 2026110700002710000003000005886.25
T00002000000010051.25                      
Rows held back from the 20261107 shift A export: 2
  line 4: good 310 is more than total 301
  line 5: expected 4 fields, found 3
SHIFT-20261107-A already sent; nothing written`,
    },
  ],
});
