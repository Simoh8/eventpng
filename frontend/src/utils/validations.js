// Validation helpers
const required = (value) => (value ? undefined : 'This field is required');

const minLength = (min) => (value) =>
  value && value.length < min ? `Must be at least ${min} characters` : undefined;

const maxLength = (max) => (value) =>
  value && value.length > max ? `Must be at most ${max} characters` : undefined;

const email = (value) =>
  value && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)
    ? 'Invalid email address'
    : undefined;

// Compose multiple validators
const composeValidators = (...validators) => (value) =>
  validators.reduce(
    (error, validator) => error || (validator && validator(value)),
    undefined
  );

// Common field validations
export const validateEmail = composeValidators(
  required,
  email,
  maxLength(255)
);

export const validatePassword = composeValidators(
  required,
  minLength(8),
  maxLength(100)
);

export const validateRequired = (value) =>
  required(value) ? 'This field is required' : undefined;

// Form validation utilities
export const validateForm = (values, validations) => {
  const errors = {};
  
  Object.keys(validations).forEach((field) => {
    const fieldValidations = Array.isArray(validations[field])
      ? validations[field]
      : [validations[field]];
    
    for (const validate of fieldValidations) {
      const error = validate(values[field], values);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });

  return errors;
};

export default {
  required,
  minLength,
  maxLength,
  email,
  composeValidators,
  validateEmail,
  validatePassword,
  validateRequired,
  validateForm,
};
