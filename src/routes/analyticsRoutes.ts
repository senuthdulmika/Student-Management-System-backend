import { Router } from 'express';
import { downloadReport, getSummary } from '../controller/analyticsController';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.get('/summary', getSummary);
router.get('/report', downloadReport);
export default router;
