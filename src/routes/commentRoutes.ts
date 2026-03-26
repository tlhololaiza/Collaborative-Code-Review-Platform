import { Router } from 'express';
import {
  updateComment,
  deleteComment
} from '../controllers/commentController';
import { authenticate } from '../middleware/auth';
import validation from '../middleware/validation';

const router = Router();

// All comment routes require authentication
router.use(authenticate);

// PUT /api/comments/:id - Update a comment
router.put(
  '/:id',
  validation.validateUpdateComment,
  validation.handleValidationErrors,
  updateComment
);

// DELETE /api/comments/:id - Delete a comment
router.delete('/:id', deleteComment);

export default router;