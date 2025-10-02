import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest, UserResponse } from '../types';

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // Check if user is accessing their own profile or is admin
    if (userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own profile'
      });
      return;
    }

    const result = await pool.query(
      'SELECT id, email, name, display_picture, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.json({
      user: result.rows[0] as UserResponse
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user profile'
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { name, display_picture } = req.body;

    // Check if user is updating their own profile
    if (userId !== req.user?.id) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile'
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

    if (display_picture !== undefined) {
      updates.push(`display_picture = $${paramCount}`);
      values.push(display_picture);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields to update'
      });
      return;
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramCount} 
       RETURNING id, email, name, display_picture, role, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0] as UserResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update profile'
    });
  }
};

export const deleteProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    // Check if user is deleting their own profile or is admin
    if (userId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own profile'
      });
      return;
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
};