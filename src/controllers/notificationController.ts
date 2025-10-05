import { Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../types';

export const getUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const requesterId = req.user?.id;

    // Users can only view their own notifications
    if (userId !== requesterId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only view your own notifications'
      });
      return;
    }

    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    // Count unread notifications
    const unreadCount = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      notifications: result.rows,
      unread_count: parseInt(unreadCount.rows[0].count)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve notifications'
    });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user?.id;

    // Check if notification belongs to the user
    const notificationCheck = await pool.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [notificationId]
    );

    if (notificationCheck.rows.length === 0) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found'
      });
      return;
    }

    if (notificationCheck.rows[0].user_id !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own notifications'
      });
      return;
    }

    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true 
       WHERE id = $1 
       RETURNING *`,
      [notificationId]
    );

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update notification'
    });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const requesterId = req.user?.id;

    if (userId !== requesterId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own notifications'
      });
      return;
    }

    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update notifications'
    });
  }
};