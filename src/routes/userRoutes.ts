import { Router } from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/userController';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController';
import { authenticate } from '../middleware/auth';
import {
  validateUpdateProfile,
  handleValidationErrors
} from '../middleware/validation';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users/:id
router.get('/:id', getProfile);

// PUT /api/users/:id
router.put(
  '/:id',
  validateUpdateProfile,
  handleValidationErrors,
  updateProfile
);

// DELETE /api/users/:id
router.delete('/:id', deleteProfile);

// GET /api/users/:id/notifications - Get user notifications
router.get('/:id/notifications', getUserNotifications);

// PUT /api/users/:id/notifications/:notificationId/read - Mark notification as read
router.put('/:id/notifications/:notificationId/read', markAsRead);

// PUT /api/users/:id/notifications/read - Mark all notifications as read
router.put('/:id/notifications/read', markAllAsRead);

export default router;