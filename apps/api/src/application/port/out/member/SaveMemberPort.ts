export const SAVE_MEMBER_PORT = 'SAVE_MEMBER_PORT';

export interface SaveMemberPort {
  /** 更新最後登入時間（fire-and-forget） */
  updateLastLoginAt(id: string): Promise<void>;
}
