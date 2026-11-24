import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import * as svc from './service-category.service';

const router = Router();

router.get('/', async (req, res) => {
  const cats = await svc.listCategories();
  res.json(cats);
});

router.get('/:slug', async (req, res) => {
  const cat = await svc.getCategoryBySlug(req.params.slug);
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  res.json(cat);
});

router.post('/', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const cat = await svc.createCategory(req.body);
  res.status(201).json(cat);
});

router.post('/:id/options', authenticate, async (req, res) => {
  if (req.user?.role !== 'president') return res.status(403).json({ message: 'President only' });
  const cat = await svc.addOptionToCategory(req.params.id, req.body);
  res.json(cat);
});

export default router;
