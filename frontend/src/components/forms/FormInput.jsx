import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

const FormInput = forwardRef(({
  type = 'text',
  name,
  value,
  onChange,
  onBlur,
  label,
  placeholder = '',
  error = '',
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
  errorClassName = 'mt-1 text-sm text-red-600',
  wrapperClassName = '',
  ...props
}, ref) => {
  const inputId = `${name}-input`;
  const hasError = Boolean(error);
  
  // Common input props
  const inputProps = {
    id: inputId,
    type,
    name,
    placeholder,
    disabled,
    className: `block w-full px-4 py-3 rounded-lg border ${
      hasError 
        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
    } transition duration-150 ease-in-out sm:text-sm ${inputClassName}`,
    'aria-invalid': hasError ? 'true' : 'false',
    'aria-describedby': hasError ? `${inputId}-error` : undefined,
    ...props,
  };

  // Render the input with react-hook-form ref if provided
  if (ref) {
    return (
      <div className={`${wrapperClassName} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={labelClassName}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-md shadow-sm">
          <input ref={ref} {...inputProps} />
        </div>
        {hasError && (
          <p className={errorClassName} id={`${inputId}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }

  // Render as controlled component
  return (
    <div className={`${wrapperClassName} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={labelClassName}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        <input
          {...inputProps}
          value={value || ''}
          onChange={onChange}
          onBlur={onBlur}
        />
      </div>
      {hasError && (
        <p className={errorClassName} id={`${inputId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
});

FormInput.displayName = 'FormInput';

FormInput.propTypes = {
  type: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.any,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  label: PropTypes.string,
  placeholder: PropTypes.string,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  errorClassName: PropTypes.string,
  wrapperClassName: PropTypes.string,
};

export default FormInput;
