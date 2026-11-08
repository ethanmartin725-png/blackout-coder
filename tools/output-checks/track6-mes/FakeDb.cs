// Stand-in for the lesson's Db.cs. Same public API as PlantDb, but returns the canonical
// Shift Handoff sample data instead of querying SQL Server. Posted events persist in the
// JSON file named by MES_STORE, so a second run can show the NOT EXISTS behavior.
using System.Text.Json;

namespace MesHelper;

public class PlantDb
{
    public PlantDb(string connStr) { }

    // Same rows as tools/output-checks/track4-handoff/run4.py (shift A, 2026-11-07).
    private static readonly Fault[] AllFaults =
    {
        new("Conveyor 3", "Jam", new DateTime(2026, 11, 7, 9, 8, 52), new DateTime(2026, 11, 7, 9, 13, 29)),
        new("Hoop Driver 1", "Hoop misfeed", new DateTime(2026, 11, 7, 10, 9, 40), new DateTime(2026, 11, 7, 10, 17, 10)),
        new("Hoop Driver 1", "Low air", new DateTime(2026, 11, 7, 11, 31, 0), new DateTime(2026, 11, 7, 11, 49, 30)),
        new("Hoop Driver 1", "Low air", new DateTime(2026, 11, 7, 12, 22, 0), new DateTime(2026, 11, 7, 12, 37, 0)),
        new("Char Station 2", "Char flare", new DateTime(2026, 11, 7, 13, 41, 15), null),
    };

    // Same WHERE as the lesson's ReadFaults: start_ts < @to AND (end_ts IS NULL OR end_ts > @from)
    public List<Fault> ReadFaults(DateTime from, DateTime to) =>
        AllFaults.Where(f => f.Start < to && (f.End is null || f.End > from)).OrderBy(f => f.Start).ToList();

    // dim_machine ideal rates and the shift A barrels from v_hourly_barrels.
    public List<ShiftCount> ReadCounts(DateTime from, DateTime to) => new()
    {
        new("Char Station 2", 50, 301),
        new("Conveyor 3", 60, 352),
        new("Hoop Driver 1", 55, 274),
    };

    // Mirrors INSERT … WHERE NOT EXISTS keyed on machine + start_ts.
    public int PostEvents(IEnumerable<DowntimeEvent> events)
    {
        var path = Environment.GetEnvironmentVariable("MES_STORE") ?? "mes_store.json";
        var keys = File.Exists(path) ? JsonSerializer.Deserialize<HashSet<string>>(File.ReadAllText(path))! : new HashSet<string>();
        int posted = 0;
        foreach (var e in events)
        {
            if (keys.Add($"{e.Machine}|{e.Start:O}")) posted++;
        }
        File.WriteAllText(path, JsonSerializer.Serialize(keys));
        return posted;
    }
}
