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
  ],
});
