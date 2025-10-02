import { Router } from 'express';
import {
  createSubmission,
  getSubmissionById,
  updateSubmissionStatus,
  deleteSubmission
} from '../controllers/submissionController';
import { authenticate } from '../middleware/auth';
import * as validation from '../middleware/validation';

const router = Router();

// All submission routes require authentication
router.use(authenticate);

// POST /api/submissions - Create a new submission
router.post(
  '/',
  validation.validateSubmission,
  validation.handleValidationErrors,
  createSubmission
);

// GET /api/submissions/:id - Get a specific submission
router.get('/:id', getSubmissionById);

// PUT /api/submissions/:id/status - Update submission status
router.put(
  '/:id/status',
  validation.validateSubmissionStatus,
  validation.handleValidationErrors,
  updateSubmissionStatus
);

// DELETE /api/submissions/:id - Delete a submission
router.delete('/:id', deleteSubmission);

export default router;