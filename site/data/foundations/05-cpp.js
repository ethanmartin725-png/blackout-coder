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
    {
      t: "Formatted output",
      goal: "Print each shift A machine with its barrels and share of target in aligned columns: name left in 15, barrels right in 6, percent right in 8 with 1 decimal.",
      code: `#include <iomanip>
#include <iostream>
#include <string>

int main() {
    std::string machines[] = {"Char Station 2", "Conveyor 3", "Hoop Driver 1"};
    int barrels[] = {301, 352, 274};
    double targets[] = {375, 450, 412.5};

    std::cout << std::fixed << std::setprecision(1);
    for (int i = 0; i < 3; i++) {
        std::cout << std::left << std::setw(15) << machines[i]
                  << std::right << std::setw(6) << barrels[i]
                  << std::setw(8) << barrels[i] / targets[i] * 100 << "%\\n";
    }
}`,
      about: "Stream manipulators from <iomanip> shape the next value: setw sets its width, left and right align it, and fixed with setprecision(1) gives one decimal. setw applies to one value only; the others stick until changed. Each target is the ideal rate times 7.5 paid hours.",
      terms: [
        ["setw", "std::setw(15)", "Width of the next value only."],
        ["setprecision", "std::setprecision(1)", "Decimals shown, with std::fixed."],
        ["left", "std::left / std::right", "Alignment inside the width."],
      ],
      out: `Char Station 2    301    80.3%
Conveyor 3        352    78.2%
Hoop Driver 1     274    66.4%`,
    },
    {
      t: "switch on a state code",
      goal: "Write stateText(int) with a switch: 1 RUNNING, 2 JAMMED, 3 IDLE, default UNKNOWN. Print it for 1, 2, 3 and 0.",
      code: `#include <iostream>
#include <string>

std::string stateText(int state) {
    switch (state) {
        case 1: return "RUNNING";
        case 2: return "JAMMED";
        case 3: return "IDLE";
        default: return "UNKNOWN";
    }
}

int main() {
    for (int s : {1, 2, 3, 0}) {
        std::cout << s << " -> " << stateText(s) << "\\n";
    }
}`,
      about: "switch jumps to the case matching the value. Each case here returns, so control never falls through into the next one; in a case without return or break, it would. The codes are Conv_State from the PLC lessons. A braced list can be looped over directly.",
      terms: [
        ["switch", "switch", "Jumps to the matching case."],
        ["case", "case 1:", "One value to match."],
        ["default", "default", "Runs when nothing matches."],
      ],
      out: `1 -> RUNNING
2 -> JAMMED
3 -> IDLE
0 -> UNKNOWN`,
    },
    {
      t: "while loops",
      goal: "Load 130 waiting barrels into 48-barrel trailers with a while loop, printing each trailer's load and what is left.",
      code: `#include <algorithm>
#include <iostream>

int main() {
    int waiting = 130;
    int trailer = 0;
    while (waiting > 0) {
        int load = std::min(48, waiting);
        waiting -= load;
        trailer++;
        std::cout << "Trailer " << trailer << ": " << load << " barrels, " << waiting << " left\\n";
    }
}`,
      about: "while checks its condition before every pass, so 0 barrels waiting books no trailers. std::min, from <algorithm>, keeps the last trailer from taking more than is left. 48 per trailer is illustrative, the same as in the other lanes.",
      terms: [
        ["while", "while (…)", "Repeats while the condition is true."],
        ["std::min", "std::min", "The smaller of two values."],
      ],
      out: `Trailer 1: 48 barrels, 82 left
Trailer 2: 48 barrels, 34 left
Trailer 3: 34 barrels, 0 left`,
    },
    {
      t: "Strings",
      goal: "From \"Conveyor 3|JAM|09:08:52|4.62\", take the machine before the first '|', print it with its length, print what follows the last '|', build \"Conveyor 3 jam\", and test whether the line contains JAM.",
      code: `#include <iostream>
#include <string>

int main() {
    std::string line = "Conveyor 3|JAM|09:08:52|4.62";

    std::string machine = line.substr(0, line.find('|'));
    std::cout << machine << " (" << machine.size() << " chars)\\n";
    std::cout << line.substr(line.rfind('|') + 1) << "\\n";

    std::string label = machine + " jam";
    std::cout << label << "\\n";
    std::cout << std::boolalpha << (line.find("JAM") != std::string::npos) << "\\n";
}`,
      about: "find returns the position of the first match and rfind the last; substr(start, length) copies a piece. When find finds nothing it returns std::string::npos, so compare with that rather than with 0 or -1. + joins strings. boolalpha prints true and false instead of 1 and 0.",
      terms: [
        ["find", "find", "Position of the first match, or npos."],
        ["substr", "substr(start, len)", "Copies part of the string."],
        ["npos", "std::string::npos", "\"Not found\"."],
      ],
      out: `Conveyor 3 (10 chars)
4.62
Conveyor 3 jam
true`,
    },
    {
      t: "Parse with stringstream",
      goal: "Split \"Conveyor 3|JAM|2026-11-07 09:08:52|4.62\" on '|' with getline, convert the minutes with std::stod, and print the machine, code, time of day and minutes plus 1.",
      code: `#include <iostream>
#include <sstream>
#include <string>

int main() {
    std::string line = "Conveyor 3|JAM|2026-11-07 09:08:52|4.62";
    std::stringstream ss(line);

    std::string machine, code, start, minutesText;
    std::getline(ss, machine, '|');
    std::getline(ss, code, '|');
    std::getline(ss, start, '|');
    std::getline(ss, minutesText, '|');

    double minutes = std::stod(minutesText);
    std::cout << machine << " " << code << " at " << start.substr(11) << " for " << minutes + 1 << " min\\n";
}`,
      about: "A stringstream reads from a string the way cin reads from the keyboard. getline with a third argument reads up to that character, so each call takes the next field. std::stod turns text into a double and throws if the text is not a number. The other lanes parse the same Conveyor 3 jam line.",
      terms: [
        ["stringstream", "std::stringstream", "Reads from a string like a stream."],
        ["getline", "std::getline(ss, x, '|')", "Reads up to the next '|'."],
        ["stod", "std::stod", "Text to double."],
      ],
      out: `Conveyor 3 JAM at 09:08:52 for 5.62 min`,
    },
    {
      t: "References",
      goal: "Write addByValue(int) and addByRef(int&), each adding 1. Call both on barrels = 352 and print it after each, then total a vector through a const reference.",
      code: `#include <iostream>
#include <vector>

void addByValue(int count) {
    count += 1;
    std::cout << "inside by value: " << count << "\\n";
}

void addByRef(int& count) {
    count += 1;
}

double total(const std::vector<double>& minutes) {
    double sum = 0;
    for (double m : minutes) sum += m;
    return sum;
}

int main() {
    int barrels = 352;
    addByValue(barrels);
    std::cout << "after by value: " << barrels << "\\n";
    addByRef(barrels);
    std::cout << "after by reference: " << barrels << "\\n";
    std::cout << "Hoop Driver 1 minutes: " << total({7.5, 18.5, 15.0}) << "\\n";
}`,
      about: "By default a function gets a copy, so changing it changes nothing outside. & makes the parameter another name for the caller's variable, so the change sticks. const& passes a big object, like a vector of thousands of readings, without copying it, and promises not to change it: the usual way to pass anything larger than a number.",
      terms: [
        ["int& count", "int&", "A reference: another name for the caller's variable."],
        ["const std::vector<double>&", "const&", "No copy, and no changes allowed."],
      ],
      out: `inside by value: 353
after by value: 352
after by reference: 353
Hoop Driver 1 minutes: 41`,
    },
    {
      t: "constexpr and std::array",
      goal: "Declare constexpr MACHINES = 3 and an std::array of the ideal rates. Print each rate, the size, and what at(3) does.",
      code: `#include <array>
#include <iostream>
#include <stdexcept>

constexpr int MACHINES = 3;

int main() {
    std::array<int, MACHINES> idealRate = {60, 55, 50};

    for (int rate : idealRate) std::cout << rate << "\\n";
    std::cout << "size: " << idealRate.size() << "\\n";

    try {
        std::cout << idealRate.at(3) << "\\n";
    } catch (const std::out_of_range&) {
        std::cout << "at(3) is out of range\\n";
    }
}`,
      about: "constexpr makes a value known at compile time, so it can size an array. std::array is a fixed-size array that knows its size. at() checks the index and throws; [] does not check, and reading idealRate[3] is undefined behavior, the kind of bug that works on the bench and fails in the field. The rates are the canonical ideal rates.",
      terms: [
        ["constexpr", "constexpr", "A value fixed at compile time."],
        ["std::array", "std::array<int, 3>", "A fixed-size array that knows its size."],
        ["at", "at(3)", "Index with a range check."],
      ],
      out: `60
55
50
size: 3
at(3) is out of range`,
    },
    {
      t: "std::map",
      goal: "Store shift A barrels by machine in a std::map, print them in key order, then look up Hoop Driver 2 safely with find.",
      code: `#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> barrels = {
        {"Hoop Driver 1", 274},
        {"Conveyor 3", 352},
        {"Char Station 2", 301},
    };

    for (const auto& [machine, count] : barrels) {
        std::cout << machine << ": " << count << "\\n";
    }

    auto it = barrels.find("Hoop Driver 2");
    std::cout << (it == barrels.end() ? "no Hoop Driver 2" : "found") << "\\n";
    std::cout << "machines: " << barrels.size() << "\\n";
}`,
      about: "A std::map keeps its keys sorted, so the machines print alphabetically whatever order they were added in. find returns end() when the key is missing. Reading barrels[\"Hoop Driver 2\"] would silently add the key with a value of 0, a classic map bug.",
      terms: [
        ["std::map", "std::map<std::string, int>", "Sorted key-value pairs."],
        ["find", "find", "An iterator to the entry, or end()."],
        ["end", "end()", "\"Not found\" for find."],
      ],
      out: `Char Station 2: 301
Conveyor 3: 352
Hoop Driver 1: 274
no Hoop Driver 2
machines: 3`,
    },
    {
      t: "Counting with unordered_map",
      goal: "Count shift A's fault names in an unordered_map, then print the count for Low air, Jam and E-stop.",
      code: `#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>

int main() {
    std::vector<std::string> faults = {"Jam", "Hoop misfeed", "Low air", "Low air", "Char flare"};

    std::unordered_map<std::string, int> counts;
    for (const auto& f : faults) counts[f]++;

    for (const std::string name : {"Low air", "Jam", "E-stop"}) {
        auto it = counts.find(name);
        std::cout << name << ": " << (it == counts.end() ? 0 : it->second) << "\\n";
    }
}`,
      about: "counts[f]++ adds the key at 0 the first time and then counts up, the shortest way to tally. unordered_map is faster than map for lookups but keeps no order, so this program looks up the names it wants instead of printing the map. E-stop never happened on shift A, so find comes back empty.",
      terms: [
        ["unordered_map", "std::unordered_map", "Key-value pairs with fast lookup and no order."],
        ["counts[f]++", "counts[f]++", "Creates the entry at 0 if needed, then adds 1."],
        ["second", "it->second", "The value of the entry found."],
      ],
      out: `Low air: 2
Jam: 1
E-stop: 0`,
    },
    {
      t: "Pairs and structured bindings",
      goal: "Store the fault Pareto as a vector of (fault, minutes) pairs and print each with a structured binding, then the total.",
      code: `#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<std::string, double>> pareto = {
        {"Low air", 87.4}, {"Char flare", 70.0}, {"Hoop misfeed", 66.6}, {"Jam", 65.7}, {"E-stop", 10.8},
    };

    double total = 0;
    for (const auto& [fault, minutes] : pareto) {
        std::cout << fault << ": " << minutes << "\\n";
        total += minutes;
    }
    std::cout << "total: " << total << "\\n";
}`,
      about: "std::pair holds two values, first and second. A structured binding, auto& [fault, minutes], names them directly, which reads far better than p.first and p.second. These are the DB Pulls track's Pareto minutes across all 47 faults.",
      terms: [
        ["pair", "std::pair", "Two values: first and second."],
        ["[fault, minutes]", "Structured binding", "Names the parts of a pair or struct."],
      ],
      out: `Low air: 87.4
Char flare: 70
Hoop misfeed: 66.6
Jam: 65.7
E-stop: 10.8
total: 300.5`,
    },
    {
      t: "Sort with a lambda",
      goal: "Sort the Pareto pairs by minutes, largest first, with std::sort and a lambda, and print them.",
      code: `#include <algorithm>
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<std::string, double>> pareto = {
        {"Jam", 65.7}, {"Low air", 87.4}, {"E-stop", 10.8}, {"Char flare", 70.0}, {"Hoop misfeed", 66.6},
    };

    std::sort(pareto.begin(), pareto.end(), [](const auto& a, const auto& b) {
        return a.second > b.second;
    });

    for (const auto& [fault, minutes] : pareto) {
        std::cout << fault << " " << minutes << "\\n";
    }
}`,
      about: "std::sort takes a range and a compare function that returns true when a should come before b. The lambda, written in place, compares minutes with >, so the largest comes first. Without a compare function, pairs sort by their first part: alphabetically by fault.",
      terms: [
        ["sort", "std::sort", "Sorts a range in place."],
        ["[]", "[](…) { … }", "A lambda: a function written in place."],
        ["begin", "begin() / end()", "The range to sort: the whole vector."],
      ],
      out: `Low air 87.4
Char flare 70
Hoop misfeed 66.6
Jam 65.7
E-stop 10.8`,
    },
    {
      t: "Cumulative Pareto",
      goal: "Total the sorted Pareto with std::accumulate, then print each fault's minutes, the running percent, and \"vital\" if the running total before it was under 80%.",
      code: `#include <iomanip>
#include <iostream>
#include <numeric>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<std::pair<std::string, double>> pareto = {
        {"Low air", 87.4}, {"Char flare", 70.0}, {"Hoop misfeed", 66.6}, {"Jam", 65.7}, {"E-stop", 10.8},
    };

    double total = std::accumulate(pareto.begin(), pareto.end(), 0.0,
        [](double sum, const auto& p) { return sum + p.second; });

    double running = 0;
    std::cout << std::fixed << std::setprecision(1);
    for (const auto& [fault, minutes] : pareto) {
        bool vital = running / total < 0.80;
        running += minutes;
        std::cout << std::left << std::setw(13) << fault << std::right << std::setw(6) << minutes
                  << std::setw(7) << running / total * 100 << "%" << (vital ? "  vital" : "") << "\\n";
    }
}`,
      about: "accumulate folds a range into one value. Its start value, 0.0, sets the result's type: start with 0 and the sum is an int, dropping every decimal, a common trap. A fault counts as vital when the line stood under 80% before it. Same four faults as every other lane.",
      terms: [
        ["accumulate", "std::accumulate", "Folds a range into one value."],
        ["0.0", "Start value", "Makes the sum a double. 0 would make it an int."],
        ["vital", "Vital few", "Under 80% before this fault."],
      ],
      out: `Low air        87.4   29.1%  vital
Char flare     70.0   52.4%  vital
Hoop misfeed   66.6   74.5%  vital
Jam            65.7   96.4%  vital
E-stop         10.8  100.0%`,
    },
    {
      t: "count_if and find_if",
      goal: "From shift A's faults, count those of 15 minutes or more with count_if, and find the first one on Char Station 2 with find_if.",
      code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Fault {
    std::string machine;
    std::string name;
    double minutes;
};

int main() {
    std::vector<Fault> faults = {
        {"Conveyor 3", "Jam", 4.62},
        {"Hoop Driver 1", "Hoop misfeed", 7.5},
        {"Hoop Driver 1", "Low air", 18.5},
        {"Hoop Driver 1", "Low air", 15.0},
        {"Char Station 2", "Char flare", 18.75},
    };

    auto longOnes = std::count_if(faults.begin(), faults.end(), [](const Fault& f) { return f.minutes >= 15; });
    std::cout << longOnes << " faults of 15 min or more\\n";

    auto it = std::find_if(faults.begin(), faults.end(), [](const Fault& f) { return f.machine == "Char Station 2"; });
    if (it != faults.end()) std::cout << "Char Station 2: " << it->name << ", " << it->minutes << " min\\n";
}`,
      about: "The algorithms in <algorithm> replace hand-written loops: count_if counts the items a test accepts, find_if returns the first one, or end() when none does. Always check against end() before using the result. The faults are shift A's.",
      terms: [
        ["count_if", "std::count_if", "How many items pass the test."],
        ["find_if", "std::find_if", "The first item that passes, or end()."],
      ],
      out: `3 faults of 15 min or more
Char Station 2: Char flare, 18.75 min`,
    },
    {
      t: "Classes",
      goal: "Write class Machine with private name and rate, a constructor, and public name(), target(hours) and share(barrels). Print each machine's target and shift A share.",
      code: `#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

class Machine {
public:
    Machine(std::string name, double rateHr) : name_(name), rateHr_(rateHr) {}

    const std::string& name() const { return name_; }
    double target(double hours = 7.5) const { return rateHr_ * hours; }
    double share(int barrels) const { return barrels / target(); }

private:
    std::string name_;
    double rateHr_;
};

int main() {
    std::vector<Machine> plant = {{"Conveyor 3", 60}, {"Hoop Driver 1", 55}, {"Char Station 2", 50}};
    int barrels[] = {352, 274, 301};

    std::cout << std::fixed << std::setprecision(1);
    for (int i = 0; i < 3; i++) {
        std::cout << plant[i].name() << ": target " << plant[i].target()
                  << ", " << plant[i].share(barrels[i]) * 100 << "%\\n";
    }
}`,
      about: "A class keeps its data private, so the only way to use a Machine is through its public functions. Nothing outside can set a rate to something silly halfway through a shift. The : name_(name) list fills the members before the constructor body runs. const after a function promises it changes nothing.",
      terms: [
        ["class", "class", "A type with private data and public functions."],
        ["private", "private:", "Only the class's own functions can see these."],
        ["name_(name)", "Member initializer list", "Sets members as the object is built."],
      ],
      out: `Conveyor 3: target 450.0, 78.2%
Hoop Driver 1: target 412.5, 66.4%
Char Station 2: target 375.0, 80.3%`,
    },
    {
      t: "enum class",
      goal: "Declare enum class MachineState with Running = 1, Jammed = 2, Idle = 3. Convert 2 into a state, test it, and print its number.",
      code: `#include <iostream>

enum class MachineState { Running = 1, Jammed = 2, Idle = 3 };

int main() {
    MachineState s = static_cast<MachineState>(2);

    if (s == MachineState::Jammed) std::cout << "jammed\\n";
    std::cout << static_cast<int>(s) << "\\n";
    std::cout << static_cast<int>(MachineState::Idle) << "\\n";
}`,
      about: "enum class gives names to the PLC's state codes. Unlike an old plain enum, it does not turn into an int by itself and its names stay inside MachineState::, so a state cannot be added to a barrel count by mistake. Converting either way takes an explicit static_cast.",
      terms: [
        ["enum class", "enum class", "Named values with their own type."],
        ["MachineState::Jammed", "Scoped name", "Values are written with the enum's name."],
        ["static_cast", "static_cast<int>", "Explicit conversion to or from int."],
      ],
      out: `jammed
2
3`,
    },
    {
      t: "std::optional",
      goal: "Write downMinutes(start, end) where end is std::optional<double> minutes after midnight. Measure the Conveyor 3 jam and the open char flare, using value_or for the 14:05 run time.",
      code: `#include <iostream>
#include <optional>

double downMinutes(double start, std::optional<double> end, double now) {
    return end.value_or(now) - start;
}

int main() {
    double now = 14 * 60 + 5;
    std::optional<double> jamEnd = 9 * 60 + 13 + 29 / 60.0;
    std::optional<double> flareEnd;

    std::cout << "jam open: " << std::boolalpha << !jamEnd.has_value() << "\\n";
    std::cout << "flare open: " << !flareEnd << "\\n";
    std::cout << "flare down so far: " << downMinutes(13 * 60 + 41 + 15 / 60.0, flareEnd, now) << " min\\n";
}`,
      about: "std::optional holds a value or nothing, which says \"this fault has no end time yet\" more clearly than a magic number like -1. value_or supplies a fallback. The open char flare is measured to the 14:05 run time: 23.75 minutes, the Shift Handoff's time down so far. Times here are minutes after midnight.",
      terms: [
        ["optional", "std::optional<double>", "A double, or nothing."],
        ["value_or", "value_or", "The value, or the fallback if empty."],
        ["has_value", "has_value()", "True if there is a value."],
      ],
      out: `jam open: false
flare open: true
flare down so far: 23.75 min`,
    },
    {
      t: "Exceptions",
      goal: "Write a Machine constructor that throws std::invalid_argument for a rate of 0 or less. Create Conveyor 3, then catch the error from a negative rate.",
      code: `#include <iostream>
#include <stdexcept>
#include <string>

struct Machine {
    std::string name;
    double rateHr;

    Machine(std::string n, double rate) : name(n), rateHr(rate) {
        if (rate <= 0) throw std::invalid_argument("ideal rate must be above 0");
    }
};

int main() {
    try {
        Machine conveyor("Conveyor 3", 60);
        std::cout << conveyor.name << " ok\\n";
        Machine bad("Hoop Driver 1", -55);
        std::cout << "never printed\\n";
    } catch (const std::invalid_argument& e) {
        std::cout << "rejected: " << e.what() << "\\n";
    }
}`,
      about: "throw stops the constructor, so a Machine with a negative rate is never created; control jumps to the matching catch. Catch by const reference to avoid copying and to keep the exact type. what() returns the message. Embedded code often turns exceptions off to save space, and reports errors with return codes instead.",
      terms: [
        ["throw", "throw", "Stops and hands an error to the nearest matching catch."],
        ["invalid_argument", "std::invalid_argument", "A standard error type for bad inputs."],
        ["what", "what()", "The error's message."],
      ],
      out: `Conveyor 3 ok
rejected: ideal rate must be above 0`,
    },
    {
      t: "unique_ptr",
      goal: "Write a Sensor struct that prints when it opens and closes. Create one with std::make_unique inside a block and show it closes when the block ends.",
      code: `#include <iostream>
#include <memory>
#include <string>

struct Sensor {
    std::string name;
    Sensor(std::string n) : name(n) { std::cout << "open " << name << "\\n"; }
    ~Sensor() { std::cout << "close " << name << "\\n"; }
};

int main() {
    {
        auto eye = std::make_unique<Sensor>("Conveyor 3 eye");
        std::cout << "reading " << eye->name << "\\n";
    }
    std::cout << "after the block\\n";
}`,
      about: "A unique_ptr owns an object made on the heap and deletes it when the pointer goes out of scope, so nothing leaks even if the code returns early or throws. ~Sensor is the destructor: the place to close a port or release a device. Tying cleanup to scope like this is called RAII, and it is how C++ manages files, locks and connections.",
      terms: [
        ["auto eye", "std::unique_ptr<Sensor>", "eye's type: owns the Sensor and deletes it automatically."],
        ["make_unique", "std::make_unique", "Creates the object and its owner together."],
        ["~Sensor", "Destructor", "Runs when the object is destroyed."],
      ],
      out: `open Conveyor 3 eye
reading Conveyor 3 eye
close Conveyor 3 eye
after the block`,
    },
    {
      t: "Function templates",
      goal: "Write clampValue<T>(value, low, high). Clamp 75.0 and 5.0 to the 20 to 60 setpoint range, then the whole number 45.",
      code: `#include <iostream>

template <typename T>
T clampValue(T value, T low, T high) {
    if (value > high) return high;
    if (value < low) return low;
    return value;
}

int main() {
    std::cout << clampValue(75.0, 20.0, 60.0) << "\\n";
    std::cout << clampValue(5.0, 20.0, 60.0) << "\\n";
    std::cout << clampValue(45, 20, 60) << "\\n";
}`,
      about: "A template is a recipe the compiler fills in for each type it is used with: one clampValue for double and one for int, both from the same code. All three arguments must have the same T, so clampValue(45, 20.0, 60.0) will not compile. C++17 already has std::clamp; the 20 to 60 limits are the setpoint clamp from the PLC lessons.",
      terms: [
        ["template", "template <typename T>", "Makes T a type filled in at each use."],
        ["T", "T", "Whatever type the caller uses."],
      ],
      out: `60
20
45`,
    },
    {
      t: "Integer division",
      goal: "Compute 352 / 450 as ints, then as a percent with ints, then with a cast to double.",
      code: `#include <iostream>

int main() {
    int barrels = 352;
    int target = 450;

    std::cout << barrels / target << "\\n";
    std::cout << barrels * 100 / target << "%\\n";
    std::cout << static_cast<double>(barrels) / target * 100 << "%\\n";
}`,
      about: "Dividing two ints throws away the remainder, so 352 / 450 is 0. Multiplying by 100 first gives 78, a whole-number percent, which is how small controllers often work to avoid floating point. Casting one side to double keeps the decimals: 78.2222, Conveyor 3's shift A share of target.",
      terms: [
        ["/", "int / int", "Whole-number division: the remainder is dropped."],
        ["static_cast<double>", "static_cast<double>", "Converts before dividing so decimals are kept."],
      ],
      out: `0
78%
78.2222%`,
    },
    {
      t: "Counter wraparound",
      goal: "Start a uint16_t count at 65534 and add 1 three times, printing each. Then compute barrels made between readings 65530 and 3 across the wrap.",
      code: `#include <cstdint>
#include <iostream>

int main() {
    std::uint16_t count = 65534;
    for (int i = 0; i < 3; i++) {
        count++;
        std::cout << count << "\\n";
    }

    std::uint16_t before = 65530;
    std::uint16_t now = 3;
    std::uint16_t made = static_cast<std::uint16_t>(now - before);
    std::cout << "made since last read: " << made << "\\n";
}`,
      about: "A uint16_t holds 0 to 65535 and wraps to 0 after that, like a 16-bit PLC counter or an odometer. Unsigned wraparound is defined behavior, so a reader can still get the right difference across a wrap: 3 minus 65530, kept in 16 bits, is 9. A signed overflow, by contrast, is undefined behavior in C++.",
      terms: [
        ["uint16_t", "std::uint16_t", "An unsigned 16-bit integer: 0 to 65535."],
        ["count++", "Wraparound", "65535 + 1 becomes 0."],
        ["now - before", "Difference across a wrap", "Correct when kept in 16 bits."],
      ],
      out: `65535
0
1
made since last read: 9`,
    },
    {
      t: "Bit masks",
      goal: "Pack RUNNING, JAMMED and LOW_AIR into one status byte with bit masks: set running and jammed, test jammed, clear it, and print the bits with std::bitset.",
      code: `#include <bitset>
#include <cstdint>
#include <iostream>

constexpr std::uint8_t RUNNING = 1 << 0;
constexpr std::uint8_t JAMMED = 1 << 1;
constexpr std::uint8_t LOW_AIR = 1 << 2;

int main() {
    std::uint8_t status = 0;
    status |= RUNNING | JAMMED;
    std::cout << std::bitset<8>(status) << "\\n";

    std::cout << std::boolalpha << ((status & JAMMED) != 0) << "\\n";
    std::cout << ((status & LOW_AIR) != 0) << "\\n";

    status &= ~JAMMED;
    std::cout << std::bitset<8>(status) << "\\n";
}`,
      about: "A status word packs many on/off flags into one number, the way PLCs send them over a network: bit 0 running, bit 1 jammed, bit 2 low air. |= sets bits, & tests one, and &= ~ clears one without touching the rest. bitset prints the bits, highest first. The bit layout is illustrative; a real one comes from the PLC's tag map.",
      terms: [
        ["1 << 1", "1 << n", "A number with only bit n set."],
        ["|=", "|=", "Sets the bits in the mask."],
        ["&= ~", "&= ~mask", "Clears the bits in the mask."],
        ["bitset", "std::bitset<8>", "Prints a value as 8 bits."],
      ],
      out: `00000011
true
false
00000001`,
    },
    {
      t: "std::chrono durations",
      goal: "Add 4 minutes and 37 seconds as a chrono duration, print it in seconds, as whole minutes, and as fractional minutes.",
      code: `#include <chrono>
#include <iostream>

int main() {
    using namespace std::chrono;

    seconds jam = minutes(4) + seconds(37);
    std::cout << jam.count() << " s\\n";
    std::cout << duration_cast<minutes>(jam).count() << " whole min\\n";

    duration<double, std::ratio<60>> asMinutes = jam;
    std::cout << asMinutes.count() << " min\\n";
}`,
      about: "chrono durations carry their unit in their type, so adding minutes to seconds converts correctly and mixing up ms and s becomes a compile error, not a wrong number. duration_cast truncates, giving 4 whole minutes. A double-based minutes type keeps the fraction: 4.61667, the Conveyor 3 jam's 4.62 on the Shift Handoff report.",
      terms: [
        ["seconds", "seconds / minutes", "Duration types with built-in units."],
        ["duration_cast", "duration_cast", "Converts units, truncating."],
        ["count", "count()", "The raw number in the duration's unit."],
      ],
      out: `277 s
4 whole min
4.61667 min`,
    },
    {
      t: "Files",
      goal: "Write a shift A summary to shift_summary.csv with ofstream, then read it back line by line with ifstream and print each line.",
      code: `#include <fstream>
#include <iostream>
#include <string>

int main() {
    {
        std::ofstream out("shift_summary.csv");
        out << "machine,barrels,target\\n";
        out << "Char Station 2,301,375\\n";
        out << "Conveyor 3,352,450\\n";
        out << "Hoop Driver 1,274,412.5\\n";
    }

    std::ifstream in("shift_summary.csv");
    std::string line;
    int n = 0;
    while (std::getline(in, line)) {
        std::cout << ++n << ": " << line << "\\n";
    }
}`,
      about: "ofstream writes a file and ifstream reads one, with the same << and getline as the console. The braces end the ofstream's life, which flushes and closes the file before it is read back: RAII again. The while loop stops when getline fails at the end of the file.",
      terms: [
        ["ofstream", "std::ofstream", "Writes a file."],
        ["ifstream", "std::ifstream", "Reads a file."],
        ["getline", "std::getline(in, line)", "Reads one line; false at the end of the file."],
      ],
      out: `1: machine,barrels,target
2: Char Station 2,301,375
3: Conveyor 3,352,450
4: Hoop Driver 1,274,412.5`,
    },
  ],
});
