import { Request, Response } from 'express';
import { z } from 'zod';
import { Subject } from '../models/subject';
import { Task } from '../models/task';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';

export const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Subject name is required').max(80),
  code: z.string().trim().max(20).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').optional(),
});
export const subjectUpdateSchema = subjectSchema.partial();

export const getSubjects = asyncHandler(async (req: Request, res: Response) => {
  const subjects = await Subject.find({ user: req.user!._id }).sort('name');
  res.json({ success: true, data: subjects });
});

export const createSubject = asyncHandler(async (req: Request, res: Response) => {
  const subject = await Subject.create({ ...req.body, user: req.user!._id });
  res.status(201).json({ success: true, data: subject });
});

export const updateSubject = asyncHandler(async (req: Request, res: Response) => {
  const subject = await Subject.findOneAndUpdate({ _id: req.params.id, user: req.user!._id }, req.body, {
    new: true,
    runValidators: true,
  });
  if (!subject) throw new AppError(404, 'Subject not found');
  res.json({ success: true, data: subject });
});

export const deleteSubject = asyncHandler(async (req: Request, res: Response) => {
  const subject = await Subject.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
  if (!subject) throw new AppError(404, 'Subject not found');
  await Task.updateMany({ subject: subject._id }, { $set: { subject: null } });
  res.json({ success: true, message: 'Subject deleted' });
});
