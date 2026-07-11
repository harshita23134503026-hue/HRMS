// Validation utility functions

/**
 * Validates company signup form data
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateCompanySignup = (formData) => {
  const { companyName, email, password, confirmPassword, companyType, address } = formData;

  if (!companyName.trim()) {
    return { isValid: false, error: "Company name is required" };
  }

  if (companyName.trim().length < 2) {
    return { isValid: false, error: "Company name must be at least 2 characters" };
  }

  if (!email.trim()) {
    return { isValid: false, error: "Company email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }

  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < 6) {
    return { isValid: false, error: "Password must be at least 6 characters" };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" };
  }

  if (!companyType) {
    return { isValid: false, error: "Please select a company type" };
  }

  if (!address.trim()) {
    return { isValid: false, error: "Company address is required" };
  }

  if (address.trim().length < 5) {
    return { isValid: false, error: "Please enter a valid company address" };
  }

  return { isValid: true, error: null };
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum password length (default: 6)
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validatePassword = (password, minLength = 6) => {
  if (!password) {
    return { isValid: false, error: "Password is required" };
  }

  if (password.length < minLength) {
    return { isValid: false, error: `Password must be at least ${minLength} characters` };
  }

  return { isValid: true, error: null };
};
