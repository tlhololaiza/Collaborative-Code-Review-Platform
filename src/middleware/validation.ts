import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validateRegistration = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('role')
    .optional()
    .isIn(['submitter', 'reviewer'])
    .withMessage('Role must be either submitter or reviewer'),
];

export const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('display_picture')
    .optional()
    .isURL()
    .withMessage('Display picture must be a valid URL'),
];

export const validateProject = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 3 })
    .withMessage('Project name must be at least 3 characters long'),
  body('description')
    .optional()
    .trim(),
];

export const validateAddMember = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

export const validateSubmission = [
  body('project_id')
    .notEmpty()
    .withMessage('Project ID is required')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters'),
  body('description')
    .optional()
    .trim(),
  body('code_content')
    .notEmpty()
    .withMessage('Code content is required'),
  body('file_name')
    .optional()
    .trim(),
  body('language')
    .optional()
    .trim(),
];

export const validateSubmissionStatus = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'in_review', 'approved', 'changes_requested'])
    .withMessage('Invalid status value'),
];

export const validateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  body('line_number')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Line number must be a positive integer'),
];

export const validateUpdateComment = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  body('is_resolved')
    .optional()
    .isBoolean()
    .withMessage('is_resolved must be a boolean'),
];

export const validateReview = [
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Comment must not exceed 2000 characters'),
];

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation Error',
      details: errors.array()
    });
    return;
  }
  
  next();
};

export default {
  validateRegistration,
  validateLogin,
  validateUpdateProfile,
  validateProject,
  validateAddMember,
  validateSubmission,
  validateSubmissionStatus,
  validateComment,
  validateUpdateComment,
  handleValidationErrors
};