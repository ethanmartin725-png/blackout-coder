// Language modes. Each lesson (or Foundations lane) names one of these ids.
// py: Python-style indentation is graded. markup: html/css syntax coloring. preview: live page preview. diagram: ladder drawing.
BC.addLanguage("python", {
  "name": "Python",
  "short": "PY",
  "tab": 4,
  "note": "Python: general-purpose language for data work, scripts and automation. Ignition scripting uses Jython, a Python dialect.",
  "kw": "def return if elif else for in import with as and or not while True False None",
  "py": true,
  "markup": null,
  "preview": false,
  "diagram": false
});
BC.addLanguage("ladder", {
  "name": "PLC Ladder",
  "short": "LAD",
  "tab": 4,
  "note": "PLC Ladder: shown as Rockwell neutral text, the typed form of a ladder rung. Exports usually run instructions together; spaces are added here for readability. The drawing below the panels shows the same rung.",
  "kw": "XIC XIO OTE OTL OTU TON TOF RTO CTU CTD RES ONS BST NXB BND MOV ADD SUB MUL DIV CPT GRT GEQ LES LEQ EQU NEQ LIM",
  "py": false,
  "markup": null,
  "preview": false,
  "diagram": true
});
BC.addLanguage("sql", {
  "name": "SQL",
  "short": "SQL",
  "tab": 4,
  "note": "SQL: written here in the SQL Server (T-SQL) flavor. Keywords are typed in uppercase by convention; SQL itself does not care about case.",
  "kw": "SELECT FROM WHERE ORDER BY DESC ASC GROUP JOIN ON AS TOP COUNT SUM CASE WHEN THEN ELSE END CREATE TABLE INT PRIMARY KEY VARCHAR NOT NULL AND OR",
  "py": false,
  "markup": null,
  "preview": false,
  "diagram": false
});
BC.addLanguage("csharp", {
  "name": "C#",
  "short": "C#",
  "tab": 4,
  "note": "C#: Microsoft's .NET language for Windows apps, services and tools. These lessons use top-level statements (.NET 6 and later), so no Main method is needed.",
  "kw": "using static double int var new public class string get set return if else foreach in void bool",
  "py": false,
  "markup": null,
  "preview": false,
  "diagram": false
});
BC.addLanguage("cpp", {
  "name": "C++",
  "short": "C++",
  "tab": 4,
  "note": "C++: compiled and close to the hardware. Used for embedded devices, machine software and anything that must run fast.",
  "kw": "include int double return for if struct const static_cast auto void bool",
  "py": false,
  "markup": null,
  "preview": false,
  "diagram": false
});
BC.addLanguage("java", {
  "name": "Java",
  "short": "JAVA",
  "tab": 4,
  "note": "Java: runs on the Java Virtual Machine. Common in enterprise back-office systems and Android apps. Every program lives inside a class.",
  "kw": "public class static void double int if else for return import new String Map HashMap Integer",
  "py": false,
  "markup": null,
  "preview": false,
  "diagram": false
});
BC.addLanguage("html", {
  "name": "HTML",
  "short": "HTML",
  "tab": 2,
  "note": "HTML: the structure of a web page. CSS styles it. Your typed page renders live below.",
  "kw": "",
  "py": false,
  "markup": "html",
  "preview": true,
  "diagram": false
});
BC.addLanguage("st", {
  "name": "Structured Text",
  "short": "ST",
  "tab": 4,
  "kw": "IF THEN ELSIF ELSE END_IF AND OR NOT XOR TONR CASE OF END_CASE",
  "note": "Structured Text: the text-based PLC language from IEC 61131-3, written here in Rockwell Studio 5000 style. := assigns a value and every statement ends with a semicolon."
});
BC.addLanguage("ignition", {
  "name": "Ignition script",
  "short": "IGN",
  "tab": 4,
  "py": true,
  "kw": "def return if elif else for in import and or not None True False",
  "note": "Ignition scripting: Jython, a Python 2.7 dialect that runs inside the Ignition gateway or client. The system.* functions talk to tags and databases. Indentation rules are the same as Python."
});
BC.addLanguage("ignexpr", {
  "name": "Ignition expression",
  "short": "EXPR",
  "tab": 4,
  "kw": "if case",
  "note": "Ignition expression language: one formula per property binding, re-evaluated whenever a tag it references changes. Tag paths go inside {braces}."
});
BC.addLanguage("js", {
  "name": "JavaScript",
  "short": "JS",
  "tab": 2,
  "preview": true,
  "kw": "const let var function return if else for of in new async await try catch throw true false null",
  "note": "JavaScript: the language of the browser. It reads and changes the page through the DOM: find an element by id, create elements, set their text and classes."
});
BC.addLanguage("css", {
  "name": "CSS",
  "short": "CSS",
  "tab": 2,
  "kw": "",
  "markup": "css",
  "preview": true,
  "note": "CSS: rules that style HTML. A selector picks elements; properties inside the braces set how they look."
});
BC.addLanguage("jscon", {
  "name": "JavaScript",
  "short": "JS",
  "tab": 2,
  "preview": false,
  "kw": "const let var function return if else for of in new async await try catch throw true false null",
  "note": "JavaScript run on its own, in Node.js or a browser's developer console. console.log prints a line. The Plant Board track uses the same language to change a web page."
});
