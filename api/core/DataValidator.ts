/**
 * DataValidator - Validador genérico de datos basado en configuración de entidades
 */

import type { EntityConfig, ValidationConfig } from './EntityConfig.ts';

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validData: Record<string, unknown>;
}

export class DataValidator {
  private entityConfig: EntityConfig;

  constructor(entityConfig: EntityConfig) {
    this.entityConfig = entityConfig;
  }

  /**
   * Valida los datos según la configuración de la entidad
   */
  validate(data: Record<string, unknown>, isUpdate = false): ValidationResult {
    const errors: ValidationError[] = [];

    // Validar campos requeridos
    this.validateRequiredFields(data, isUpdate, errors);

    // Validar cada campo según su configuración
    Object.entries(data).forEach(([fieldName, value]) => {
      this.validateField(fieldName, value, errors);
    });

    return {
      isValid: errors.length === 0,
      errors,
      validData: data
    };
  }

  /**
   * Valida un campo específico
   */
  validateField(fieldName: string, value: unknown, errors: ValidationError[]): void {
    const fieldConfig = this.entityConfig.fields[fieldName];
    const validationConfig = this.entityConfig.validations?.[fieldName];

    if (!fieldConfig) {
      errors.push({
        field: fieldName,
        message: `Campo '${fieldName}' no está definido en la entidad`,
        value
      });
      return;
    }

    // Si el campo es de solo lectura, no debería estar en los datos
    if (fieldConfig.readonly) {
      errors.push({
        field: fieldName,
        message: `Campo '${fieldName}' es de solo lectura`,
        value
      });
      return;
    }

    // Si es null o undefined, no validar más (excepto si es requerido)
    if (value === null || value === undefined || value === '') {
      if (fieldConfig.required && !fieldConfig.autoIncrement) {
        errors.push({
          field: fieldName,
          message: validationConfig?.message || `Campo '${fieldName}' es requerido`,
          value
        });
      }
      return;
    }

    // Validaciones específicas si existe configuración
    if (validationConfig) {
      this.applyValidationRules(fieldName, value, validationConfig, errors);
    }

    // Validaciones basadas en el tipo de campo
    this.validateFieldType(fieldName, value, fieldConfig, errors);
  }

  /**
   * Aplica las reglas de validación configuradas
   */
  private applyValidationRules(
    fieldName: string,
    value: unknown,
    config: ValidationConfig,
    errors: ValidationError[]
  ): void {
    const stringValue = String(value);

    // Validar longitud mínima
    if (config.minLength && stringValue.length < config.minLength) {
      errors.push({
        field: fieldName,
        message: config.message || `Campo '${fieldName}' debe tener al menos ${config.minLength} caracteres`,
        value
      });
    }

    // Validar longitud máxima
    if (config.maxLength && stringValue.length > config.maxLength) {
      errors.push({
        field: fieldName,
        message: config.message || `Campo '${fieldName}' no puede exceder ${config.maxLength} caracteres`,
        value
      });
    }

    // Validar patrón regex
    if (config.pattern) {
      const regex = new RegExp(config.pattern);
      if (!regex.test(stringValue)) {
        errors.push({
          field: fieldName,
          message: config.message || `Campo '${fieldName}' no cumple con el formato requerido`,
          value
        });
      }
    }

    // Validar formato específico
    if (config.format) {
      if (!this.validateFormat(value, config.format)) {
        errors.push({
          field: fieldName,
          message: config.message || `Campo '${fieldName}' no tiene el formato correcto`,
          value
        });
      }
    }

    // Validar valores permitidos
    if (config.allowedValues && config.allowedValues.length > 0) {
      if (!config.allowedValues.includes(value as string | number | boolean)) {
        errors.push({
          field: fieldName,
          message: config.message || `Campo '${fieldName}' debe ser uno de: ${config.allowedValues.join(', ')}`,
          value
        });
      }
    }
  }

  /**
   * Valida el tipo de dato según la configuración del campo
   */
  private validateFieldType(
    fieldName: string,
    value: unknown,
    fieldConfig: { type: string; length?: number; values?: Array<{ value: string | number | boolean; label: string }> },
    errors: ValidationError[]
  ): void {
    switch (fieldConfig.type.toLowerCase()) {
      case 'number':
      case 'integer':
        if (isNaN(Number(value))) {
          errors.push({
            field: fieldName,
            message: `Campo '${fieldName}' debe ser un número`,
            value
          });
        }
        break;

      case 'varchar2':
      case 'char':
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: fieldName,
            message: `Campo '${fieldName}' debe ser texto`,
            value
          });
        } else if (fieldConfig.length && value.length > fieldConfig.length) {
          errors.push({
            field: fieldName,
            message: `Campo '${fieldName}' no puede exceder ${fieldConfig.length} caracteres`,
            value
          });
        }
        break;

      case 'date':
      case 'timestamp':
        if (!this.isValidDate(value)) {
          errors.push({
            field: fieldName,
            message: `Campo '${fieldName}' debe ser una fecha válida`,
            value
          });
        }
        break;
    }

    // Validar valores predefinidos
    if (fieldConfig.values && fieldConfig.values.length > 0) {
      const allowedValues = fieldConfig.values.map(v => v.value);
      if (!allowedValues.includes(value as string | number | boolean)) {
        const labels = fieldConfig.values.map(v => v.label).join(', ');
        errors.push({
          field: fieldName,
          message: `Campo '${fieldName}' debe ser uno de: ${labels}`,
          value
        });
      }
    }
  }

  /**
   * Valida campos requeridos
   */
  private validateRequiredFields(
    data: Record<string, unknown>,
    isUpdate: boolean,
    errors: ValidationError[]
  ): void {
    Object.entries(this.entityConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldConfig.required && !fieldConfig.autoIncrement) {
        const value = data[fieldName];
        const isEmpty = value === null || value === undefined || value === '';
        
        // En actualización, solo validar si el campo está presente
        if (!isUpdate || Object.prototype.hasOwnProperty.call(data, fieldName)) {
          if (isEmpty) {
            const validationConfig = this.entityConfig.validations?.[fieldName];
            errors.push({
              field: fieldName,
              message: validationConfig?.message || `Campo '${fieldName}' es requerido`,
              value
            });
          }
        }
      }
    });
  }

  /**
   * Valida formato específico (email, URL, etc.)
   */
  private validateFormat(value: unknown, format: string): boolean {
    const stringValue = String(value);

    switch (format.toLowerCase()) {
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(stringValue);
      }

      case 'url':
        try {
          new URL(stringValue);
          return true;
        } catch {
          return false;
        }

      case 'phone': {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(stringValue.replace(/[\s\-\(\)]/g, ''));
      }

      default:
        return true;
    }
  }

  /**
   * Valida si un valor es una fecha válida
   */
  private isValidDate(value: unknown): boolean {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }

    return false;
  }

  /**
   * Limpia y prepara los datos para la base de datos
   */
  sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    Object.entries(data).forEach(([fieldName, value]) => {
      const fieldConfig = this.entityConfig.fields[fieldName];
      
      if (!fieldConfig || fieldConfig.readonly || fieldConfig.autoIncrement) {
        return; // Omitir campos no válidos, readonly o auto-increment
      }

      if (value === null || value === undefined || value === '') {
        if (fieldConfig.default !== undefined) {
          sanitized[fieldName] = fieldConfig.default;
        } else if (!fieldConfig.required) {
          sanitized[fieldName] = null;
        }
        return;
      }

      // Convertir tipos según configuración
      switch (fieldConfig.type.toLowerCase()) {
        case 'number':
        case 'integer':
          sanitized[fieldName] = Number(value);
          break;

        case 'varchar2':
        case 'char':
        case 'string': {
          let stringValue = String(value).trim();
          if (fieldConfig.length && stringValue.length > fieldConfig.length) {
            stringValue = stringValue.substring(0, fieldConfig.length);
          }
          sanitized[fieldName] = stringValue;
          break;
        }

        case 'date':
        case 'timestamp':
          if (value instanceof Date) {
            sanitized[fieldName] = value;
          } else {
            sanitized[fieldName] = new Date(String(value));
          }
          break;

        default:
          sanitized[fieldName] = value;
      }
    });

    return sanitized;
  }

  /**
   * Obtiene mensajes de error en formato legible
   */
  getErrorMessages(errors: ValidationError[]): string[] {
    return errors.map(error => error.message);
  }

  /**
   * Obtiene errores agrupados por campo
   */
  getErrorsByField(errors: ValidationError[]): Record<string, string[]> {
    const errorsByField: Record<string, string[]> = {};
    
    errors.forEach(error => {
      if (!errorsByField[error.field]) {
        errorsByField[error.field] = [];
      }
      errorsByField[error.field].push(error.message);
    });

    return errorsByField;
  }
}
