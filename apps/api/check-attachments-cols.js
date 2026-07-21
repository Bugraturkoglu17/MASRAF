const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function main() {
  const cols =
    await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'attachments' ORDER BY ordinal_position`;
  console.log(JSON.stringify(cols.map((c) => c.column_name)));
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
