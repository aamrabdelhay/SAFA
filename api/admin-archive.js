const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is required');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

function readCookie(req,name){
  const raw=req.headers.cookie||'';
  for(const part of raw.split(';')){
    const [k,...rest]=part.trim().split('=');
    if(k===name)return decodeURIComponent(rest.join('='));
  }
  return '';
}

function auth(req,res){
  try{
    const bearer=(req.headers.authorization||'').replace(/^Bearer\s+/,'');
    const token=bearer||readCookie(req,'safa_admin_session');
    if(!token)throw Error();
    jwt.verify(token,process.env.SESSION_SECRET);
    return true;
  }catch{
    res.status(401).json({error:'Authentication required'});
    return false;
  }
}

const q=(sql,args)=>pool.query(sql,args);
const types=new Set(['order','product','category']);
const normalizeType=value=>value==='orders'?'order':value==='products'?'product':value==='categories'?'category':value;

async function ensureOrderArchiveColumn(){
  await q('alter table orders add column if not exists archived_at timestamptz');
}

module.exports=async(req,res)=>{
  if(!auth(req,res))return;
  try{
    await ensureOrderArchiveColumn();
    const method=(req.method||'GET').toUpperCase();
    const type=normalizeType(String(req.query?.type||req.body?.type||'all').toLowerCase());

    if(method==='GET'){
      if(type==='all'){
        const [orders,products,categories]=await Promise.all([
          q(`select o.*,coalesce((select json_agg(json_build_object('id',oi.id,'productId',oi.product_id,'name',oi.product_name_snapshot,'quantity',oi.quantity,'unitPrice',oi.price_snapshot,'discount',oi.discount_snapshot,'total',oi.total,'specification',oi.selected_specification,'image',coalesce((select pi.url from product_images pi where pi.product_id=oi.product_id order by pi.position,pi.id limit 1),''))) from order_items oi where oi.order_id=o.id),'[]'::json) items from orders o where o.archived_at is not null order by o.archived_at desc,o.created_at desc`),
          q(`select p.*,c.name_en category_en,c.name_ar category_ar,coalesce((select json_agg(pi order by pi.position,pi.id) from product_images pi where pi.product_id=p.id),'[]'::json) images from products p left join categories c on c.id=p.category_id where p.active=false order by p.updated_at desc,p.created_at desc`),
          q(`select * from categories where active=false order by updated_at desc,position,name_en`)
        ]);
        return res.json({orders:orders.rows,products:products.rows,categories:categories.rows});
      }

      if(type==='order'){
        const rows=(await q(`select o.*,coalesce((select json_agg(json_build_object('id',oi.id,'productId',oi.product_id,'name',oi.product_name_snapshot,'quantity',oi.quantity,'unitPrice',oi.price_snapshot,'discount',oi.discount_snapshot,'total',oi.total,'specification',oi.selected_specification,'image',coalesce((select pi.url from product_images pi where pi.product_id=oi.product_id order by pi.position,pi.id limit 1),''))) from order_items oi where oi.order_id=o.id),'[]'::json) items from orders o where o.archived_at is not null order by o.archived_at desc,o.created_at desc`)).rows;
        return res.json(rows);
      }
      if(type==='product'){
        return res.json((await q(`select p.*,c.name_en category_en,c.name_ar category_ar,coalesce((select json_agg(pi order by pi.position,pi.id) from product_images pi where pi.product_id=p.id),'[]'::json) images from products p left join categories c on c.id=p.category_id where p.active=false order by p.updated_at desc,p.created_at desc`)).rows);
      }
      if(type==='category'){
        return res.json((await q(`select * from categories where active=false order by updated_at desc,position,name_en`)).rows);
      }
      return res.status(400).json({error:'Invalid archive type'});
    }

    if(method==='POST'){
      const body=req.body||{};
      const action=String(body.action||'').toLowerCase();
      const id=String(body.id||'');
      if(!types.has(body.type)||!id)return res.status(400).json({error:'Valid type and id are required'});
      const singular=normalizeType(body.type);

      if(action==='archive'){
        if(singular==='order'){
          const row=(await q(`update orders set archived_at=now(),updated_at=now() where id=$1 and archived_at is null returning *`,[id])).rows[0];
          if(!row)return res.status(404).json({error:'Order not found or already archived'});
          return res.json({ok:true,item:row});
        }
        if(singular==='product'){
          const row=(await q(`update products set active=false,updated_at=now() where id=$1 returning *`,[id])).rows[0];
          if(!row)return res.status(404).json({error:'Product not found'});
          return res.json({ok:true,item:row});
        }
        const row=(await q(`update categories set active=false,updated_at=now() where id=$1 returning *`,[id])).rows[0];
        if(!row)return res.status(404).json({error:'Category not found'});
        return res.json({ok:true,item:row});
      }

      if(action==='restore'){
        if(singular==='order'){
          const row=(await q(`update orders set archived_at=null,updated_at=now() where id=$1 and archived_at is not null returning *`,[id])).rows[0];
          if(!row)return res.status(404).json({error:'Archived order not found'});
          return res.json({ok:true,item:row});
        }
        if(singular==='product'){
          const row=(await q(`update products set active=true,updated_at=now() where id=$1 and active=false returning *`,[id])).rows[0];
          if(!row)return res.status(404).json({error:'Archived product not found'});
          return res.json({ok:true,item:row});
        }
        const row=(await q(`update categories set active=true,updated_at=now() where id=$1 and active=false returning *`,[id])).rows[0];
        if(!row)return res.status(404).json({error:'Archived category not found'});
        return res.json({ok:true,item:row});
      }

      return res.status(400).json({error:'Invalid archive action'});
    }

    res.setHeader('Allow','GET,POST');
    return res.status(405).json({error:'Method not allowed'});
  }catch(error){
    console.error('SAFA archive API error:',error?.message||error);
    return res.status(400).json({error:error?.message||'Archive operation failed'});
  }
};
