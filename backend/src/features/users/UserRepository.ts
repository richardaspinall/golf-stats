import { getGoogleUserBySub, getUserByCredentials, getUserById, linkGoogleAccount } from '../../db/users.js';

export class UserRepository {
  static findByCredentials(input: { username: unknown; password: unknown }) {
    return getUserByCredentials(input);
  }

  static findById(userId: string) {
    return getUserById(userId);
  }

  static findGoogleLinkedUser(input: { googleSub: unknown; email: unknown; displayName: unknown }) {
    return getGoogleUserBySub(input);
  }

  static linkGoogleAccount(input: { userId: string; googleSub: unknown; email: unknown; displayName: unknown }) {
    return linkGoogleAccount(input);
  }
}
