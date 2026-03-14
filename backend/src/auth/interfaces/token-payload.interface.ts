export interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
