
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

pool.on("error", (error) => {
  console.error("Unexpected PG error", error);
});

export default pool;
