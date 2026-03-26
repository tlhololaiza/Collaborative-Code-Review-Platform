import { Router } from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/userController';
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

export default router;