import { get } from './apiClient'
import { PostListData } from 'pages/api/post_list'

export const getPostList = async (): Promise<PostListData> => {
  const res = await get<PostListData>('post_list')
  return res
}
