const { Pool } = require('pg');
const { z } = require('zod');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const money = (n) => Math.round(Number(n) * 100) / 100;
const final = (p) => {
  const d = p.discount_type === 'percent'
    ? Number(p.price) * Number(p.discount_value || 0) / 100
    : p.discount_type === 'fixed'
      ? Number(p.discount_value || 0)
      : 0;
  return Math.max(0, money(Number(p.price) - d));
};

const schema = z.object({
  customerName: z.string().min(2),
  phone1: z.string().regex(/^\+?\d{10,15}$/),
  phone2: z.string().regex(/^\+?\d{10,15}$/),
  governorate: z.string().min(2),
  address: z.string().min(5),
  buildingNumber: z.string().optional().default(''),
  apartmentNumber: z.string().optional().default(''),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    selectedSpecification: z.string().max(200).optional().default(''),
  })).min(1),
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let input;
  try {
    input = schema.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid checkout data' });
  }

  const norm = (value) => String(value).replace(/\D/g, '');
  if (norm(input.phone1) === norm(input.phone2)) {
    return res.status(400).json({ error: 'Phone numbers must be different' });
  }

  const client = await pool.connect();
  try {
    await client.query('begin');

    const grouped = new Map();
    for (const item of input.items) {
      const key = `${item.productId}::${item.selectedSpecification || ''}`;
      const existing = grouped.get(key);
      if (existing) existing.quantity += item.quantity;
      else grouped.set(key, {
        productId: item.productId,
        quantity: item.quantity,
        specification: item.selectedSpecification || '',
      });
    }

    const productsById = new Map();
    const totalsByProduct = new Map();
    for (const line of grouped.values()) {
      totalsByProduct.set(line.productId, (totalsByProduct.get(line.productId) || 0) + line.quantity);
    }

    for (const [productId, quantity] of totalsByProduct) {
      const result = await client.query(
        'select * from products where id=$1 and active=true for update',
        [productId]
      );
      const product = result.rows[0];
      if (!product) throw new Error('Product not found');
      if (Number(product.stock) < quantity) throw new Error('Out of stock');
      productsById.set(productId, product);
    }

    let subtotal = 0;
    let discount = 0;
    const lines = [];
    for (const line of grouped.values()) {
      const product = productsById.get(line.productId);
      const unit = final(product);
      subtotal += Number(product.price) * line.quantity;
      discount += (Number(product.price) - unit) * line.quantity;
      lines.push({ product, quantity: line.quantity, unit, specification: line.specification });
    }

    const number = `SAF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const total = money(subtotal - discount);
    const order = (await client.query(
      `insert into orders(
        order_number,customer_name,phone1,phone2,governorate,address,
        building_number,apartment_number,subtotal,discount,savings,total
      ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11) returning *`,
      [
        number,
        input.customerName,
        input.phone1,
        input.phone2,
        input.governorate,
        input.address,
        input.buildingNumber,
        input.apartmentNumber,
        subtotal,
        discount,
        total,
      ]
    )).rows[0];

    for (const line of lines) {
      await client.query(
        `insert into order_items(
          order_id,product_id,product_name_snapshot,price_snapshot,quantity,
          discount_snapshot,total,selected_specification
        ) values($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          order.id,
          line.product.id,
          line.product.name_en,
          line.unit,
          line.quantity,
          (Number(line.product.price) - line.unit) * line.quantity,
          line.unit * line.quantity,
          line.specification,
        ]
      );
    }

    for (const [productId, quantity] of totalsByProduct) {
      await client.query(
        'update products set stock=stock-$1,updated_at=now() where id=$2',
        [quantity, productId]
      );
    }

    await client.query('commit');
    return res.status(201).json(order);
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return res.status(400).json({ error: error?.message || 'Order could not be placed' });
  } finally {
    client.release();
  }
};
