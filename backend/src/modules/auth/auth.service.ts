import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { RedisService } from '../redis/redis.service.js';
import { users } from '../../db/schema.js';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly memoryUsers = new Map<string, { id: string; name: string; email: string; passwordHash: string }>();
  private readonly memorySessions = new Map<string, AuthUser>();

  constructor(
    private readonly database: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, stored: string): boolean {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(data: { email?: string; password?: string; nombre?: string; name?: string }): Promise<AuthResponse> {
    const email = (data.email || '').trim().toLowerCase();
    const password = (data.password || '').trim();
    const nombre = (data.nombre || data.name || '').trim() || email.split('@')[0] || 'Facilitador';

    if (!email || !email.includes('@')) {
      throw new HttpException('Email inválido', HttpStatus.BAD_REQUEST);
    }
    if (!password || password.length < 6) {
      throw new HttpException('La contraseña debe tener al menos 6 caracteres', HttpStatus.BAD_REQUEST);
    }

    const passwordHash = this.hashPassword(password);
    let userId: string = crypto.randomUUID();

    if (this.database.db) {
      try {
        const existing = await this.database.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existing.length > 0) {
          throw new HttpException('El email ya se encuentra registrado', HttpStatus.CONFLICT);
        }

        const [created] = await this.database.db
          .insert(users)
          .values({
            name: nombre,
            email,
            passwordHash,
          })
          .returning();

        if (created) userId = created.id;
      } catch (err: unknown) {
        if (err instanceof HttpException) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error guardando usuario en PostgreSQL: ${msg}`);
      }
    } else {
      if (this.memoryUsers.has(email)) {
        throw new HttpException('El email ya se encuentra registrado', HttpStatus.CONFLICT);
      }
      this.memoryUsers.set(email, { id: userId, name: nombre, email, passwordHash });
    }

    const user: AuthUser = { id: userId, email, nombre };
    const token = this.generateToken();

    // Guardar sesión en Redis y memoria
    await this.redis.set(`auth:${token}`, JSON.stringify(user), { EX: SESSION_TTL_SECONDS });
    this.memorySessions.set(token, user);

    this.logger.log(`Usuario registrado: ${email}`);
    return { user, token };
  }

  async login(data: { email?: string; password?: string }): Promise<AuthResponse> {
    const email = (data.email || '').trim().toLowerCase();
    const password = (data.password || '').trim();

    if (!email || !password) {
      throw new HttpException('Email y contraseña requeridos', HttpStatus.BAD_REQUEST);
    }

    let foundUser: { id: string; name: string; email: string; passwordHash: string } | undefined;

    if (this.database.db) {
      try {
        const rows = await this.database.db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (rows.length > 0) {
          foundUser = {
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            passwordHash: rows[0].passwordHash,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Error consultando usuario en PostgreSQL: ${msg}`);
      }
    }

    if (!foundUser) {
      foundUser = this.memoryUsers.get(email);
    }

    if (!foundUser || !this.verifyPassword(password, foundUser.passwordHash)) {
      throw new HttpException('Credenciales incorrectas', HttpStatus.UNAUTHORIZED);
    }

    const user: AuthUser = {
      id: foundUser.id,
      email: foundUser.email,
      nombre: foundUser.name,
    };
    const token = this.generateToken();

    await this.redis.set(`auth:${token}`, JSON.stringify(user), { EX: SESSION_TTL_SECONDS });
    this.memorySessions.set(token, user);

    this.logger.log(`Inicio de sesión exitoso: ${email}`);
    return { user, token };
  }

  async getMe(token?: string): Promise<{ user: AuthUser }> {
    if (!token) {
      throw new HttpException('Token de autorización no provisto', HttpStatus.UNAUTHORIZED);
    }

    // Buscar en Redis
    const cached = await this.redis.get(`auth:${token}`);
    if (cached) {
      try {
        const user = JSON.parse(cached) as AuthUser;
        return { user };
      } catch {
        // Ignorar error de parsing
      }
    }

    // Buscar en memoria
    const user = this.memorySessions.get(token);
    if (user) {
      return { user };
    }

    throw new HttpException('Sesión inválida o expirada', HttpStatus.UNAUTHORIZED);
  }

  async logout(token?: string): Promise<{ ok: boolean }> {
    if (token) {
      await this.redis.del(`auth:${token}`);
      this.memorySessions.delete(token);
    }
    return { ok: true };
  }
}
