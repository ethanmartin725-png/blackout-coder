#!/usr/bin/env bash
# Downloads the two jars the Ignition output tool needs into vendor/ (git-ignored) and checks
# their SHA-256. Run once: bash tools/output-checks/ignition/fetch.sh
#   Jython 2.7.4: runs the lessons with real Python 2.7 semantics (Ignition 8.1 ships Jython 2.7).
#   Microsoft JDBC driver for SQL Server: system.db.* talks to the same SQL Server the SQL lane uses.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p vendor
get() {
  local url="$1" file="vendor/$2" sum="$3"
  [ -f "$file" ] || curl -fsSL -o "$file" "$url"
  echo "$sum  $file" | sha256sum -c -
}
get https://repo1.maven.org/maven2/org/python/jython-standalone/2.7.4/jython-standalone-2.7.4.jar \
  jython-standalone-2.7.4.jar 1fba1769effcc8b19f5e10436bc8274a158ce988559f257927c24c73bb137f3c
get https://repo1.maven.org/maven2/com/microsoft/sqlserver/mssql-jdbc/12.8.1.jre11/mssql-jdbc-12.8.1.jre11.jar \
  mssql-jdbc-12.8.1.jre11.jar e6933c0711e598a224060e52ed31392f720a4a7664e85d8ae37c52a85b67ebb0
