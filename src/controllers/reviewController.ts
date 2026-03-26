import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const approveSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const submissionId = req.params.id;
    const { comment } = req.body;
    const reviewerId = req.user?.id;

    await client.query('BEGIN');

    // Check if submission exists and user is a reviewer (not the submitter)
    const submissionCheck = await client.query(
      `SELECT s.id, s.submitter_id, s.status, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [submissionId, reviewerId]
    );

    if (submissionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        error: 'Not Found',
        message: 'Submission not found or access denied'
      });
      return;
    }

    const { submitter_id, status } = submissionCheck.rows[0];

    // Check if reviewer is the submitter
    if (submitter_id === reviewerId) {
      await client.query('ROLLBACK');
      res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot review your own submission'
      });
      return;
    }

    // Insert review record
    const reviewResult = await client.query(
      `INSERT INTO reviews (submission_id, reviewer_id, action, comment) 
       VALUES ($1, $2, 'approved', $3) 
       RETURNING *`,
      [submissionId, reviewerId, comment]
    );

    // Update submission status to approved
    const submissionResult = await client.query(
      `UPDATE submissions 
       SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [submissionId]
    );

    // Create notification for submitter
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id) 
       VALUES ($1, 'review', 'Submission Approved', $2, $3)`,
      [
        submitter_id,
        `Your submission has been approved${comment ? ': ' + comment : ''}`,
        submissionId
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Submission approved successfully',
      review: reviewResult.rows[0],
      submission: submissionResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve submission error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to approve submission'
    });
  } finally {
    client.release();
  }
};

export const requestChanges = async (req: AuthRequest, res: Response): Promise<void> => {
  const client = await pool.connect();
  
  try {
    const submissionId = req.params.id;
    const { comment } = req.body;
    const reviewerId = req.user?.id;

    if (!comment || comment.trim() === '') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Comment is required when requesting changes'
      });
      return;
    }

    await client.query('BEGIN');

    // Check if submission exists and user is a reviewer (not the submitter)
    const submissionCheck = await client.query(
      `SELECT s.id, s.submitter_id, s.status, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [submissionId, reviewerId]
    );

    if (submissionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        error: 'Not Found',
        message: 'Submission not found or access denied'
      });
      return;
    }

    const { submitter_id } = submissionCheck.rows[0];

    // Check if reviewer is the submitter
    if (submitter_id === reviewerId) {
      await client.query('ROLLBACK');
      res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot review your own submission'
      });
      return;
    }

    // Insert review record
    const reviewResult = await client.query(
      `INSERT INTO reviews (submission_id, reviewer_id, action, comment) 
       VALUES ($1, $2, 'changes_requested', $3) 
       RETURNING *`,
      [submissionId, reviewerId, comment]
    );

    // Update submission status to changes_requested
    const submissionResult = await client.query(
      `UPDATE submissions 
       SET status = 'changes_requested', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [submissionId]
    );

    // Create notification for submitter
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id) 
       VALUES ($1, 'review', 'Changes Requested', $2, $3)`,
      [
        submitter_id,
        `Changes requested on your submission: ${comment}`,
        submissionId
      ]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Changes requested successfully',
      review: reviewResult.rows[0],
      submission: submissionResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Request changes error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to request changes'
    });
  } finally {
    client.release();
  }
};

export const getReviewHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.id;
    const userId = req.user?.id;

    // Check if user has access to this submission
    const accessCheck = await pool.query(
      `SELECT s.id FROM submissions s
       JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR s.submitter_id = $2)`,
      [submissionId, userId]
    );

    if (accessCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Submission not found or access denied'
      });
      return;
    }

    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.email as reviewer_email
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.submission_id = $1
       ORDER BY r.created_at DESC`,
      [submissionId]
    );

    res.json({
      reviews: result.rows
    });
  } catch (error) {
    console.error('Get review history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve review history'
    });
  }
};