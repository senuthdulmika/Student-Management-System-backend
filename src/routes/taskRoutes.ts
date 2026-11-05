import { Router } from 'express';
import { createTask, deleteTask, getTask, getTasks, taskSchema, taskUpdateSchema, updateTask } from '../controller/taskController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(protect);
router.route('/').get(getTasks).post(validate(taskSchema), createTask);
router.route('/:id').get(getTask).put(validate(taskUpdateSchema), updateTask).delete(deleteTask);
export default router;
