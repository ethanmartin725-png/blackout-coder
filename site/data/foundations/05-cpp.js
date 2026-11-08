// Foundations lane: C++
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
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
    },
    {
      t: "Do the math",
      goal: "In main, declare a 0.86, p 0.91, q 0.98 on one line, compute oee, and print \"OEE: \" with oee * 100 and \"%\".",
      code: `#include <iostream>

int main() {
    double a = 0.86, p = 0.91, q = 0.98;
    double oee = a * p * q;
    std::cout << "OEE: " << oee * 100 << "%\\n";
    return 0;
}`,
      about: "One line declares three doubles. Each << adds the next piece to the output, so text and numbers can be chained.",
      terms: [
        ["double", "double a = …, p = …", "Declares several variables of one type on one line."],
        ["<<", "<< chaining", "Each << appends the next value to the output."],
      ],
    },
    {
      t: "Write a function",
      goal: "Write double oee(a, p, q) above main that returns a * p * q. Print oee(0.86, 0.91, 0.98).",
      code: `#include <iostream>

double oee(double a, double p, double q) {
    return a * p * q;
}

int main() {
    std::cout << oee(0.86, 0.91, 0.98) << "\\n";
}`,
      about: "Functions must be declared before they are used, so oee sits above main. main is the one function where leaving out return means return 0.",
      terms: [
        ["oee", "double oee(…)", "Return type, name, typed parameters."],
        ["return", "return", "Hands the value back to the caller."],
      ],
    },
    {
      t: "Counting loop",
      goal: "Sum the array {42, 15, 88, 7, 30} with a counting for loop and print \"Total: \" with the minutes.",
      code: `#include <iostream>

int main() {
    int downtime[] = {42, 15, 88, 7, 30};
    int total = 0;
    for (int i = 0; i < 5; i++) {
        total += downtime[i];
    }
    std::cout << "Total: " << total << " min\\n";
}`,
      about: "The classic loop: start i at 0, keep going while i is under 5, add 1 each pass. downtime[i] reads the item at position i.",
      terms: [
        ["downtime", "int downtime[]", "A fixed-size array. Its size comes from the list: 5 items."],
        ["for", "for (init; test; step)", "Counting loop with a start, a keep-going test, and a step."],
        ["++", "i++", "Increment. Adds 1 to i."],
        ["[", "[i]", "Index into the array. The first item is [0]."],
      ],
    },
    {
      t: "Vectors",
      goal: "Put 412, 389, 455 in a std::vector, find the largest with a range-based for, and print \"Best line: \" with it.",
      code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> barrels = {412, 389, 455};
    int best = 0;
    for (int b : barrels) {
        if (b > best) best = b;
    }
    std::cout << "Best line: " << best << "\\n";
}`,
      about: "A vector is an array that can grow. The range-based for visits each element without an index.",
      terms: [
        ["vector", "std::vector<int>", "A resizable array from <vector>."],
        ["for", "for (int b : barrels)", "Range-based for: visits each element in order."],
        ["if", "if (…) one line", "An if with a single statement can skip the braces."],
      ],
    },
    {
      t: "Structs",
      goal: "Define struct Machine with name, good, total, and a const quality() that returns good / total as a double. Print \"Jointer 2\" with 940 of 1000.",
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
    Machine jointer{"Jointer 2", 940, 1000};
    std::cout << jointer.name << ": " << jointer.quality() << "\\n";
}`,
      about: "A struct groups related fields and functions into one type. The cast keeps the division from dropping decimals. Note the semicolon after the closing brace.",
      terms: [
        ["struct", "struct", "Groups related data (and functions) into one type. Ends with };"],
        ["string", "std::string", "Text type from <string>."],
        ["const", "const", "Promises this function won't change the object."],
        ["static_cast", "static_cast<double>", "Converts int to double so the division keeps decimals."],
        ["jointer", "Machine jointer{…}", "Creates an object and fills its fields in order."],
      ],
    },
  ],
});
