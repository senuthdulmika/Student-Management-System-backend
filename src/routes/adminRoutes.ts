import { Router } from 'express';
import { deleteUser, getStats, getUsers, roleSchema, updateUserRole } from '../controller/adminController';
import { authorize, protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(protect, authorize('admin'));
router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/role', validate(roleSchema), updateUserRole);
router.delete('/users/:id', deleteUser);
export default router;
