import { JWT_TTL_SECONDS } from '../../config/env.js';
import { signToken } from '../../auth/jwt.js';

export class AuthService {
  static issueToken(user: { id: string; username: string }) {
    return {
      token: signToken({ subject: user.username, userId: user.id }),
      expiresIn: Math.max(60, Math.floor(JWT_TTL_SECONDS)),
    };
  }
}
