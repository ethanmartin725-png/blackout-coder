// Foundations lane: Java
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
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
      goal: "In class Oee, compute availability 0.86 × performance 0.91 × quality 0.98 and print \"OEE:\" with one decimal and a percent sign.",
      code: `public class Oee {
    public static void main(String[] args) {
        double availability = 0.86;
        double performance = 0.91;
        double quality = 0.98;
        double oee = availability * performance * quality;
        System.out.printf("OEE: %.1f%%%n", oee * 100);
    }
}`,
      about: "printf fills placeholders in the string with the values after the comma. This prints OEE: 76.7%.",
      terms: [
        ["printf", "printf", "Prints using format codes."],
        [null, "%.1f", "A decimal number with 1 digit after the point."],
        [null, "%%", "A literal percent sign."],
        [null, "%n", "A newline that works on any operating system."],
      ],
      out: `OEE: 76.7%`,
    },
    {
      t: "Static method",
      goal: "In class Shift, add static double oee(a, p, q) and print oee(0.86, 0.91, 0.98) from main.",
      code: `public class Shift {
    static double oee(double a, double p, double q) {
        return a * p * q;
    }

    public static void main(String[] args) {
        System.out.println(oee(0.86, 0.91, 0.98));
    }
}`,
      about: "Methods sit inside the class. static means main can call it directly without creating an object first.",
      terms: [
        ["static", "static double oee", "A class-level method that returns a double."],
        ["return", "return", "Hands the value back to the caller."],
      ],
      out: `0.766948`,
    },
    {
      t: "If / else if",
      goal: "In class Rating, set oee 0.72 and print \"World class\" at 0.85+, \"Typical\" at 0.60+, else \"Needs work\".",
      code: `public class Rating {
    public static void main(String[] args) {
        double oee = 0.72;
        if (oee >= 0.85) {
            System.out.println("World class");
        } else if (oee >= 0.60) {
            System.out.println("Typical");
        } else {
            System.out.println("Needs work");
        }
    }
}`,
      about: "Java checks each condition in order and runs the first block that is true.",
      terms: [
        ["if", "if (…)", "Runs the block when the condition is true."],
        ["else", "else if / else", "Further checks, then a fallback."],
        [">=", ">=", "Greater than or equal to."],
      ],
      out: `Typical`,
    },
    {
      t: "Arrays and loops",
      goal: "In class Downtime, sum the int array {42, 15, 88, 7, 30} with an enhanced for and print \"Total: \" + total + \" min\".",
      code: `public class Downtime {
    public static void main(String[] args) {
        int[] minutes = {42, 15, 88, 7, 30};
        int total = 0;
        for (int m : minutes) {
            total += m;
        }
        System.out.println("Total: " + total + " min");
    }
}`,
      about: "The enhanced for reads each element in turn. With text, + joins pieces into one string.",
      terms: [
        ["int", "int[]", "An array of ints."],
        ["for", "for (int m : minutes)", "Enhanced for: read each element in turn."],
        ["+", "+", "With strings, + joins (concatenates) text."],
      ],
      out: `Total: 182 min`,
    },
    {
      t: "HashMap",
      goal: "In class Lines, store \"Line 1\" → 412 and \"Line 2\" → 389 in a HashMap and print each as \"line: count\".",
      code: `import java.util.HashMap;
import java.util.Map;

public class Lines {
    public static void main(String[] args) {
        Map<String, Integer> barrels = new HashMap<>();
        barrels.put("Line 1", 412);
        barrels.put("Line 2", 389);
        for (String line : barrels.keySet()) {
            System.out.println(line + ": " + barrels.get(line));
        }
    }
}`,
      about: "A map stores key/value pairs. HashMap does not keep insertion order, so the lines may print in either order.",
      terms: [
        ["import", "import", "Brings in a class from another package."],
        ["Map", "Map<String, Integer>", "Key/value collection type. Integer is the object form of int."],
        ["HashMap", "new HashMap<>()", "Creates the map. The empty <> lets Java infer the types."],
        ["put", ".put / .get", "Add a pair; read a value by key."],
        ["keySet", ".keySet()", "All the keys, for looping."],
      ],
      out: `Line 2: 389
Line 1: 412`,
    },
  ],
});
