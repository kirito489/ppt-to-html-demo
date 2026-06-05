import { Member } from '../../../../domain/model/Member';

export const LOAD_MEMBER_PORT = 'LOAD_MEMBER_PORT';

export interface LoadMemberPort {
  /** 依 email 載入會員（含 password hash），登入用 */
  loadMemberByEmail(email: string): Promise<Member | null>;
}
