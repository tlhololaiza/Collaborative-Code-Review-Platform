import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const ownerId = req.user?.id;

    const result = await pool.query(
      `INSERT INTO projects (name, description, owner_id) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, description, owner_id, created_at`,
      [name, description, ownerId]
    );

    res.status(201).json({
      message: 'Project created successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create project'
    });
  }
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    // Get projects where user is owner or member
    const result = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.description, p.owner_id, p.created_at,
              u.name as owner_name
       FROM projects p
       LEFT JOIN users u ON p.owner_id = u.id
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      projects: result.rows
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve projects'
    });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;

    // Check if user has access to this project
    const accessCheck = await pool.query(
      `SELECT p.* FROM projects p
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

    // Get project with owner details
    const projectResult = await pool.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email
       FROM projects p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = $1`,
      [projectId]
    );

    // Get project members
    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.role as user_role, pm.role as project_role, pm.joined_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at DESC`,
      [projectId]
    );

    res.json({
      project: {
        ...projectResult.rows[0],
        members: membersResult.rows
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve project'
    });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;
    const { name, description } = req.body;

    // Check if user is the owner
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
      return;
    }

    if (ownerCheck.rows[0].owner_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the project owner can update the project'
      });
      return;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields to update'
      });
      return;
    }

    values.push(projectId);

    const result = await pool.query(
      `UPDATE projects 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} 
       RETURNING *`,
      values
    );

    res.json({
      message: 'Project updated successfully',
      project: result.rows[0]
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update project'
    });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;

    // Check if user is the owner
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
      return;
    }

    if (ownerCheck.rows[0].owner_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the project owner can delete the project'
      });
      return;
    }

    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);

    res.json({
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete project'
    });
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const { userId: memberUserId } = req.body;
    const requesterId = req.user?.id;

    // Check if requester is the owner
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
      return;
    }

    if (ownerCheck.rows[0].owner_id !== requesterId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the project owner can add members'
      });
      return;
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [memberUserId]
    );

    if (userCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    // Check if already a member
    const memberCheck = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, memberUserId]
    );

    if (memberCheck.rows.length > 0) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User is already a member of this project'
      });
      return;
    }

    // Add member
    const result = await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) 
       VALUES ($1, $2, 'reviewer') 
       RETURNING *`,
      [projectId, memberUserId]
    );

    res.status(201).json({
      message: 'Member added successfully',
      member: result.rows[0]
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add member'
    });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    const memberUserId = req.params.userId;
    const requesterId = req.user?.id;

    // Check if requester is the owner
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM projects WHERE id = $1',
      [projectId]
    );

    if (ownerCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found'
      });
      return;
    }

    if (ownerCheck.rows[0].owner_id !== requesterId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the project owner can remove members'
      });
      return;
    }

    const result = await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *',
      [projectId, memberUserId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Member not found in this project'
      });
      return;
    }

    res.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove member'
    });
  }
};