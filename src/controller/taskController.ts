import { Request, Response } from 'express';
import { QueryFilter, Types } from 'mongoose';
import { z } from 'zod';
import { Subject } from '../models/subject';
import { ITask, Task } from '../models/task';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

const base = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(['todo', 'in-progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.coerce.date().nullable().optional().or(z.literal('').transform(() => null)),
  subject: z.string().nullable().optional().or(z.literal('').transform(() => null)),
});
export const taskSchema = base;
export const taskUpdateSchema = base.partial();

const SORTABLE = ['dueDate', 'createdAt', 'priority', 'title', 'status'];
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertSubjectOwned = async (subjectId: string | null | undefined, userId: Types.ObjectId) => {
  if (!subjectId) return;
  const owned = await Subject.exists({ _id: subjectId, user: userId });
  if (!owned) throw new AppError(400, 'Selected subject does not exist');
};

export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, subject, search, sort = 'dueDate', order = 'asc' } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

  const filter: QueryFilter<ITask> & Record<string, unknown> = { user: req.user!._id };
  if (status) filter.status = status as ITask['status'];
  if (priority) filter.priority = priority as ITask['priority'];
  if (subject) filter.subject = subject === 'none' ? null : subject;
  if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };

  const sortField = SORTABLE.includes(sort) ? sort : 'dueDate';
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('subject', 'name code color')
      .sort({ [sortField]: order === 'desc' ? -1 : 1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ]);
  res.json({ success: true, data: tasks, pagination: { total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findOne({ _id: req.params.id, user: req.user!._id }).populate('subject', 'name code color');
  if (!task) throw new AppError(404, 'Task not found');
  res.json({ success: true, data: task });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  await assertSubjectOwned(req.body.subject, req.user!._id);
  const completedAt = req.body.status === 'completed' ? new Date() : null;
  const task = await Task.create({ ...req.body, completedAt, user: req.user!._id });
  await task.populate('subject', 'name code color');
  res.status(201).json({ success: true, data: task });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  await assertSubjectOwned(req.body.subject, req.user!._id);
  const update: Record<string, unknown> = { ...req.body };
  if (req.body.status) update.completedAt = req.body.status === 'completed' ? new Date() : null;

  const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.user!._id }, update, {
    new: true,
    runValidators: true,
  }).populate('subject', 'name code color');
  if (!task) throw new AppError(404, 'Task not found');
  res.json({ success: true, data: task });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
  if (!task) throw new AppError(404, 'Task not found');
  res.json({ success: true, message: 'Task deleted' });
});
