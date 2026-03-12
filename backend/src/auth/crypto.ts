import crypto from 'node:crypto';

export const safeCompare = (a: string, b: string) => {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

const SCRYPT_KEY_LENGTH = 64;

export const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result as Buffer);
    });
  });

  return `${salt}:${derivedKey.toString('hex')}`;
};

export const verifyPassword = async (password: string, storedHash: string) => {
  const [salt, expectedHash] = String(storedHash || '').split(':');
  if (!salt || !expectedHash) {
    return false;
  }

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEY_LENGTH, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result as Buffer);
    });
  });

  return safeCompare(derivedKey.toString('hex'), expectedHash);
};
