import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const createSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { project_id, title, description, code_content, file_name, language } = req.body;
    const submitterId = req.user?.id;

    // Check if project exists and user has access
    const projectCheck = await pool.query(
      `SELECT p.id FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [project_id, submitterId]
    );

    if (projectCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found or access denied'
      });
      return;
    }

    const result = await pool.query(
      `INSERT INTO submissions (project_id, submitter_id, title, description, code_content, file_name, language, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') 
       RETURNING *`,
      [project_id, submitterId, title, description, code_content, file_name, language]
    );

    res.status(201).json({
      message: 'Submission created successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create submission'
    });
  }
};

export const getSubmissionsByProject = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const result = await pool.query(
      `SELECT s.*, u.name as submitter_name, u.email as submitter_email
       FROM submissions s
       JOIN users u ON s.submitter_id = u.id
       WHERE s.project_id = $1
       ORDER BY s.created_at DESC`,
      [projectId]
    );

    res.json({
      submissions: result.rows
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve submissions'
    });
  }
};

export const getSubmissionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.id;
    const userId = req.user?.id;

    // Get submission with access check
    const result = await pool.query(
      `SELECT s.*, u.name as submitter_name, u.email as submitter_email,
              p.name as project_name
       FROM submissions s
       JOIN users u ON s.submitter_id = u.id
       JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2 OR s.submitter_id = $2)`,
      [submissionId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Submission not found or access denied'
      });
      return;
    }

    res.json({
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve submission'
    });
  }
};

export const updateSubmissionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.id;
    const { status } = req.body;
    const userId = req.user?.id;

    // Validate status
    const validStatuses = ['pending', 'in_review', 'approved', 'changes_requested'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid status value'
      });
      return;
    }

    // Check if user is a reviewer (project owner or member) but NOT the submitter
    const accessCheck = await pool.query(
      `SELECT s.id, s.submitter_id, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE s.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [submissionId, userId]
    );

    if (accessCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Submission not found or access denied'
      });
      return;
    }

    // Submitters cannot change status
    if (accessCheck.rows[0].submitter_id === userId && 
        accessCheck.rows[0].owner_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Submitters cannot change submission status'
      });
      return;
    }

    const result = await pool.query(
      `UPDATE submissions 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, submissionId]
    );

    res.json({
      message: 'Submission status updated successfully',
      submission: result.rows[0]
    });
  } catch (error) {
    console.error('Update submission status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update submission status'
    });
  }
};

export const deleteSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissionId = req.params.id;
    const userId = req.user?.id;

    // Check if user is the submitter or project owner
    const accessCheck = await pool.query(
      `SELECT s.submitter_id, p.owner_id
       FROM submissions s
       JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1`,
      [submissionId]
    );

    if (accessCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Submission not found'
      });
      return;
    }

    const { submitter_id, owner_id } = accessCheck.rows[0];

    if (submitter_id !== userId && owner_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the submitter or project owner can delete this submission'
      });
      return;
    }

    await pool.query('DELETE FROM submissions WHERE id = $1', [submissionId]);

    res.json({
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete submission'
    });
  }
};