import { Router } from 'express';
import { createSubject, deleteSubject, getSubjects, subjectSchema, subjectUpdateSchema, updateSubject } from '../controller/subjectController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(protect);
router.route('/').get(getSubjects).post(validate(subjectSchema), createSubject);
router.route('/:id').put(validate(subjectUpdateSchema), updateSubject).delete(deleteSubject);
export default router;
