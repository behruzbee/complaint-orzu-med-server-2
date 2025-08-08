import { RequestedUser } from 'src/auth/current-user.decorator';

declare module 'express' {
  interface Request {
    user: RequestedUser;
  }
}