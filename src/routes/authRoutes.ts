import { Router } from 'express';
import { register, login } from '../controllers/authController';
import {
  validateRegistration,
  validateLogin,
  handleValidationErrors
} from '../middleware/validation';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validateRegistration,
  handleValidationErrors,
  register
);

// POST /api/auth/login
router.post(
  '/login',
  validateLogin,
  handleValidationErrors,
  login
);

export default router;