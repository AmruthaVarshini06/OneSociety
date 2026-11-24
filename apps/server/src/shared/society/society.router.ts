import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { query } from '../../config/supabase';

const router = Router();
router.use(authenticate);

// Get current society details
router.get('/me', async (req: Request, res: Response) => {
  try {
    const societyId = req.user?.societyId;
    const sRes = await query('SELECT * FROM societies WHERE id = $1', [societyId]);
    if (sRes.rows.length === 0) {
      res.status(404).json({ message: 'Society not found' });
      return;
    }
    const s = sRes.rows[0];
    res.json({
      id: s.id,
      name: s.name,
      address: s.address,
      city: s.city,
      state: s.state,
      pincode: s.pincode,
      totalFlats: s.total_flats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get blocks
router.get('/blocks', async (req: Request, res: Response) => {
  try {
    const societyId = req.user?.societyId;
    const bRes = await query('SELECT * FROM blocks WHERE society_id = $1 ORDER BY name ASC', [societyId]);
    res.json(bRes.rows.map(b => ({
      id: b.id,
      societyId: b.society_id,
      name: b.name,
      totalFloors: b.total_floors,
      flatsPerFloor: b.flats_per_floor,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get flats
router.get('/flats', async (req: Request, res: Response) => {
  try {
    const societyId = req.user?.societyId;
    const fRes = await query(
      `SELECT f.*, b.name as block_name, u.full_name as occupant_name, u.phone as occupant_phone
       FROM flats f
       JOIN blocks b ON f.block_id = b.id
       LEFT JOIN users u ON f.current_occupant_id = u.id
       WHERE f.society_id = $1
       ORDER BY b.name ASC, f.flat_number ASC`,
      [societyId]
    );
    res.json(fRes.rows.map(f => ({
      id: f.id,
      blockId: f.block_id,
      blockName: f.block_name,
      flatNumber: f.flat_number,
      floor: f.floor,
      currentOccupantId: f.current_occupant_id,
      occupantName: f.occupant_name,
      occupantPhone: f.occupant_phone,
      isAtHome: f.is_at_home,
      awayUntil: f.away_until,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single flat
router.get('/flats/:id', async (req: Request, res: Response) => {
  try {
    const fRes = await query(
      `SELECT f.*, b.name as block_name, u.full_name as occupant_name, u.phone as occupant_phone
       FROM flats f
       JOIN blocks b ON f.block_id = b.id
       LEFT JOIN users u ON f.current_occupant_id = u.id
       WHERE f.id = $1`,
      [req.params.id]
    );
    if (fRes.rows.length === 0) {
      res.status(404).json({ message: 'Flat not found' });
      return;
    }
    const f = fRes.rows[0];
    res.json({
      id: f.id,
      blockId: f.block_id,
      blockName: f.block_name,
      flatNumber: f.flat_number,
      floor: f.floor,
      currentOccupantId: f.current_occupant_id,
      occupantName: f.occupant_name,
      occupantPhone: f.occupant_phone,
      isAtHome: f.is_at_home,
      awayUntil: f.away_until,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get society members
router.get('/members', async (req: Request, res: Response) => {
  try {
    const societyId = req.user?.societyId;
    const mRes = await query(
      `SELECT u.id, u.username, u.full_name, u.role, u.phone, u.email, f.flat_number, b.name as block_name
       FROM users u
       LEFT JOIN flats f ON u.flat_id = f.id
       LEFT JOIN blocks b ON f.block_id = b.id
       WHERE u.society_id = $1 AND u.is_active = true
       ORDER BY u.role, u.full_name`,
      [societyId]
    );
    res.json(mRes.rows.map(m => ({
      id: m.id,
      username: m.username,
      fullName: m.full_name,
      role: m.role,
      phone: m.phone,
      email: m.email,
      flat: m.flat_number ? `${m.block_name}-${m.flat_number}` : null,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
