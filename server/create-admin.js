require('dotenv').config();
const{Pool}=require('pg'),bcrypt=require('bcryptjs');
const p=new Pool({connectionString:process.env.DATABASE_URL});
const email=process.env.ADMIN_EMAIL||process.argv[2]||'admin@safa.local';
const password=process.env.ADMIN_PASSWORD||process.argv[3];
if(!password){console.log('ADMIN_PASSWORD not set; keeping the existing admin password.');p.end();return;}
bcrypt.hash(password,12).then(h=>p.query('insert into admins(email,password_hash) values($1,$2) on conflict(email) do update set password_hash=excluded.password_hash',[email,h])).then(()=>console.log('Admin password configured for:',email)).catch(e=>{console.error(e);process.exitCode=1}).finally(()=>p.end());
