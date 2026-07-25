import { prisma } from '../lib/prisma.js';

export const userRepository = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async create(data: { email: string; password: string; name: string; role?: string }) {
    return prisma.user.create({
      data: { ...data, role: data.role as any },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async list() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async update(id: string, data: { name?: string; email?: string; role?: string }) {
    return prisma.user.update({
      where: { id },
      data: { ...data, role: data.role as any },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
