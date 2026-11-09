// Project track 9: Eye Counter (C++)
// Lesson format: docs/LESSON_FORMAT.md. Run `node tools/verify.mjs` after any edit.
// Outputs: node tools/output-checks/track9-eye/run.mjs (compiles each step's code with a test main)
BC.addTrack({
  id: "t-eye",
  name: "Eye Counter",
  sub: "Firmware-style C++ for a barrel counter on Conveyor 3's photo-eye: debounce, edge counting, cycle times in a ring buffer, jam detection, status bits and a serial line",
  lessons: [
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Constants",
      goal: "Include array, cstdint, cstdio, iostream, string and vector. Declare constexpr SAMPLE_MS 10, DEBOUNCE_MS 200, JAM_MS 4000 (uint32_t) and IDEAL_PER_HOUR 60.0.",
      code: `#include <array>
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <string>
#include <vector>

constexpr std::uint32_t SAMPLE_MS = 10;
constexpr std::uint32_t DEBOUNCE_MS = 200;
constexpr std::uint32_t JAM_MS = 4000;
constexpr double IDEAL_PER_HOUR = 60.0;`,
      about: "This is firmware-style code for a small barrel counter on Conveyor 3's photo-eye: it reads the eye every 10 ms, counts barrels, measures cycle times and flags a jam. The constants come first so every rule has one home. JAM_MS matches the PLC track's 4 s jam timer and IDEAL_PER_HOUR is Conveyor 3's ideal rate; the 10 ms sample and 200 ms debounce are illustrative. Each step's output comes from compiling the code so far with a small test.",
      terms: [
        ["constexpr", "constexpr", "Fixed at compile time; costs no memory at run time."],
        ["uint32_t", "std::uint32_t", "An unsigned 32-bit integer: milliseconds for 49 days."],
      ],
      out: `sample every 10 ms, debounce 200 ms, jam after 4000 ms
ideal cycle: 60000 ms per barrel`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "A sample",
      goal: "Define struct Sample with a uint32_t tMs and a bool raw.",
      code: `struct Sample {
    std::uint32_t tMs;
    bool raw;
};`,
      about: "Each reading is a time stamp and the raw eye state: true while something blocks the beam. Keeping the time with the reading, instead of assuming a steady clock, lets the same code replay a recorded stream for testing.",
      terms: [
        ["struct Sample", "struct", "A plain bundle of fields."],
        ["raw", "raw", "The eye as read, before any filtering."],
      ],
      out: `t=1500 raw=1`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Debounce state",
      goal: "Define struct Debounce with bool stable and candidate, both false, and a uint32_t since, 0.",
      code: `struct Debounce {
    bool stable = false;
    bool candidate = false;
    std::uint32_t since = 0;
};`,
      about: "stable is the filtered eye state the rest of the code trusts. candidate is a new state that has not lasted long enough yet, and since is when it started. Default member values mean a fresh Debounce is ready to use.",
      terms: [
        ["stable", "stable", "The trusted state."],
        ["candidate", "candidate", "A change waiting to prove itself."],
        ["= false", "Default member value", "What a new object starts with."],
      ],
      out: `stable=0 candidate=0 since=0`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Debounce the eye",
      goal: "Write bool debounce(Debounce& d, const Sample& s): restart the timer when the raw value changes, and accept the candidate once it has lasted DEBOUNCE_MS. Return the stable state.",
      code: `bool debounce(Debounce& d, const Sample& s) {
    if (s.raw != d.candidate) {
        d.candidate = s.raw;
        d.since = s.tMs;
    }
    if (d.candidate != d.stable && s.tMs - d.since >= DEBOUNCE_MS) {
        d.stable = d.candidate;
    }
    return d.stable;
}`,
      about: "A gap between staves or a speck of dust can blink the eye for a few samples. Every change starts a timer; only a state that holds for 200 ms becomes the stable one. The ladder lane's debounce lesson does the same with two timers. The output feeds a 100 ms flicker, then a real block.",
      terms: [
        ["Debounce& d", "Reference", "Updates the caller's state."],
        ["DEBOUNCE_MS", "Filter time", "A change must last this long."],
      ],
      out: `raw: on 0-90 ms, off 100-290 ms, on 300-990 ms
t=500 ms: stable 1`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Rising edge",
      goal: "Define struct Edge with bool last, and bool rising(Edge&, bool now) that is true only when now is on and last was off, then remembers now.",
      code: `struct Edge {
    bool last = false;
};

bool rising(Edge& e, bool now) {
    bool edge = now && !e.last;
    e.last = now;
    return edge;
}`,
      about: "A barrel blocks the eye for many samples, but it should count once: on the moment the eye turns on. Comparing with the last value finds that moment, exactly like ONS in ladder. Remember last after comparing, or the edge is never seen.",
      terms: [
        ["rising", "Rising edge", "On now, off last time."],
        ["e.last", "Memory", "The previous value."],
      ],
      out: `input:  011101
rising: 010001`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "A 16-bit count",
      goal: "Define struct Counter with a uint16_t count, and madeSince(before, now) that returns the difference kept in 16 bits.",
      code: `struct Counter {
    std::uint16_t count = 0;
};

std::uint16_t madeSince(std::uint16_t before, std::uint16_t now) {
    return static_cast<std::uint16_t>(now - before);
}`,
      about: "The count is 16 bits, like many PLC and fieldbus registers, so it rolls over after 65535. A reader that keeps its own last value can still work out how many were made, because the difference is taken in 16 bits too. The output rolls the counter over and reads across the wrap.",
      terms: [
        ["uint16_t", "std::uint16_t", "0 to 65535, then wraps."],
        ["madeSince", "Difference across a wrap", "Right as long as fewer than 65536 were made."],
      ],
      out: `65535
0
1
made between 65530 and 3: 9`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Ring buffer of cycle times",
      goal: "Define struct Ring with a 5-slot std::array, a next index and a filled count, and push(x) that writes at next, moves next round, and counts up to 5.",
      code: `struct Ring {
    std::array<std::uint32_t, 5> v{};
    std::size_t next = 0;
    std::size_t filled = 0;

    void push(std::uint32_t x) {
        v[next] = x;
        next = (next + 1) % v.size();
        if (filled < v.size()) filled++;
    }
};`,
      about: "A ring buffer keeps the last N values in fixed memory: when full, the newest overwrites the oldest. No allocation, no growing, which is why firmware uses it. % v.size() wraps the index back to 0. The ST lane's history lesson shifts an array instead, which costs a copy per value.",
      terms: [
        ["%", "% v.size()", "Wraps the index round to 0."],
        ["v{}", "{} initializer", "Starts every slot at 0."],
        ["filled", "filled", "How many slots hold real values."],
      ],
      out: `slots: 59000 59800 64000 60400 60600
next=1 filled=5`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Average of the ring",
      goal: "Write double average(const Ring& r) returning the mean of the filled slots, or 0.0 when empty.",
      code: `double average(const Ring& r) {
    if (r.filled == 0) return 0.0;
    double sum = 0;
    for (std::size_t i = 0; i < r.filled; i++) sum += r.v[i];
    return sum / r.filled;
}`,
      about: "Only filled slots count, so the first few averages are not dragged down by zeros. Order does not matter for a mean, so the loop does not need to know where the ring starts. The test pushes the first four cycle times from the ST lane's history lesson.",
      terms: [
        ["filled", "Filled slots", "Only these are averaged."],
        ["0.0", "Empty ring", "No cycles yet, no average."],
      ],
      out: `empty: 0
4 cycles: 61350 ms`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Rate per hour",
      goal: "Write ratePerHour(avgCycleMs) returning 3,600,000 divided by the cycle time, or 0.0 for no cycle.",
      code: `double ratePerHour(double avgCycleMs) {
    return avgCycleMs > 0 ? 3600000.0 / avgCycleMs : 0.0;
}`,
      about: "An hour is 3,600,000 ms, so a 60,000 ms cycle is 60 barrels an hour, Conveyor 3's ideal. The guard stops a division by zero before the second barrel, when there is no cycle yet.",
      terms: [
        ["3600000.0", "Milliseconds per hour", "60 × 60 × 1000."],
        ["?", "cond ? a : b", "a if the condition holds, otherwise b."],
      ],
      out: `60 58.6797 0`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Jam watch",
      goal: "Define struct JamWatch (blockedSince, wasBlocked, jammed) and watchJam(j, blocked, running, tMs): note when a block starts while running and latch jammed after JAM_MS.",
      code: `struct JamWatch {
    std::uint32_t blockedSince = 0;
    bool wasBlocked = false;
    bool jammed = false;
};

void watchJam(JamWatch& j, bool blocked, bool running, std::uint32_t tMs) {
    if (!running || !blocked) {
        j.wasBlocked = false;
        return;
    }
    if (!j.wasBlocked) {
        j.wasBlocked = true;
        j.blockedSince = tMs;
    }
    if (tMs - j.blockedSince >= JAM_MS) j.jammed = true;
}`,
      about: "The same rule as the PLC track: the eye blocked for 4 s while the conveyor runs is a jam. jammed is latched: nothing here clears it, so a reset must, as in ladder. A stopped conveyor with a barrel sitting at the eye is not a jam.",
      terms: [
        ["blockedSince", "Block start", "When the current block began."],
        ["jammed", "Latched fault", "Set once, cleared only by a reset."],
      ],
      out: `blocked 3.99 s while running: jammed=0
blocked 4.00 s while running: jammed=1
blocked 10 s while stopped: jammed=0`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Status bits",
      goal: "Declare status bits RUNNING, BLOCKED, JAMMED and SLOW (bits 0 to 3), and statusWord(running, blocked, jammed, rate) that sets SLOW below 95% of ideal.",
      code: `constexpr std::uint8_t ST_RUNNING = 1 << 0;
constexpr std::uint8_t ST_BLOCKED = 1 << 1;
constexpr std::uint8_t ST_JAMMED = 1 << 2;
constexpr std::uint8_t ST_SLOW = 1 << 3;

std::uint8_t statusWord(bool running, bool blocked, bool jammed, double rate) {
    std::uint8_t s = 0;
    if (running) s |= ST_RUNNING;
    if (blocked) s |= ST_BLOCKED;
    if (jammed) s |= ST_JAMMED;
    if (rate > 0 && rate < 0.95 * IDEAL_PER_HOUR) s |= ST_SLOW;
    return s;
}`,
      about: "One byte carries four flags to whatever reads the counter, a PLC or a gateway. Below 95% of ideal, 57 barrels an hour, the SLOW bit is set; the 95% line is illustrative. The bit layout is part of the device's contract: once a PLC reads bit 2 as jammed, it must not move.",
      terms: [
        ["1 << 2", "Bit mask", "Only bit 2 set: 4."],
        ["|=", "|=", "Sets a flag."],
        ["0.95", "SLOW threshold", "95% of the ideal rate."],
      ],
      out: `01 07 09`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Serial line",
      goal: "Write serialLine(tMs, count, rate, status) that formats \"T=%08u C=%05u R=%5.1f S=%02X\" into a 48-char buffer with snprintf.",
      code: `std::string serialLine(std::uint32_t tMs, std::uint16_t count, double rate, std::uint8_t status) {
    std::array<char, 48> buf{};
    std::snprintf(buf.data(), buf.size(), "T=%08u C=%05u R=%5.1f S=%02X",
                  static_cast<unsigned>(tMs), static_cast<unsigned>(count), rate, static_cast<unsigned>(status));
    return std::string(buf.data());
}`,
      about: "Fixed-width fields make a line that a PLC, a terminal or a script can parse by position. snprintf never writes past the buffer size, unlike sprintf, which is how buffer overruns happen. %08u pads with zeros to 8 digits and %02X prints hex. The casts match each value to its format code.",
      terms: [
        ["snprintf", "std::snprintf", "Formats into a buffer, never past its size."],
        ["%08u", "%08u", "Unsigned, 8 digits, zero-padded."],
        ["%02X", "%02X", "Hex, 2 digits."],
      ],
      out: `T=00061190 C=00001 R=  0.0 S=01
T=00305990 C=00005 R= 58.7 S=03`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "The counter object",
      goal: "Define struct EyeCounter holding a Debounce, Edge, Counter, Ring and JamWatch, plus lastEdgeMs, haveEdge and nowMs.",
      code: `struct EyeCounter {
    Debounce db;
    Edge edge;
    Counter counter;
    Ring cycles;
    JamWatch jam;
    std::uint32_t lastEdgeMs = 0;
    bool haveEdge = false;
    std::uint32_t nowMs = 0;
};`,
      about: "Everything the counter remembers between samples lives in one object, built from the pieces of the earlier steps. In firmware this would be a single static instance; in a test, a fresh one per test. haveEdge stops the first barrel recording a cycle time measured from power-up.",
      terms: [
        ["EyeCounter", "Composition", "One object made of the smaller ones."],
        ["haveEdge", "First barrel", "No cycle time until a second edge."],
      ],
      out: `count=0 filled=0 haveEdge=0`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Process one sample",
      goal: "Write process(c, s, running): debounce, and on a rising edge count, record the cycle time if there was a previous edge, and remember the edge time. Then watch for a jam.",
      code: `void process(EyeCounter& c, const Sample& s, bool running) {
    c.nowMs = s.tMs;
    bool blocked = debounce(c.db, s);
    if (rising(c.edge, blocked)) {
        c.counter.count++;
        if (c.haveEdge) c.cycles.push(s.tMs - c.lastEdgeMs);
        c.lastEdgeMs = s.tMs;
        c.haveEdge = true;
    }
    watchJam(c.jam, blocked, running, s.tMs);
}`,
      about: "This is the whole counter, called once per sample. The debounced value, not the raw one, drives everything after it, so a flicker can neither count nor start a jam timer. The cycle time is edge to edge: the time from one barrel's arrival to the next.",
      terms: [
        ["process", "process", "Runs once per sample."],
        ["c.cycles.push", "Cycle time", "Edge to edge, in ms."],
      ],
      out: `count=1 lastEdgeMs=200 cycles=0
count=2 lastEdgeMs=3200 cycle=3000 ms`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Report line",
      goal: "Write report(c, running) that builds the serial line from the count, the rate from the average cycle, and the status word.",
      code: `std::string report(const EyeCounter& c, bool running) {
    double rate = ratePerHour(average(c.cycles));
    return serialLine(c.nowMs, c.counter.count, rate, statusWord(running, c.db.stable, c.jam.jammed, rate));
}`,
      about: "Reading the state and formatting it are kept separate from processing, so the report can run at any interval, every barrel or once a second, without changing the counting. const& promises the report cannot change the counter.",
      terms: [
        ["const EyeCounter&", "Read-only", "The report cannot change the state."],
        ["report", "Report", "State in, one line out."],
      ],
      out: `T=00122390 C=00002 R= 58.8 S=01`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Shift reset",
      goal: "Write resetShift(c) that zeros the count, empties the cycle ring and forgets the last edge.",
      code: `void resetShift(EyeCounter& c) {
    c.counter.count = 0;
    c.cycles = Ring{};
    c.haveEdge = false;
}`,
      about: "At shift change the count starts again, like the RES on the PLC track's counter. Ring{} is a fresh, empty ring. The debounce and edge state are kept, because the eye has not changed just because the shift has. The jam latch is not touched here; clearing a fault is a separate, deliberate act.",
      terms: [
        ["Ring{}", "Ring{}", "A new, empty ring."],
        ["resetShift", "Shift reset", "Count and cycles only."],
      ],
      out: `T=00122390 C=00002 R= 58.8 S=01
T=00122390 C=00000 R=  0.0 S=00`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Simulated barrels",
      goal: "Write barrel(startMs, cycleMs, blockedMs, flicker) returning one sample every SAMPLE_MS over the cycle: blocked for blockedMs, with an optional 50 ms flicker 400 ms after the barrel clears.",
      code: `std::vector<Sample> barrel(std::uint32_t startMs, std::uint32_t cycleMs, std::uint32_t blockedMs, bool flicker) {
    std::vector<Sample> out;
    for (std::uint32_t t = 0; t < cycleMs; t += SAMPLE_MS) {
        bool raw = t < blockedMs;
        if (flicker && t >= blockedMs + 400 && t < blockedMs + 450) raw = true;
        out.push_back({startMs + t, raw});
    }
    return out;
}`,
      about: "Testing firmware on the bench needs inputs that look like the line. This builds one barrel's worth of samples: the eye blocked for 1.5 s as the barrel passes, then clear. The flicker is a 50 ms blink, the kind the debounce must ignore. One 61 s cycle is 6,120 samples.",
      terms: [
        ["push_back", "push_back", "Adds a sample to the end."],
        ["flicker", "Flicker", "A 50 ms false blink after the barrel."],
      ],
      out: `6120 samples, 150 blocked; with flicker 155 blocked`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Replay a stream",
      goal: "Write replay(c, samples, running) that processes every sample in order.",
      code: `void replay(EyeCounter& c, const std::vector<Sample>& samples, bool running) {
    for (const Sample& s : samples) process(c, s, running);
}`,
      about: "Replaying recorded or generated samples through the real process function is how firmware gets tested off the machine: the same code, fed known inputs, must give known outputs. A capture from the real eye could be replayed exactly the same way.",
      terms: [
        ["replay", "Replay", "Feeds every sample to process."],
        ["const Sample& s", "const&", "Reads each sample without copying."],
      ],
      out: `T=00120990 C=00002 R= 58.8 S=01`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Five barrels",
      goal: "Write fiveBarrels(c): replay barrels with cycles 61200, 59800, 64000, 60400 and 60600 ms, the 64000 one with a flicker, printing a report after each. Return the end time.",
      code: `std::uint32_t fiveBarrels(EyeCounter& c) {
    const std::uint32_t cycles[] = {61200, 59800, 64000, 60400, 60600};
    std::uint32_t t = 0;
    for (std::uint32_t cycle : cycles) {
        replay(c, barrel(t, cycle, 1500, cycle == 64000), true);
        std::cout << report(c, true) << "\\n";
        t += cycle;
    }
    return t;
}`,
      about: "The cycle times are the ST lane's history lesson's. The first report has no rate yet, since one barrel gives no cycle. The flicker after the 64 s barrel is ignored, so the count stays honest. Rates settle near 58.7 an hour, just under Conveyor 3's ideal 60.",
      terms: [
        ["cycles[]", "Test data", "Five cycle times in ms."],
        ["cycle == 64000", "Flicker test", "Only the slow barrel gets a flicker."],
      ],
      out: `T=00061190 C=00001 R=  0.0 S=01
T=00120990 C=00002 R= 58.8 S=01
T=00184990 C=00003 R= 59.5 S=01
T=00245390 C=00004 R= 58.4 S=01
T=00305990 C=00005 R= 58.7 S=01
ended at 306000 ms`,
    },
    {
      lang: "cpp",
      file: "counter.cpp",
      t: "Jam and shift change",
      goal: "In main, run five barrels, then a barrel that blocks the eye for 5 s, and report. Then reset the shift and the jam latch, and report with the conveyor stopped.",
      code: `int main() {
    EyeCounter c;
    std::uint32_t t = fiveBarrels(c);

    replay(c, barrel(t, 6000, 5000, false), true);
    std::cout << report(c, true) << "  jam\\n";

    resetShift(c);
    c.jam = JamWatch{};
    std::cout << report(c, false) << "  shift change\\n";
}`,
      about: "The sixth barrel blocks the eye for 5 s, past the 4 s jam limit, so the status turns to 05: running and jammed. It still counts, as the PLC track's counter does. The shift reset clears the count and rate, and the jam latch is cleared on purpose as its own line. The status of 00 says stopped, clear and not slow.",
      terms: [
        ["main", "main", "Where the program starts."],
        ["JamWatch{}", "Clear the latch", "A deliberate reset of the jam fault."],
        [null, "S=05", "Status 05: bits 0 and 2, running and jammed."],
      ],
      out: `T=00061190 C=00001 R=  0.0 S=01
T=00120990 C=00002 R= 58.8 S=01
T=00184990 C=00003 R= 59.5 S=01
T=00245390 C=00004 R= 58.4 S=01
T=00305990 C=00005 R= 58.7 S=01
T=00311990 C=00006 R= 58.8 S=05  jam
T=00311990 C=00000 R=  0.0 S=00  shift change`,
    },
  ],
});
