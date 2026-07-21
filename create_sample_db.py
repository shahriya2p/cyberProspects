import duckdb

print("Opening original database...")
con = duckdb.connect("api/app_sample.duckdb")

print("Attaching original database...")
con.execute("ATTACH 'pipeline/data/derived/app.duckdb' AS source (READ_ONLY)")

tables_to_full_copy = [
    "meta",
    "rollup_country",
    "rollup_score_hist",
    "rollup_signal",
    "signal_catalog"
]

for t in tables_to_full_copy:
    print(f"Copying {t}...")
    con.execute(f"CREATE TABLE {t} AS SELECT * FROM source.{t}")

print("Copying company (limit 25000)...")
con.execute("CREATE TABLE company AS SELECT * FROM source.company LIMIT 25000")

print("Copying company_signal...")
con.execute("CREATE TABLE company_signal AS SELECT * FROM source.company_signal WHERE domain IN (SELECT domain FROM company)")

print("Copying hostname_sample...")
con.execute("CREATE TABLE hostname_sample AS SELECT * FROM source.hostname_sample WHERE domain IN (SELECT domain FROM company)")

con.close()
print("Sample database created at api/app_sample.duckdb")
