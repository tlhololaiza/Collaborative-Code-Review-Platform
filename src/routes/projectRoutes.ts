import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMember,
  removeMember
} from '../controllers/projectController';
import { getSubmissionsByProject } from '../controllers/submissionController';
import { authenticate } from '../middleware/auth';
import validation from '../middleware/validation';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// POST /api/projects - Create a new project
router.post(
  '/',
  validation.validateProject,
  validation.handleValidationErrors,
  createProject
);

// GET /api/projects - Get all projects for the logged-in user
router.get('/', getProjects);

// GET /api/projects/:id - Get a specific project
router.get('/:id', getProjectById);

// PUT /api/projects/:id - Update a project
router.put(
  '/:id',
  validation.validateProject,
  validation.handleValidationErrors,
  updateProject
);

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', deleteProject);

// POST /api/projects/:id/members - Add a member to a project
router.post(
  '/:id/members',
  validation.validateAddMember,
  validation.handleValidationErrors,
  addMember
);

// DELETE /api/projects/:id/members/:userId - Remove a member from a project
router.delete('/:id/members/:userId', removeMember);

export default router;