import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getProjectStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;

    // Check if user has access to this project
    const accessCheck = await pool.query(
      `SELECT p.id FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [projectId, userId]
    );

    if (accessCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found or access denied'
      });
      return;
    }

    // Total submissions
    const totalSubmissions = await pool.query(
      'SELECT COUNT(*) as count FROM submissions WHERE project_id = $1',
      [projectId]
    );

    // Submissions by status
    const submissionsByStatus = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM submissions 
       WHERE project_id = $1 
       GROUP BY status`,
      [projectId]
    );

    // Calculate approval rate
    const approvedCount = submissionsByStatus.rows.find(r => r.status === 'approved')?.count || 0;
    const rejectedCount = submissionsByStatus.rows.find(r => r.status === 'changes_requested')?.count || 0;
    const totalReviewed = parseInt(approvedCount) + parseInt(rejectedCount);
    const approvalRate = totalReviewed > 0 ? (parseInt(approvedCount) / totalReviewed * 100).toFixed(2) : 0;

    // Average review time (time from submission creation to first review)
    const avgReviewTime = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (r.created_at - s.created_at)) / 3600) as avg_hours
       FROM reviews r
       JOIN submissions s ON r.submission_id = s.id
       WHERE s.project_id = $1
       AND r.id = (
         SELECT id FROM reviews 
         WHERE submission_id = s.id 
         ORDER BY created_at ASC 
         LIMIT 1
       )`,
      [projectId]
    );

    // Most active reviewers
    const activeReviewers = await pool.query(
      `SELECT u.id, u.name, u.email, COUNT(r.id) as review_count
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       JOIN submissions s ON r.submission_id = s.id
       WHERE s.project_id = $1
       GROUP BY u.id, u.name, u.email
       ORDER BY review_count DESC
       LIMIT 5`,
      [projectId]
    );

    // Submission with most comments
    const mostCommented = await pool.query(
      `SELECT s.id, s.title, COUNT(c.id) as comment_count,
              u.name as submitter_name
       FROM submissions s
       LEFT JOIN comments c ON s.id = c.submission_id
       JOIN users u ON s.submitter_id = u.id
       WHERE s.project_id = $1
       GROUP BY s.id, s.title, u.name
       ORDER BY comment_count DESC
       LIMIT 1`,
      [projectId]
    );

    // Recent activity (last 10 submissions)
    const recentSubmissions = await pool.query(
      `SELECT s.id, s.title, s.status, s.created_at,
              u.name as submitter_name
       FROM submissions s
       JOIN users u ON s.submitter_id = u.id
       WHERE s.project_id = $1
       ORDER BY s.created_at DESC
       LIMIT 10`,
      [projectId]
    );

    res.json({
      stats: {
        total_submissions: parseInt(totalSubmissions.rows[0].count),
        submissions_by_status: submissionsByStatus.rows.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
        approval_rate: `${approvalRate}%`,
        avg_review_time_hours: avgReviewTime.rows[0].avg_hours 
          ? parseFloat(avgReviewTime.rows[0].avg_hours).toFixed(2) 
          : null,
        most_active_reviewers: activeReviewers.rows,
        most_commented_submission: mostCommented.rows[0] || null,
        recent_submissions: recentSubmissions.rows
      }
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve project statistics'
    });
  }
};