import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const adminController = {
  async getUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(users);
    } catch (error) {
      console.error('[Admin] Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro interno ao buscar usuários' });
    }
  },

  async toggleUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      const user = await prisma.user.update({
        where: { id: id as string },
        data: { isActive },
        select: { id: true, email: true, isActive: true }
      });

      res.json(user);
    } catch (error) {
      console.error('[Admin] Erro ao alterar status do usuário:', error);
      res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.user.delete({ where: { id: id as string } });
      res.json({ message: 'Usuário excluído com sucesso' });
    } catch (error) {
      console.error('[Admin] Erro ao excluir usuário:', error);
      res.status(500).json({ error: 'Erro interno ao excluir usuário' });
    }
  }
};
