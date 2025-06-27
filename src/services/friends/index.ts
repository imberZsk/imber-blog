import { strapiService } from '@/services'

export async function fetchFriends() {
  return await strapiService.request('/api/friends?populate=avatar', {
    next: { revalidate: 60 * 5 }
    // GET 不用带Token
  })
}
