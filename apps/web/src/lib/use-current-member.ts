import { useApiQuery } from '@/api/client'

/**
 * 取得目前登入會員的基本資料（id / email / name）。
 * staleTime 5 分鐘避免每次 mount 都打 /me。
 */
export const useCurrentMember = () => {
  const query = useApiQuery('GET', '/me', undefined, {
    staleTime: 5 * 60 * 1000,
  })

  return {
    member: query.data,
    name: query.data?.name,
    email: query.data?.email,
    sub: query.data?.id,
    isLoading: query.isLoading,
  }
}
