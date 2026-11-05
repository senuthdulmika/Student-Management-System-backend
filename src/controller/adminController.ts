import { Request, Response } from 'express';
import { z } from 'zod';
import { Subject } from '../models/subject';
import { Task } from '../models/task';
import { User } from '../models/user';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const roleSchema = z.object({ role: z.enum(['student', 'admin']) });

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.aggregate([
    { $lookup: { from: 'tasks', localField: '_id', foreignField: 'user', as: 't' } },
    { $project: { name: 1, email: 1, role: 1, createdAt: 1, taskCount: { $size: '$t' } } },
    { $sort: { createdAt: -1 } },
  ]);
  res.json({ success: true, data: users });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const [users, tasks, completed, subjects] = await Promise.all([
    User.countDocuments(),
    Task.countDocuments(),
    Task.countDocuments({ status: 'completed' }),
    Subject.countDocuments(),
  ]);
  res.json({ success: true, data: { users, tasks, completed, subjects } });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) throw new AppError(400, 'You cannot change your own role');
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
  if (!user) throw new AppError(404, 'User not found');
  res.json({ success: true, data: { id: user.id, role: user.role } });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.params.id === req.user!.id) throw new AppError(400, 'You cannot delete your own account');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError(404, 'User not found');
  await Promise.all([Task.deleteMany({ user: user._id }), Subject.deleteMany({ user: user._id })]);
  res.json({ success: true, message: 'User and related data deleted' });
});
