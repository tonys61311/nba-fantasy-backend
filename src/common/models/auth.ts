export type VerifiedUser = {
  uid: string;
  email: string;
};

export type UserWithRole = VerifiedUser & {
  role: string;
};

// 對外回應 DTO（/auth/login 與 /auth/me 共用）
export class AuthUserDto {
  uid!: string;
  email!: string;
  role!: string;
}
