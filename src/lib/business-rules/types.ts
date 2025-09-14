/**
 * Business rules types and interfaces
 */

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Business rule violation error
 */
export class BusinessRuleError extends Error {
  constructor(
    message: string,
    public violations: string[] = []
  ) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

/**
 * Utility function to throw if validation fails
 */
export function enforceBusinessRules(validation: ValidationResult): void {
  if (!validation.isValid) {
    throw new BusinessRuleError(
      `Business rule violations: ${validation.errors.join(', ')}`,
      validation.errors
    );
  }
}