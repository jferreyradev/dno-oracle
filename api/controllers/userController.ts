/**
 * Controlador para operaciones de usuarios
 */

import { executeSQL, paginate, querySQL } from "../../src/db-improved.js";
import { User } from "../models/User.ts";
import { validateUser } from "../models/User.ts";

class UserController {
  /**
   * Obtener todos los usuarios con paginación
   */
  async getUsers(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const search = url.searchParams.get("search") || "";

      let sql = `
        SELECT 
          user_id,
          username,
          email,
          full_name,
          created_at,
          updated_at,
          is_active
        FROM users
      `;

      const params: any[] = [];

      if (search) {
        sql += ` WHERE 
          LOWER(username) LIKE LOWER(:search) 
          OR LOWER(email) LIKE LOWER(:search)
          OR LOWER(full_name) LIKE LOWER(:search)
        `;
        params.push(`%${search}%`);
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await paginate(sql, params, page, limit);

      return new Response(
        JSON.stringify({
          success: true,
          data: result.data,
          pagination: result.pagination,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en getUsers:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al obtener usuarios",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(id: string): Promise<Response> {
    try {
      if (!id || isNaN(Number(id))) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ID de usuario inválido",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const sql = `
        SELECT 
          user_id,
          username,
          email,
          full_name,
          created_at,
          updated_at,
          is_active
        FROM users 
        WHERE user_id = :id
      `;

      const result = await querySQL(sql, [Number(id)]);

      if (!result || result.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Usuario no encontrado",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result[0],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en getUserById:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al obtener usuario",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Crear nuevo usuario
   */
  async createUser(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      // Validar datos del usuario
      const validation = validateUser(body);
      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Datos de usuario inválidos",
            details: validation.errors,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Verificar si el usuario ya existe
      const existingUser = await querySQL(
        "SELECT user_id FROM users WHERE username = :username OR email = :email",
        [body.username, body.email],
      );

      if (existingUser && existingUser.length > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "El usuario o email ya existe",
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Crear el usuario
      const sql = `
        INSERT INTO users (username, email, full_name, is_active)
        VALUES (:username, :email, :fullName, :isActive)
        RETURNING user_id INTO :userId
      `;

      const params = {
        username: body.username,
        email: body.email,
        fullName: body.fullName || body.username,
        isActive: body.isActive !== undefined ? body.isActive : 1,
        userId: { dir: 3003, type: 2010 }, // OUT parameter
      };

      const result = await executeSQL(sql, params);

      // Obtener el usuario creado
      const newUser = await querySQL(
        "SELECT * FROM users WHERE user_id = :id",
        [result.outBinds.userId],
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Usuario creado exitosamente",
          data: newUser[0],
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en createUser:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al crear usuario",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Actualizar usuario
   */
  async updateUser(id: string, request: Request): Promise<Response> {
    try {
      if (!id || isNaN(Number(id))) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ID de usuario inválido",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const body = await request.json();

      // Verificar que el usuario existe
      const existingUser = await querySQL(
        "SELECT user_id FROM users WHERE user_id = :id",
        [Number(id)],
      );

      if (!existingUser || existingUser.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Usuario no encontrado",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Construir la consulta de actualización dinámicamente
      const updates: string[] = [];
      const params: any[] = [Number(id)];

      if (body.username !== undefined) {
        updates.push("username = :username");
        params.push(body.username);
      }
      if (body.email !== undefined) {
        updates.push("email = :email");
        params.push(body.email);
      }
      if (body.fullName !== undefined) {
        updates.push("full_name = :fullName");
        params.push(body.fullName);
      }
      if (body.isActive !== undefined) {
        updates.push("is_active = :isActive");
        params.push(body.isActive ? 1 : 0);
      }

      if (updates.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No hay campos para actualizar",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");

      const sql = `
        UPDATE users 
        SET ${updates.join(", ")} 
        WHERE user_id = :id
      `;

      await executeSQL(sql, params);

      // Obtener el usuario actualizado
      const updatedUser = await querySQL(
        "SELECT * FROM users WHERE user_id = :id",
        [Number(id)],
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Usuario actualizado exitosamente",
          data: updatedUser[0],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en updateUser:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al actualizar usuario",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(id: string): Promise<Response> {
    try {
      if (!id || isNaN(Number(id))) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "ID de usuario inválido",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Verificar que el usuario existe
      const existingUser = await querySQL(
        "SELECT user_id, username FROM users WHERE user_id = :id",
        [Number(id)],
      );

      if (!existingUser || existingUser.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Usuario no encontrado",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Eliminar el usuario
      const sql = "DELETE FROM users WHERE user_id = :id";
      await executeSQL(sql, [Number(id)]);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Usuario ${existingUser[0].USERNAME} eliminado exitosamente`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error en deleteUser:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al eliminar usuario",
          details: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }
}

export const userController = new UserController();
