import crypto from 'crypto';

const PASSWORD_SCRYPT_N = 16384;
const PASSWORD_SCRYPT_R = 8;
const PASSWORD_SCRYPT_P = 1;
const PASSWORD_KEYLEN = 64;

export const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      PASSWORD_KEYLEN,
      {
        N: PASSWORD_SCRYPT_N,
        r: PASSWORD_SCRYPT_R,
        p: PASSWORD_SCRYPT_P,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key as Buffer);
      }
    );
  });

  return ['scrypt', salt, derivedKey.toString('hex')].join('$');
};

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [algorithm, salt, expectedHex] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) {
    return false;
  }

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(
      password,
      salt,
      PASSWORD_KEYLEN,
      {
        N: PASSWORD_SCRYPT_N,
        r: PASSWORD_SCRYPT_R,
        p: PASSWORD_SCRYPT_P,
      },
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(key as Buffer);
      }
    );
  });

  const expected = Buffer.from(expectedHex, 'hex');
  if (expected.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, derivedKey);
};

export const validatePasswordStrength = (password: string) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  return null;
};
