/**
 * Modelo de Usuario
 */

export interface User {
  user_id?: number;
  username: string;
  email: string;
  full_name?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Valida los datos de un usuario
 */
export function validateUser(userData: any): UserValidation {
  const errors: string[] = [];

  if (!userData) {
    errors.push("Los datos del usuario son requeridos");
    return { valid: false, errors };
  }

  // Validar username
  if (!userData.username || typeof userData.username !== "string") {
    errors.push("El nombre de usuario es requerido");
  } else if (userData.username.length < 3) {
    errors.push("El nombre de usuario debe tener al menos 3 caracteres");
  } else if (userData.username.length > 50) {
    errors.push("El nombre de usuario no puede tener más de 50 caracteres");
  } else if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
    errors.push(
      "El nombre de usuario solo puede contener letras, números y guiones bajos",
    );
  }

  // Validar email
  if (!userData.email || typeof userData.email !== "string") {
    errors.push("El email es requerido");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push("El formato del email no es válido");
  } else if (userData.email.length > 100) {
    errors.push("El email no puede tener más de 100 caracteres");
  }

  // Validar full_name (opcional)
  if (userData.fullName !== undefined) {
    if (typeof userData.fullName !== "string") {
      errors.push("El nombre completo debe ser una cadena de texto");
    } else if (userData.fullName.length > 100) {
      errors.push("El nombre completo no puede tener más de 100 caracteres");
    }
  }

  // Validar is_active (opcional)
  if (userData.isActive !== undefined) {
    if (
      typeof userData.isActive !== "boolean" && userData.isActive !== 0 &&
      userData.isActive !== 1
    ) {
      errors.push("El estado activo debe ser un valor booleano");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convierte un objeto de base de datos a un User
 */
export function dbToUser(dbRow: any): User {
  return {
    user_id: dbRow.USER_ID || dbRow.user_id,
    username: dbRow.USERNAME || dbRow.username,
    email: dbRow.EMAIL || dbRow.email,
    full_name: dbRow.FULL_NAME || dbRow.full_name,
    is_active: (dbRow.IS_ACTIVE || dbRow.is_active) === 1,
    created_at: dbRow.CREATED_AT || dbRow.created_at,
    updated_at: dbRow.UPDATED_AT || dbRow.updated_at,
  };
}
