import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.id;
    const { content, line_number } = req.body;
    const userId = req.user?.id;

    // Check if submission exists and user has access
    const submissionCheck = await pool.query(
      `SELECT s.id, s.submitter_id, s.project_id, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR s.submitter_id = $2)`,
      [submissionId, userId]
    );

    if (submissionCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Submission not found or access denied'
      });
      return;
    }

    const { submitter_id, owner_id } = submissionCheck.rows[0];

    // Check if user is a reviewer (not the submitter unless they're also the owner)
    const isOwner = owner_id === userId;
    const isSubmitter = submitter_id === userId;
    
    if (isSubmitter && !isOwner) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Submitters cannot comment on their own submissions'
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO comments (submission_id, user_id, content, line_number) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [submissionId, userId, content, line_number || null]
    );

    res.status(201).json({
      message: 'Comment added successfully',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add comment'
    });
  }
};

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.id;
    const userId = req.user?.id;

    // Check if user has access to the submission
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
      `SELECT c.*, u.name as commenter_name, u.email as commenter_email
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.submission_id = $1
       ORDER BY c.line_number ASC NULLS FIRST, c.created_at ASC`,
      [submissionId]
    );

    res.json({
      comments: result.rows
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve comments'
    });
  }
};

export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commentId = req.params.id;
    const { content, is_resolved } = req.body;
    const userId = req.user?.id;

    // Check if comment exists and user is the owner
    const commentCheck = await pool.query(
      'SELECT user_id FROM comments WHERE id = $1',
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Comment not found'
      });
      return;
    }

    if (commentCheck.rows[0].user_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own comments'
      });
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramCount}`);
      values.push(content);
      paramCount++;
    }

    if (is_resolved !== undefined) {
      updates.push(`is_resolved = $${paramCount}`);
      values.push(is_resolved);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields to update'
      });
      return;
    }

    values.push(commentId);

    const result = await pool.query(
      `UPDATE comments 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    res.json({
      message: 'Comment updated successfully',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update comment'
    });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const commentId = req.params.id;
    const userId = req.user?.id;

    // Check if comment exists and user is the owner or project owner
    const commentCheck = await pool.query(
      `SELECT c.user_id, p.owner_id
       FROM comments c
       JOIN submissions s ON c.submission_id = s.id
       JOIN projects p ON s.project_id = p.id
       WHERE c.id = $1`,
      [commentId]
    );

    if (commentCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Comment not found'
      });
      return;
    }

    const { user_id, owner_id } = commentCheck.rows[0];

    if (user_id !== userId && owner_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own comments or comments in your projects'
      });
      return;
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);

    res.json({
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete comment'
    });
  }
};