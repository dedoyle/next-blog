import { useEffect, useState } from 'react'
import { getPostList } from 'services/postService'
import { handleError } from 'services/apiClient'
import PostItem from '@/components/PostItem'
import { PostItemData } from '../api/post_list'

const PostList = () => {
  const [data, setData] = useState<{
    list: PostItemData[]
    total: number
  } | null>(null)
  useEffect(() => {
    getPostList()
      .then((res) => {
        setData(res.data)
      })
      .catch(handleError)
  }, [])
  return (
    <div>
      <header className="text-xl font-medium px-6 py-8">PostList</header>
      {data?.list?.map((item) => (
        <PostItem key={item.id} data={item} />
      ))}
    </div>
  )
}

export default PostList
