import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole } from '@handmade-shop/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
// Parse JWT expiry: numeric string = seconds, "7d" style = passed to jwt.sign directly
const rawExpiry = process.env.JWT_EXPIRES_IN || '604800';
const JWT_EXPIRES_IN = (
  /^\d+$/.test(rawExpiry) ? parseInt(rawExpiry, 10) : rawExpiry
) as jwt.SignOptions['expiresIn'];

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);
    if (!user || user.deletedAt) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    };
  },

  async createUser(data: { email: string; password: string; name: string; role?: UserRole }) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('Email already in use', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      ...data,
      password: hashedPassword,
    });

    return user;
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  },
};
