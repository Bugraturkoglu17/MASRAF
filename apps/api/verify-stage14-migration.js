const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const cols1 =
    await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'expenseCode'`;
  const cols2 =
    await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'attachments' AND column_name = 'status'`;
  console.log('expenseCode column:', JSON.stringify(cols1));
  console.log('status column:', JSON.stringify(cols2));
  const owner1 = await sql`SELECT tableowner FROM pg_tables WHERE tablename = 'expenses'`;
  const owner2 = await sql`SELECT tableowner FROM pg_tables WHERE tablename = 'attachments'`;
  console.log('expenses owner:', JSON.stringify(owner1));
  console.log('attachments owner:', JSON.stringify(owner2));
}
main().catch((e) => {
  console.error('CHECK FAILED:', e.message);
  process.exit(1);
});
