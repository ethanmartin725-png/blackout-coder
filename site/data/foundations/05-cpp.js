// Foundations lane: C++
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Numbers come from the canonical sample plant. Outputs: node tools/output-checks/foundations/run.mjs
BC.addLane({
  id: "cpp",
  name: "C++",
  lang: "cpp",
  lessons: [
    {
      t: "Hello from main",
      goal: "Print \"Good morning, cooperage\" with a newline from main().",
      code: `#include <iostream>

int main() {
    std::cout << "Good morning, cooperage\\n";
    return 0;
}`,
      about: "Every C++ program starts in main(). The include line brings in console output. return 0 tells the operating system the program finished cleanly.",
      terms: [
        ["include", "#include", "Pulls in a library header before compiling. <iostream> gives console input and output."],
        ["main", "int main()", "Where every C++ program starts."],
        ["cout", "std::cout <<", "Sends values to the console. std:: is the standard namespace."],
        [null, "\\n", "Newline character inside a string."],
      ],
      out: `Good morning, cooperage`,
    },
    {
      t: "Do the math",
      goal: "In main, declare a 0.988, p 0.749, q 0.985 on one line, compute oee, set fixed output with 1 decimal, and print \"OEE: \" with oee * 100 and \"%\".",
      code: `#include <iomanip>
#include <iostream>

int main() {
    double a = 0.988, p = 0.749, q = 0.985;
    double oee = a * p * q;
    std::cout << std::fixed << std::setprecision(1);
    std::cout << "OEE: " << oee * 100 << "%\\n";
    return 0;
}`,
      about: "One line declares three doubles: Hoop Driver 1's sample week from the OEE Loss Report track, rounded to 3 places. Each << adds the next piece to the output, so text and numbers can be chained. Without the formatting line, cout prints 6 significant digits: 72.8912%. std::fixed with setprecision(1) gives one decimal place, 72.9%, the same as the other languages, and it stays set for every number printed after it.",
      terms: [
        ["double", "double a = …, p = …", "Declares several variables of one type on one line."],
        ["<<", "<< chaining", "Each << appends the next value to the output."],
        ["std::fixed", "std::fixed", "Prints numbers with a fixed number of decimal places instead of significant digits."],
        ["setprecision", "std::setprecision(1)", "How many decimals to print. Needs #include <iomanip>."],
      ],
      out: `OEE: 72.9%`,
    },
    {
      t: "Write a function",
      goal: "Write double oee(a, p, q) above main that returns a * p * q. In main, set 1-decimal fixed output and print \"OEE is \" with oee(0.988, 0.749, 0.985) * 100 and \"%\".",
      code: `#include <iomanip>
#include <iostream>

double oee(double a, double p, double q) {
    return a * p * q;
}

int main() {
    std::cout << std::fixed << std::setprecision(1);
    std::cout << "OEE is " << oee(0.988, 0.749, 0.985) * 100 << "%\\n";
}`,
      about: "Functions must be declared before they are used, so oee sits above main. main is the one function where leaving out return means return 0. The output matches the other languages' OEE lessons: 72.9%.",
      terms: [
        ["oee", "double oee(…)", "Return type, name, typed parameters."],
        ["return", "return", "Hands the value back to the caller."],
      ],
      out: `OEE is 72.9%`,
    },
    {
      t: "Counting loop",
      goal: "Sum Hoop Driver 1's shift A fault minutes {7.5, 18.5, 15.0} with a counting for loop and print \"Total: \" with the minutes.",
      code: `#include <iostream>

int main() {
    double downtime[] = {7.5, 18.5, 15.0};
    double total = 0;
    for (int i = 0; i < 3; i++) {
        total += downtime[i];
    }
    std::cout << "Total: " << total << " min\\n";
}`,
      about: "The classic loop: start i at 0, keep going while i is under 3, add 1 each pass. downtime[i] reads the item at position i. Reading downtime[3] would run past the end of the array, and C++ does not stop you, so the bound must match the array size. The 41 minutes matches the Shift Handoff track.",
      terms: [
        ["downtime", "int downtime[]", "A fixed-size array. Its size comes from the list: 5 items."],
        ["for", "for (init; test; step)", "Counting loop with a start, a keep-going test, and a step."],
        ["++", "i++", "Increment. Adds 1 to i."],
        ["[", "[i]", "Index into the array. The first item is [0]."],
      ],
      out: `Total: 41 min`,
    },
    {
      t: "Vectors",
      goal: "Put shift A barrels 301, 352, 274 in a std::vector, find the largest with a range-based for, and print \"Most barrels: \" with it.",
      code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> barrels = {301, 352, 274};
    int best = 0;
    for (int b : barrels) {
        if (b > best) best = b;
    }
    std::cout << "Most barrels: " << best << "\\n";
}`,
      about: "A vector is an array that can grow. The range-based for visits each element without an index. These are shift A's barrels for Char Station 2, Conveyor 3 and Hoop Driver 1.",
      terms: [
        ["vector", "std::vector<int>", "A resizable array from <vector>."],
        ["for", "for (int b : barrels)", "Range-based for: visits each element in order."],
        ["if", "if (…) one line", "An if with a single statement can skip the braces."],
      ],
      out: `Most barrels: 352`,
    },
    {
      t: "Structs",
      goal: "Define struct Machine with name, good, total, and a const quality() that returns good / total as a double. Print Hoop Driver 1 with 6314 good of 6410.",
      code: `#include <iostream>
#include <string>

struct Machine {
    std::string name;
    int good;
    int total;

    double quality() const {
        return static_cast<double>(good) / total;
    }
};

int main() {
    Machine hoop{"Hoop Driver 1", 6314, 6410};
    std::cout << hoop.name << ": " << hoop.quality() << "\\n";
}`,
      about: "A struct groups related fields and functions into one type. The cast keeps the division from dropping decimals. Note the semicolon after the closing brace. The counts are Hoop Driver 1's week from the OEE Loss Report track, and 0.985023 is the quality factor the OEE lessons round to 0.985.",
      terms: [
        ["struct", "struct", "Groups related data (and functions) into one type. Ends with };"],
        ["string", "std::string", "Text type from <string>."],
        ["const", "const", "Promises this function won't change the object."],
        ["static_cast", "static_cast<double>", "Converts int to double so the division keeps decimals."],
        ["hoop", "Machine hoop{…}", "Creates a Machine and fills its fields in the order they are declared."],
      ],
      out: `Hoop Driver 1: 0.985023`,
    },
  ],
});
