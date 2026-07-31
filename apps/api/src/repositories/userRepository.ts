import { prisma } from '../lib/prisma.js';

export const userRepository = {
  async findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async create(data: { username: string; password: string; name: string; role?: string; email?: string }) {
    return prisma.user.create({
      data: { ...data, role: data.role as any },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async list() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async update(id: string, data: { name?: string; username?: string; email?: string; role?: string }) {
    return prisma.user.update({
      where: { id },
      data: { ...data, role: data.role as any },
      select: { id: true, username: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
  },

  async softDelete(id: string) {
    return prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
