import { Request, Response } from 'express';
import { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { Task } from '../models/task';
import { asyncHandler } from '../utils/asyncHandler';

const DAY = 24 * 60 * 60 * 1000;

export const buildSummary = async (uid: Types.ObjectId) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6 * DAY);
  weekAgo.setHours(0, 0, 0, 0);

  const [byStatus, byPriority, bySubject, overdue, upcoming, weeklyRaw] = await Promise.all([
    Task.aggregate([{ $match: { user: uid } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: { user: uid } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Task.aggregate([
      { $match: { user: uid } },
      {
        $group: {
          _id: '$subject',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 's' } },
      { $unwind: { path: '$s', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ['$s.name', 'No subject'] },
          color: { $ifNull: ['$s.color', '#94a3b8'] },
          total: 1,
          completed: 1,
        },
      },
      { $sort: { total: -1 } },
    ]),
    Task.countDocuments({ user: uid, status: { $ne: 'completed' }, dueDate: { $lt: now } }),
    Task.find({ user: uid, status: { $ne: 'completed' }, dueDate: { $gte: now, $lte: new Date(now.getTime() + 7 * DAY) } })
      .sort('dueDate')
      .limit(5)
      .populate('subject', 'name color'),
    Task.aggregate([
      { $match: { user: uid, status: 'completed', completedAt: { $gte: weekAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }, count: { $sum: 1 } } },
    ]),
  ]);

  const count = (arr: { _id: string; count: number }[], key: string) => arr.find((x) => x._id === key)?.count ?? 0;
  const todo = count(byStatus, 'todo');
  const inProgress = count(byStatus, 'in-progress');
  const completed = count(byStatus, 'completed');
  const total = todo + inProgress + completed;

  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo.getTime() + i * DAY);
    const key = d.toISOString().slice(0, 10);
    return { date: key, count: weeklyRaw.find((w) => w._id === key)?.count ?? 0 };
  });

  return {
    total,
    todo,
    inProgress,
    completed,
    overdue,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    byPriority: { low: count(byPriority, 'low'), medium: count(byPriority, 'medium'), high: count(byPriority, 'high') },
    bySubject,
    upcoming,
    weekly,
  };
};

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await buildSummary(req.user!._id as Types.ObjectId) });
});

/** Advanced feature: downloadable PDF progress report */
export const downloadReport = asyncHandler(async (req: Request, res: Response) => {
  const uid = req.user!._id as Types.ObjectId;
  const [summary, tasks] = await Promise.all([
    buildSummary(uid),
    Task.find({ user: uid }).populate('subject', 'name').sort({ status: 1, dueDate: 1 }).limit(150),
  ]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="task-report.pdf"');

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(22).fillColor('#4f46e5').text('Student Task Report');
  doc.moveDown(0.3).fontSize(11).fillColor('#64748b').text(`Student: ${req.user!.name}  |  Generated: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.fontSize(14).fillColor('#0f172a').text('Overview');
  doc.moveDown(0.3).fontSize(11).fillColor('#334155');
  doc.text(`Total tasks: ${summary.total}    Completed: ${summary.completed}    In progress: ${summary.inProgress}    To do: ${summary.todo}`);
  doc.text(`Overdue: ${summary.overdue}    Completion rate: ${summary.completionRate}%`);
  doc.text(`Priority split -> High: ${summary.byPriority.high}, Medium: ${summary.byPriority.medium}, Low: ${summary.byPriority.low}`);
  doc.moveDown();

  doc.fontSize(14).fillColor('#0f172a').text('By Subject');
  doc.moveDown(0.3).fontSize(11).fillColor('#334155');
  summary.bySubject.forEach((s) => doc.text(`${s.name}: ${s.completed}/${s.total} completed`));
  doc.moveDown();

  doc.fontSize(14).fillColor('#0f172a').text('All Tasks');
  doc.moveDown(0.3).fontSize(10).fillColor('#334155');
  tasks.forEach((t) => {
    if (doc.y > 760) doc.addPage();
    const subject = (t.subject as unknown as { name?: string } | null)?.name ?? '-';
    const due = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'no due date';
    doc.text(`[${t.status.toUpperCase()}] ${t.title}  (${t.priority}, ${subject}, due ${due})`);
  });

  doc.end();
});
