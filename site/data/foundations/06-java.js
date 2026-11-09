// Foundations lane: Java
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Numbers come from the canonical sample plant. Outputs: node tools/output-checks/foundations/run.mjs
BC.addLane({
  id: "java",
  name: "Java",
  lang: "java",
  lessons: [
    {
      t: "Hello class",
      goal: "In class Hello, print \"Good morning, cooperage\" from main.",
      code: `public class Hello {
    public static void main(String[] args) {
        System.out.println("Good morning, cooperage");
    }
}`,
      about: "Java needs a class even for one line of output. The JVM starts at main. The file would be named Hello.java.",
      terms: [
        ["class", "public class Hello", "Every Java program lives in a class. The file name must match."],
        ["main", "public static void main(…)", "The entry point the JVM looks for."],
        ["println", "System.out.println", "Prints text and a newline."],
      ],
      out: `Good morning, cooperage`,
    },
    {
      t: "Variables and printf",
      goal: "In class Oee, compute availability 0.988 × performance 0.749 × quality 0.985 and print \"OEE:\" with one decimal and a percent sign.",
      code: `public class Oee {
    public static void main(String[] args) {
        double availability = 0.988;
        double performance = 0.749;
        double quality = 0.985;
        double oee = availability * performance * quality;
        System.out.printf("OEE: %.1f%%%n", oee * 100);
    }
}`,
      about: "printf fills placeholders in the string with the values after the comma: %.1f is one decimal, %% is a literal percent sign, %n is a line break. The factors are Hoop Driver 1's sample week from the OEE Loss Report track, rounded to 3 places, so this prints OEE: 72.9%.",
      terms: [
        ["printf", "printf", "Prints using format codes."],
        [null, "%.1f", "A decimal number with 1 digit after the point."],
        [null, "%%", "A literal percent sign."],
        [null, "%n", "A newline that works on any operating system."],
      ],
      out: `OEE: 72.9%`,
    },
    {
      t: "Static method",
      goal: "In class Shift, add static double oee(a, p, q) and from main printf \"OEE is\" with oee(0.988, 0.749, 0.985) * 100 to one decimal and a percent sign.",
      code: `public class Shift {
    static double oee(double a, double p, double q) {
        return a * p * q;
    }

    public static void main(String[] args) {
        System.out.printf("OEE is %.1f%%%n", oee(0.988, 0.749, 0.985) * 100);
    }
}`,
      about: "Methods sit inside the class. static means main can call it directly without creating an object first. The output matches the other languages' OEE lessons: 72.9%.",
      terms: [
        ["static", "static double oee", "A class-level method that returns a double."],
        ["return", "return", "Hands the value back to the caller."],
      ],
      out: `OEE is 72.9%`,
    },
    {
      t: "If / else if",
      goal: "In class Rating, set oee 0.729 and print \"World class\" at 0.85+, \"Typical\" at 0.60+, else \"Needs work\".",
      code: `public class Rating {
    public static void main(String[] args) {
        double oee = 0.729;
        if (oee >= 0.85) {
            System.out.println("World class");
        } else if (oee >= 0.60) {
            System.out.println("Typical");
        } else {
            System.out.println("Needs work");
        }
    }
}`,
      about: "Java checks each condition in order and runs the first block that is true. Hoop Driver 1's 0.729 rates Typical; Char Station 2's 0.860 would rate World class.",
      terms: [
        ["if", "if (…)", "Runs the block when the condition is true."],
        ["else", "else if / else", "Further checks, then a fallback."],
        [">=", ">=", "Greater than or equal to."],
      ],
      out: `Typical`,
    },
    {
      t: "Arrays and loops",
      goal: "In class Downtime, sum Hoop Driver 1's shift A fault minutes {7.5, 18.5, 15.0} with an enhanced for and print \"Total: \" + total + \" min\".",
      code: `public class Downtime {
    public static void main(String[] args) {
        double[] minutes = {7.5, 18.5, 15.0};
        double total = 0;
        for (double m : minutes) {
            total += m;
        }
        System.out.println("Total: " + total + " min");
    }
}`,
      about: "The enhanced for reads each element in turn. With text, + joins pieces into one string. Java always prints a double with a decimal point, so the Shift Handoff track's 41 minutes prints as 41.0.",
      terms: [
        ["double[]", "double[]", "An array of decimal numbers. Its length is fixed when it is created."],
        ["for", "for (int m : minutes)", "Enhanced for: read each element in turn."],
        ["+", "+", "With strings, + joins (concatenates) text."],
      ],
      out: `Total: 41.0 min`,
    },
    {
      t: "HashMap",
      goal: "In class ShiftBarrels, store \"Conveyor 3\" → 352 and \"Hoop Driver 1\" → 274 in a HashMap and print each as \"machine: count\".",
      code: `import java.util.HashMap;
import java.util.Map;

public class ShiftBarrels {
    public static void main(String[] args) {
        Map<String, Integer> barrels = new HashMap<>();
        barrels.put("Conveyor 3", 352);
        barrels.put("Hoop Driver 1", 274);
        for (String machine : barrels.keySet()) {
            System.out.println(machine + ": " + barrels.get(machine));
        }
    }
}`,
      about: "A map stores key/value pairs. HashMap does not keep insertion order, so the machines may print in either order; use a LinkedHashMap when order matters. The counts are shift A's barrels.",
      terms: [
        ["import", "import", "Brings in a class from another package."],
        ["Map", "Map<String, Integer>", "Key/value collection type. Integer is the object form of int."],
        ["HashMap", "new HashMap<>()", "Creates the map. The empty <> lets Java infer the types."],
        ["put", ".put / .get", "Add a pair; read a value by key."],
        ["keySet", ".keySet()", "All the keys, for looping."],
      ],
      out: `Conveyor 3: 352
Hoop Driver 1: 274`,
    },
    {
      t: "String methods",
      goal: "In class Strings, take the machine before the first '|' in \"Conveyor 3|JAM|09:08:52|4.62\", print it with its length, the part after the last '|', the code in lower case, and whether the line contains JAM.",
      code: `public class Strings {
    public static void main(String[] args) {
        String line = "Conveyor 3|JAM|09:08:52|4.62";

        String machine = line.substring(0, line.indexOf('|'));
        System.out.println(machine + " (" + machine.length() + " chars)");
        System.out.println(line.substring(line.lastIndexOf('|') + 1));
        System.out.println(line.split("\\\\|")[1].toLowerCase());
        System.out.println(line.contains("JAM"));
    }
}`,
      about: "indexOf finds the first match and lastIndexOf the last; substring(start, end) copies the piece between them, end not included. split takes a regular expression, and | means \"or\" in one, so it must be escaped as \\\\| to split on a literal bar. Strings never change in Java: every method returns a new one.",
      terms: [
        ["indexOf", "indexOf", "Position of the first match, or -1."],
        ["substring", "substring(start, end)", "The characters from start up to end."],
        ["split", "split(\"\\\\|\")", "Cuts on a regular expression; the bar must be escaped."],
      ],
      out: `Conveyor 3 (10 chars)
4.62
jam
true`,
    },
    {
      t: "StringBuilder",
      goal: "In class Builder, build one line per shift A machine with a StringBuilder and print the result once.",
      code: `public class Builder {
    public static void main(String[] args) {
        String[] machines = {"Char Station 2", "Conveyor 3", "Hoop Driver 1"};
        int[] barrels = {301, 352, 274};

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < machines.length; i++) {
            sb.append(machines[i]).append(": ").append(barrels[i]).append('\\n');
        }
        sb.append("Total: ").append(301 + 352 + 274);
        System.out.println(sb);
    }
}`,
      about: "Joining strings with + in a loop builds a new string every pass. A StringBuilder grows one buffer instead, which matters when a report has thousands of lines. append returns the builder, so calls chain. Printing the builder prints its text.",
      terms: [
        ["StringBuilder", "StringBuilder", "A growable text buffer."],
        ["append", "append", "Adds to the end; returns the builder for chaining."],
      ],
      out: `Char Station 2: 301
Conveyor 3: 352
Hoop Driver 1: 274
Total: 927`,
    },
    {
      t: "Formatting with a Locale",
      goal: "In class Formats, print Conveyor 3's share as a 1-decimal percent with String.format in Locale.US and Locale.GERMANY, and the weekly loss 251876 with grouping.",
      code: `import java.util.Locale;

public class Formats {
    public static void main(String[] args) {
        double share = 352 / 450.0 * 100;
        System.out.println(String.format(Locale.US, "%.1f%%", share));
        System.out.println(String.format(Locale.GERMANY, "%.1f%%", share));
        System.out.println(String.format(Locale.US, "$%,d", 251876));
        System.out.println(String.format(Locale.US, "%-15s|%6d|", "Conveyor 3", 352));
    }
}`,
      about: "String.format uses the computer's locale unless told otherwise, so a German server writes 78,2. Anything another program reads, an export file or a CSV, should name its locale. %% prints a percent sign, %,d adds thousands separators, and %-15s left-aligns in 15 characters. $251,876 is the OEE Loss Report's weekly loss.",
      terms: [
        ["Locale.US", "Locale.US", "US number format: 78.2."],
        ["%.1f", "%.1f", "A decimal with 1 place."],
        ["%,d", "%,d", "A whole number with separators."],
      ],
      out: `78.2%
78,2%
$251,876
Conveyor 3     |   352|`,
    },
    {
      t: "Text blocks",
      goal: "In class Blocks, write a three-line SQL query as a text block and print it, then print its line count.",
      code: `public class Blocks {
    public static void main(String[] args) {
        String sql = """
            SELECT machine, SUM(minutes) AS down_min
            FROM fault_log
            GROUP BY machine""";
        System.out.println(sql);
        System.out.println(sql.lines().count() + " lines");
    }
}`,
      about: "A text block, between triple quotes, keeps line breaks as typed and strips the indentation common to every line, so SQL or JSON can be pasted into code readably. Closing the quotes on the last line leaves no trailing newline. Text blocks need Java 15 or newer; this lane assumes Java 17.",
      terms: [
        ["\"\"\"", "\"\"\" … \"\"\"", "A text block: multi-line text with indentation stripped."],
        ["lines", "lines()", "The string's lines, as a stream."],
      ],
      out: `SELECT machine, SUM(minutes) AS down_min
FROM fault_log
GROUP BY machine
3 lines`,
    },
    {
      t: "switch expressions",
      goal: "In class States, write stateText(int) with a switch expression: 1 RUNNING, 2 JAMMED, 3 IDLE, default UNKNOWN. Print it for 1, 2, 3 and 0.",
      code: `public class States {
    static String stateText(int state) {
        return switch (state) {
            case 1 -> "RUNNING";
            case 2 -> "JAMMED";
            case 3 -> "IDLE";
            default -> "UNKNOWN";
        };
    }

    public static void main(String[] args) {
        for (int s : new int[] {1, 2, 3, 0}) {
            System.out.println(s + " -> " + stateText(s));
        }
    }
}`,
      about: "The arrow form of switch produces a value and never falls through, so there is no break to forget. The codes are Conv_State from the PLC lessons. Switch expressions need Java 14 or newer.",
      terms: [
        ["->", "case 1 ->", "An arm: the value for this case."],
        ["default", "default", "Everything else."],
      ],
      out: `1 -> RUNNING
2 -> JAMMED
3 -> IDLE
0 -> UNKNOWN`,
    },
    {
      t: "Lists",
      goal: "In class Lists, make a List of Hoop Driver 1's fault minutes, add the jam's 4.62, sort it, print it, the size and the largest. Then show that List.of cannot be changed.",
      code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Lists {
    public static void main(String[] args) {
        List<Double> minutes = new ArrayList<>(List.of(7.5, 18.5, 15.0));
        minutes.add(4.62);
        Collections.sort(minutes);
        System.out.println(minutes);
        System.out.println(minutes.size() + " faults, longest " + minutes.get(minutes.size() - 1));

        List<Double> fixed = List.of(7.5, 18.5);
        try {
            fixed.add(1.0);
        } catch (UnsupportedOperationException e) {
            System.out.println("List.of is read-only");
        }
    }
}`,
      about: "List.of makes a list that cannot change; copying it into an ArrayList gives one that can. A List holds objects, so numbers are stored as Double, not double; Java converts automatically. Read-only lists are useful for fixed reference data, like the machines in a plant.",
      terms: [
        ["ArrayList", "ArrayList", "A list that grows and shrinks."],
        ["List.of", "List.of", "A fixed, read-only list."],
        ["Collections.sort", "Collections.sort", "Sorts a list in place."],
      ],
      out: `[4.62, 7.5, 15.0, 18.5]
4 faults, longest 18.5
List.of is read-only`,
    },
    {
      t: "Sorting with a Comparator",
      goal: "In class Pareto, sort a list of Fault records by minutes, largest first, with Comparator.comparingDouble and reversed, and print them.",
      code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Pareto {
    record Fault(String name, double minutes) {}

    public static void main(String[] args) {
        List<Fault> pareto = new ArrayList<>(List.of(
            new Fault("Jam", 65.7), new Fault("Low air", 87.4), new Fault("E-stop", 10.8),
            new Fault("Char flare", 70.0), new Fault("Hoop misfeed", 66.6)));

        pareto.sort(Comparator.comparingDouble(Fault::minutes).reversed());
        for (Fault f : pareto) {
            System.out.println(f.name() + " " + f.minutes());
        }
    }
}`,
      about: "Comparator.comparingDouble builds a comparison from a key, here each fault's minutes, and reversed() flips it to largest first. Fault::minutes is a method reference, shorthand for f -> f.minutes(). These are the DB Pulls track's Pareto minutes.",
      terms: [
        ["Comparator", "Comparator", "Says how to order two items."],
        ["Fault::minutes", "Method reference", "Short for f -> f.minutes()."],
        ["reversed", "reversed()", "Largest first."],
      ],
      out: `Low air 87.4
Char flare 70.0
Hoop misfeed 66.6
Jam 65.7
E-stop 10.8`,
    },
    {
      t: "HashMap merge",
      goal: "In class Counts, count shift A's fault names with merge into a TreeMap and print it, then print getOrDefault for E-stop.",
      code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class Counts {
    public static void main(String[] args) {
        List<String> faults = List.of("Jam", "Hoop misfeed", "Low air", "Low air", "Char flare");

        Map<String, Integer> counts = new TreeMap<>();
        for (String f : faults) {
            counts.merge(f, 1, Integer::sum);
        }
        System.out.println(counts);
        System.out.println("E-stop: " + counts.getOrDefault("E-stop", 0));
    }
}`,
      about: "merge puts 1 for a new key and otherwise combines it with the old value using Integer::sum, a whole tally in one line. A TreeMap keeps its keys sorted, so the output is the same on every run, unlike a HashMap. getOrDefault returns 0 for a fault that never happened instead of null.",
      terms: [
        ["merge", "merge(key, 1, Integer::sum)", "Adds 1, or starts at 1."],
        ["TreeMap", "TreeMap", "A map with sorted keys."],
        ["getOrDefault", "getOrDefault", "The value, or a default if missing."],
      ],
      out: `{Char flare=1, Hoop misfeed=1, Jam=1, Low air=2}
E-stop: 0`,
    },
    {
      t: "Records",
      goal: "In class Records, declare record ShiftCount(machine, idealRateHr, barrels) with a share() method. Print one, compare two equal ones, and print the share.",
      code: `public class Records {
    record ShiftCount(String machine, int idealRateHr, int barrels) {
        double share() {
            return barrels / (idealRateHr * 7.5);
        }
    }

    public static void main(String[] args) {
        ShiftCount c3 = new ShiftCount("Conveyor 3", 60, 352);
        System.out.println(c3);
        System.out.println(c3.equals(new ShiftCount("Conveyor 3", 60, 352)));
        System.out.printf("%.3f%n", c3.share());
    }
}`,
      about: "A record declares a data class in one line: fields, constructor, accessors like machine(), equals, hashCode and toString all come free. Two records with the same values are equal. Records cannot be changed after creation, which suits a shift's recorded counts. Records need Java 16 or newer.",
      terms: [
        ["record", "record", "A read-only data class."],
        ["equals", "equals", "True when every field is equal."],
        ["%n", "%n", "A line break that suits the platform."],
      ],
      out: `ShiftCount[machine=Conveyor 3, idealRateHr=60, barrels=352]
true
0.782`,
    },
    {
      t: "Enums",
      goal: "In class Enums, declare enum MachineState with codes 1, 2, 3 and a fromCode lookup. Print the state for code 2, its code, and every state.",
      code: `public class Enums {
    enum MachineState {
        RUNNING(1), JAMMED(2), IDLE(3);

        final int code;

        MachineState(int code) {
            this.code = code;
        }

        static MachineState fromCode(int code) {
            for (MachineState s : values()) {
                if (s.code == code) return s;
            }
            throw new IllegalArgumentException("unknown state " + code);
        }
    }

    public static void main(String[] args) {
        MachineState s = MachineState.fromCode(2);
        System.out.println(s + " " + s.code);
        for (MachineState m : MachineState.values()) System.out.println(m.code + " " + m);
    }
}`,
      about: "A Java enum is a small class: each constant can carry data, like the PLC's state code. fromCode looks a code up and refuses one it does not know, rather than letting a bad number from a PLC pass as a state. values() lists every constant in order.",
      terms: [
        ["enum", "enum", "A fixed set of named constants."],
        ["values", "values()", "Every constant, in declared order."],
        ["fromCode", "fromCode", "Code from the PLC to a state."],
      ],
      out: `JAMMED 2
1 RUNNING
2 JAMMED
3 IDLE`,
    },
    {
      t: "Classes and constructors",
      goal: "In class Plant, write a static nested class Machine with private final fields, a constructor that rejects a rate of 0 or less, and target() and share(). Print each machine's target and share.",
      code: `public class Plant {
    static class Machine {
        private final String name;
        private final double rateHr;

        Machine(String name, double rateHr) {
            if (rateHr <= 0) throw new IllegalArgumentException("ideal rate must be above 0");
            this.name = name;
            this.rateHr = rateHr;
        }

        double target() { return rateHr * 7.5; }
        double share(int barrels) { return barrels / target(); }
    }

    public static void main(String[] args) {
        Machine[] plant = {new Machine("Conveyor 3", 60), new Machine("Hoop Driver 1", 55), new Machine("Char Station 2", 50)};
        int[] barrels = {352, 274, 301};
        for (int i = 0; i < plant.length; i++) {
            System.out.printf("%s: target %.1f, %.1f%%%n", plant[i].name, plant[i].target(), plant[i].share(barrels[i]) * 100);
        }
    }
}`,
      about: "private hides a field from other classes and final means it is set once, in the constructor. Checking the rate there means no Machine with a nonsense rate can ever exist. this.name is the field; plain name is the parameter. The rates are the canonical ideal rates.",
      terms: [
        ["private final", "private final", "Hidden, and set only once."],
        ["this.name", "this.", "The object's own field."],
        ["IllegalArgumentException", "IllegalArgumentException", "The standard error for a bad argument."],
      ],
      out: `Conveyor 3: target 450.0, 78.2%
Hoop Driver 1: target 412.5, 66.4%
Char Station 2: target 375.0, 80.3%`,
    },
    {
      t: "Interfaces",
      goal: "In class Report, define interface ReportLine with text(), implement it in records CountLine and FaultLine, and print a mixed list.",
      code: `import java.util.List;

public class Report {
    interface ReportLine {
        String text();
    }

    record CountLine(String machine, int barrels, double target) implements ReportLine {
        public String text() {
            return String.format("%s: %d of %.1f", machine, barrels, target);
        }
    }

    record FaultLine(String machine, String fault, double minutes) implements ReportLine {
        public String text() {
            return machine + ": " + fault + ", " + minutes + " min";
        }
    }

    public static void main(String[] args) {
        List<ReportLine> lines = List.of(
            new CountLine("Conveyor 3", 352, 450),
            new FaultLine("Conveyor 3", "Jam", 4.62),
            new CountLine("Hoop Driver 1", 274, 412.5));
        for (ReportLine l : lines) System.out.println(l.text());
    }
}`,
      about: "An interface lists what a type promises to do. The report loop only knows ReportLine, so a new kind of line, a quality hold or a note, plugs in without touching the loop. Interface methods are public, so implementations must say public too.",
      terms: [
        ["interface", "interface", "A promise of methods."],
        ["implements", "implements", "This type keeps the promise."],
      ],
      out: `Conveyor 3: 352 of 450.0
Conveyor 3: Jam, 4.62 min
Hoop Driver 1: 274 of 412.5`,
    },
    {
      t: "Abstract classes",
      goal: "In class Sensors, write an abstract class Sensor with a name, an abstract read() and a describe() that uses it. Extend it with PressureSensor and EyeSensor and describe both.",
      code: `public class Sensors {
    abstract static class Sensor {
        final String name;

        Sensor(String name) { this.name = name; }

        abstract String read();

        String describe() { return name + " reads " + read(); }
    }

    static class PressureSensor extends Sensor {
        PressureSensor() { super("Hoop Driver 1 air"); }
        String read() { return "92.0 psi"; }
    }

    static class EyeSensor extends Sensor {
        EyeSensor() { super("Conveyor 3 eye"); }
        String read() { return "blocked"; }
    }

    public static void main(String[] args) {
        Sensor[] sensors = {new PressureSensor(), new EyeSensor()};
        for (Sensor s : sensors) System.out.println(s.describe());
    }
}`,
      about: "An abstract class shares real code, here the name and describe(), while leaving a method like read() for each subclass to fill in. It cannot be created on its own. Use an interface when types only share a promise, and an abstract class when they also share code. The readings are fixed values for the example.",
      terms: [
        ["abstract", "abstract", "Cannot be created directly; has unfinished methods."],
        ["extends", "extends", "Inherits fields and methods."],
        ["super", "super(…)", "Calls the parent's constructor."],
      ],
      out: `Hoop Driver 1 air reads 92.0 psi
Conveyor 3 eye reads blocked`,
    },
    {
      t: "var",
      goal: "In class Vars, declare a Map with var and add shift A barrels, then loop over its entries with var.",
      code: `import java.util.LinkedHashMap;

public class Vars {
    public static void main(String[] args) {
        var barrels = new LinkedHashMap<String, Integer>();
        barrels.put("Char Station 2", 301);
        barrels.put("Conveyor 3", 352);
        barrels.put("Hoop Driver 1", 274);

        for (var e : barrels.entrySet()) {
            System.out.println(e.getKey() + " " + e.getValue());
        }
    }
}`,
      about: "var lets the compiler work out a local variable's type from the right-hand side, so a long generic type is written once. The type is still fixed: barrels can only ever hold a LinkedHashMap<String, Integer>. LinkedHashMap keeps insertion order. var needs Java 10 or newer.",
      terms: [
        ["var", "var", "The compiler infers the type."],
        ["LinkedHashMap", "LinkedHashMap", "A map that keeps insertion order."],
        ["entrySet", "entrySet()", "Key-value pairs, for looping."],
      ],
      out: `Char Station 2 301
Conveyor 3 352
Hoop Driver 1 274`,
    },
    {
      t: "Checked exceptions",
      goal: "In class Checked, write readCount(String) that throws a checked IOException for a blank reading and an unchecked NumberFormatException for bad text. Call it for \"352\", \"\" and \"n/a\".",
      code: `import java.io.IOException;

public class Checked {
    static int readCount(String text) throws IOException {
        if (text.isBlank()) throw new IOException("no reading from the counter");
        return Integer.parseInt(text);
    }

    public static void main(String[] args) {
        for (String t : new String[] {"352", "", "n/a"}) {
            try {
                System.out.println("count " + readCount(t));
            } catch (IOException e) {
                System.out.println("IOException: " + e.getMessage());
            } catch (NumberFormatException e) {
                System.out.println("NumberFormatException: " + e.getMessage());
            }
        }
    }
}`,
      about: "A checked exception, like IOException, must be declared with throws and handled by the caller, or the code does not compile: Java forces you to plan for a missing reading. Unchecked ones, like NumberFormatException from parseInt, need no declaration. Catch the specific types you can do something about.",
      terms: [
        ["throws", "throws IOException", "This method can throw a checked exception."],
        ["IOException", "IOException", "Checked: callers must handle it."],
        ["NumberFormatException", "NumberFormatException", "Unchecked: bad text for a number."],
      ],
      out: `count 352
IOException: no reading from the counter
NumberFormatException: For input string: "n/a"`,
    },
    {
      t: "Files with try-with-resources",
      goal: "In class Files1, write shift A's summary with a BufferedWriter and read it back with a BufferedReader, both in try-with-resources.",
      code: `import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class Files1 {
    public static void main(String[] args) throws IOException {
        Path file = Path.of("shift_summary.csv");

        try (BufferedWriter w = Files.newBufferedWriter(file)) {
            w.write("machine,barrels,target\\n");
            w.write("Char Station 2,301,375\\n");
            w.write("Conveyor 3,352,450\\n");
            w.write("Hoop Driver 1,274,412.5\\n");
        }

        try (BufferedReader r = Files.newBufferedReader(file)) {
            String line;
            while ((line = r.readLine()) != null) {
                System.out.println(line);
            }
        }
    }
}`,
      about: "try ( … ) closes what it opened when the block ends, even after an exception, so a file is never left half-written or locked. That is the Java version of C++'s RAII and C#'s using. readLine returns null at the end of the file. main declares throws IOException to let a file error stop the program.",
      terms: [
        ["try (", "try-with-resources", "Closes the resource automatically."],
        ["newBufferedWriter", "Files.newBufferedWriter", "Opens a file for writing text."],
        ["readLine", "readLine()", "One line, or null at the end."],
      ],
      out: `machine,barrels,target
Char Station 2,301,375
Conveyor 3,352,450
Hoop Driver 1,274,412.5`,
    },
    {
      t: "Optional",
      goal: "In class Optionals, find the open fault in a list with a stream and Optional, print its machine, then search for an open fault on Conveyor 3 and print a fallback.",
      code: `import java.util.List;
import java.util.Optional;

public class Optionals {
    record Fault(String machine, String name, String end) {}

    public static void main(String[] args) {
        List<Fault> faults = List.of(
            new Fault("Conveyor 3", "Jam", "09:13:29"),
            new Fault("Char Station 2", "Char flare", null));

        Optional<Fault> open = faults.stream().filter(f -> f.end() == null).findFirst();
        System.out.println(open.map(Fault::machine).orElse("none open"));

        Optional<Fault> c3 = faults.stream()
            .filter(f -> f.machine().equals("Conveyor 3") && f.end() == null).findFirst();
        System.out.println(c3.map(Fault::name).orElse("Conveyor 3 has no open fault"));
    }
}`,
      about: "findFirst returns an Optional: a box that is either full or empty, so \"nothing found\" cannot be mistaken for a real fault or turn into a NullPointerException later. map works on the value if there is one, and orElse supplies a fallback. The char flare is shift A's open fault.",
      terms: [
        ["Optional", "Optional<Fault>", "A value, or nothing."],
        ["orElse", "orElse", "The value, or this fallback."],
        ["findFirst", "findFirst()", "The first match, as an Optional."],
      ],
      out: `Char Station 2
Conveyor 3 has no open fault`,
    },
    {
      t: "Streams",
      goal: "In class StreamsDemo, from shift A's faults, list the machines with faults of 15 minutes or more, and total all the minutes with mapToDouble and sum.",
      code: `import java.util.List;

public class StreamsDemo {
    record Fault(String machine, String name, double minutes) {}

    public static void main(String[] args) {
        List<Fault> faults = List.of(
            new Fault("Conveyor 3", "Jam", 4.62),
            new Fault("Hoop Driver 1", "Hoop misfeed", 7.5),
            new Fault("Hoop Driver 1", "Low air", 18.5),
            new Fault("Hoop Driver 1", "Low air", 15.0),
            new Fault("Char Station 2", "Char flare", 18.75));

        List<String> longOnes = faults.stream()
            .filter(f -> f.minutes() >= 15)
            .map(f -> f.machine() + ": " + f.name())
            .toList();
        System.out.println(longOnes);

        double total = faults.stream().mapToDouble(Fault::minutes).sum();
        System.out.printf("%.2f min%n", total);
    }
}`,
      about: "A stream is a pipeline over a collection: filter keeps items, map transforms them, and toList collects the result. mapToDouble turns the faults into plain numbers so sum can add them. 64.37 minutes is shift A's total down time, clipped at 14:00.",
      terms: [
        ["stream", "stream()", "Starts a pipeline over the list."],
        ["filter", "filter", "Keeps items that pass."],
        ["mapToDouble", "mapToDouble", "Turns items into numbers for sum."],
      ],
      out: `[Hoop Driver 1: Low air, Hoop Driver 1: Low air, Char Station 2: Char flare]
64.37 min`,
    },
    {
      t: "groupingBy",
      goal: "In class Grouping, group shift A's faults by machine with Collectors.groupingBy and summingDouble into a TreeMap, and print each machine's minutes.",
      code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

public class Grouping {
    record Fault(String machine, double minutes) {}

    public static void main(String[] args) {
        List<Fault> faults = List.of(
            new Fault("Conveyor 3", 4.62), new Fault("Hoop Driver 1", 7.5), new Fault("Hoop Driver 1", 18.5),
            new Fault("Hoop Driver 1", 15.0), new Fault("Char Station 2", 18.75));

        Map<String, Double> byMachine = faults.stream()
            .collect(Collectors.groupingBy(Fault::machine, TreeMap::new, Collectors.summingDouble(Fault::minutes)));

        byMachine.forEach((machine, minutes) -> System.out.printf("%-15s%6.2f%n", machine, minutes));
    }
}`,
      about: "groupingBy splits the stream by a key; its second argument picks the map type, a sorted TreeMap here, and the third says what to do with each group, sum the minutes. These are the Shift Handoff track's down minutes: 18.75, 4.62 and 41.00.",
      terms: [
        ["groupingBy", "Collectors.groupingBy", "Groups items by a key."],
        ["summingDouble", "summingDouble", "Adds a number from each item in the group."],
        ["forEach", "forEach", "Runs a function for each entry."],
      ],
      out: `Char Station 2  18.75
Conveyor 3       4.62
Hoop Driver 1   41.00`,
    },
    {
      t: "Dates and durations",
      goal: "In class Times, parse the char flare's start, measure to the 14:00 shift end with Duration, and print the duration, its minutes, and the start's day of week.",
      code: `import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Times {
    public static void main(String[] args) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        LocalDateTime start = LocalDateTime.parse("2026-11-07 13:41:15", fmt);
        LocalDateTime shiftEnd = LocalDateTime.of(2026, 11, 7, 14, 0);

        Duration down = Duration.between(start, shiftEnd);
        System.out.println(down);
        System.out.println(down.getSeconds() / 60.0 + " min");
        System.out.println(start.getDayOfWeek());
    }
}`,
      about: "LocalDateTime is a date and time with no time zone, which suits a plant clock. Duration.between measures the gap; printed, it uses the ISO form PT18M45S, the same format as HTML's time element. Dividing the seconds by 60.0 gives 18.75 minutes, the char flare's time inside shift A.",
      terms: [
        ["LocalDateTime", "LocalDateTime", "Date and time, no zone."],
        ["Duration.between", "Duration.between", "The time from one moment to another."],
        ["ofPattern", "DateTimeFormatter.ofPattern", "How the text is laid out."],
      ],
      out: `PT18M45S
18.75 min
SATURDAY`,
    },
    {
      t: "int overflow",
      goal: "In class Overflow, add 1 to Integer.MAX_VALUE as an int and as a long, then total a week of milliseconds with Math.addExact to catch overflow.",
      code: `public class Overflow {
    public static void main(String[] args) {
        int big = Integer.MAX_VALUE;
        System.out.println(big + 1);
        System.out.println((long) big + 1);

        int weekMs = 7 * 24 * 60 * 60 * 1000;
        System.out.println(weekMs);
        try {
            Math.addExact(weekMs, Integer.MAX_VALUE);
        } catch (ArithmeticException e) {
            System.out.println("overflow caught: " + e.getMessage());
        }
    }
}`,
      about: "An int tops out at 2,147,483,647 and wraps silently to a negative number, which turns a running total into nonsense with no error. long holds far more. A week in milliseconds still fits in an int, but 25 days does not, a real trap for uptime counters. Math.addExact throws instead of wrapping.",
      terms: [
        ["Integer.MAX_VALUE", "Integer.MAX_VALUE", "The largest int: 2,147,483,647."],
        ["(long)", "(long)", "Widens to 64 bits before adding."],
        ["addExact", "Math.addExact", "Adds, or throws on overflow."],
      ],
      out: `-2147483648
2147483648
604800000
overflow caught: integer overflow`,
    },
    {
      t: "BigDecimal for money",
      goal: "In class Money, compute 98 barrels × $42.50 with BigDecimal, then round 10.125 to cents with HALF_EVEN and HALF_UP, and show why new BigDecimal(0.1) is a trap.",
      code: `import java.math.BigDecimal;
import java.math.RoundingMode;

public class Money {
    public static void main(String[] args) {
        BigDecimal margin = new BigDecimal("42.50");
        System.out.println(margin.multiply(BigDecimal.valueOf(98)));

        BigDecimal x = new BigDecimal("10.125");
        System.out.println(x.setScale(2, RoundingMode.HALF_EVEN));
        System.out.println(x.setScale(2, RoundingMode.HALF_UP));

        System.out.println(new BigDecimal(0.1));
        System.out.println(new BigDecimal("0.1"));
    }
}`,
      about: "BigDecimal stores exact decimal digits, so money adds the way a ledger does. Build it from a string: new BigDecimal(0.1) captures the binary double's error in full. HALF_EVEN, banker's rounding, gives 10.12 and HALF_UP, Excel's and SQL Server's rule, gives 10.13: name the rule, or reports disagree by a cent. 98 barrels at the illustrative $42.50 is $4,165.00.",
      terms: [
        ["BigDecimal", "BigDecimal", "An exact decimal number."],
        ["setScale", "setScale(2, …)", "Rounds to 2 decimal places."],
        ["HALF_EVEN", "RoundingMode.HALF_EVEN", "Banker's rounding."],
        ["HALF_UP", "RoundingMode.HALF_UP", "Halves round away from zero."],
      ],
      out: `4165.00
10.12
10.13
0.1000000000000000055511151231257827021181583404541015625
0.1`,
    },
    {
      t: "Generic methods",
      goal: "In class Generics, write clamp<T extends Comparable<T>>(value, low, high). Clamp 75.0 and 5.0 to 20 to 60, then the whole number 45.",
      code: `public class Generics {
    static <T extends Comparable<T>> T clamp(T value, T low, T high) {
        if (value.compareTo(high) > 0) return high;
        if (value.compareTo(low) < 0) return low;
        return value;
    }

    public static void main(String[] args) {
        System.out.println(clamp(75.0, 20.0, 60.0));
        System.out.println(clamp(5.0, 20.0, 60.0));
        System.out.println(clamp(45, 20, 60));
    }
}`,
      about: "<T extends Comparable<T>> makes the method work for any type that can be compared, Double and Integer here, and refuses one that cannot. compareTo returns a negative, zero or positive number. The 20 to 60 limits are the setpoint clamp from the PLC lessons; the C# and C++ lanes build the same method.",
      terms: [
        ["<T extends Comparable<T>>", "Bounded type", "Any T that can compare itself with another T."],
        ["compareTo", "compareTo", "Below 0, 0 or above 0."],
      ],
      out: `60.0
20.0
45`,
    },
    {
      t: "Cumulative Pareto",
      goal: "In class ParetoCum, total the Pareto with a stream, then print each fault largest first with minutes, running percent, and \"vital\" if the running total before it was under 80%.",
      code: `import java.util.List;

public class ParetoCum {
    record Fault(String name, double minutes) {}

    public static void main(String[] args) {
        List<Fault> pareto = List.of(
            new Fault("Low air", 87.4), new Fault("Char flare", 70.0), new Fault("Hoop misfeed", 66.6),
            new Fault("Jam", 65.7), new Fault("E-stop", 10.8));

        double total = pareto.stream().mapToDouble(Fault::minutes).sum();
        double running = 0;
        for (Fault f : pareto) {
            boolean vital = running / total < 0.80;
            running += f.minutes();
            System.out.printf("%-13s%6.1f%7.1f%%%s%n", f.name(), f.minutes(), running / total * 100, vital ? "  vital" : "");
        }
    }
}`,
      about: "The same rule and the same four vital faults as every lane: a fault counts as vital when the line stood under 80% before it. The list is already sorted largest first, as the Comparator lesson would leave it. printf's %% prints a literal percent sign.",
      terms: [
        ["running", "Running total", "Minutes so far."],
        ["vital", "Vital few", "Under 80% before this fault."],
      ],
      out: `Low air        87.4   29.1%  vital
Char flare     70.0   52.4%  vital
Hoop misfeed   66.6   74.5%  vital
Jam            65.7   96.4%  vital
E-stop         10.8  100.0%`,
    },
  ],
});
