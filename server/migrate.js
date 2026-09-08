require('dotenv').config();
const{Pool}=require('pg');
const fs=require('fs');
const p=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{try{await p.query(fs.readFileSync(__dirname+'/schema.sql','utf8'));await p.query(`CREATE TABLE IF NOT EXISTS site_visitors(visitor_id text PRIMARY KEY,first_seen_at timestamptz NOT NULL DEFAULT now(),last_seen_at timestamptz NOT NULL DEFAULT now(),first_path text DEFAULT '/',last_path text DEFAULT '/',user_agent text DEFAULT '');CREATE TABLE IF NOT EXISTS site_visits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),visitor_id text NOT NULL REFERENCES site_visitors(visitor_id) ON DELETE CASCADE,visited_at timestamptz NOT NULL DEFAULT now(),path text DEFAULT '/');CREATE INDEX IF NOT EXISTS site_visits_visited_at_idx ON site_visits(visited_at);CREATE INDEX IF NOT EXISTS site_visitors_first_seen_idx ON site_visitors(first_seen_at);`);console.log('Migration complete')}catch(e){console.error(e);process.exitCode=1}finally{await p.end()}})();
