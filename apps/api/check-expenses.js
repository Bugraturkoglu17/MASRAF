const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function main() {
  const [{ c }] = await sql`SELECT count(*)::int as c FROM expenses`;
  console.log('expenses count:', c);
  const rows = await sql`SELECT id, "expenseNumber", title FROM expenses ORDER BY "createdAt"`;
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
