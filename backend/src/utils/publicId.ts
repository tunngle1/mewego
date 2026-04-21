import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const PREFIX = 'MWG-';
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // base32 without I,L,O,U

const randomBase32 = (length: number): string => {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
};

export const generatePublicId = (): string => {
  return `${PREFIX}${randomBase32(6)}`;
};

export const ensurePublicId = async (prisma: PrismaClient, userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicId: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.publicId) {
    return user.publicId;
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const publicId = generatePublicId();
    const existing = await prisma.user.findUnique({
      where: { publicId },
      select: { id: true },
    });

    if (existing) continue;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { publicId },
      select: { publicId: true },
    });

    return updated.publicId!;
  }

  throw new Error('Failed to generate unique publicId');
};

export const createUserWithPublicId = async (
  prisma: PrismaClient,
  data: {
    id: string;
    role: string;
    name?: string | null;
    phone?: string | null;
    telegramId?: string | null;
    onboardingCompleted?: boolean;
  }
) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const publicId = generatePublicId();
    const existing = await prisma.user.findUnique({ where: { publicId }, select: { id: true } });
    if (existing) continue;

    return prisma.user.create({
      data: {
        ...data,
        publicId,
      },
    });
  }

  throw new Error('Failed to create user with unique publicId');
};
