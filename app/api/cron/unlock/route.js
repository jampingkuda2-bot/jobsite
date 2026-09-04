import { query } from '@/lib/db';

export async function GET(req) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const locks = await query(
    `SELECT id, user_id, bonus_amount FROM balance_locks 
     WHERE status = 'active' AND unlocks_at <= NOW()`
  );

  let processed = 0;
  for (const lock of locks.rows) {
    try {
      await query('BEGIN');
      await query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [lock.user_id]);
      await query(
        'UPDATE users SET withdrawable_balance = withdrawable_balance + $1 WHERE id = $2',
        [lock.bonus_amount, lock.user_id]
      );
      await query(
        `UPDATE balance_locks SET status = 'completed', completed_at = NOW() 
         WHERE id = $1 AND status = 'active'`,
        [lock.id]
      );
      await query('COMMIT');
      processed++;
    } catch (e) {
      await query('ROLLBACK');
      console.error('Gagal unlock', lock.id, e);
    }
  }
  return Response.json({ ok: true, processed });
}
