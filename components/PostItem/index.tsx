import { PostItemData } from 'pages/api/post_list'

type PostItemProps = {
  data: PostItemData
}

const PostItem = ({ data }: PostItemProps) => {
  return (
    <article className="bg-white dark:bg-slate-900 px-6 py-8">
      <header className="text-lg">{data.title}</header>
      <p className="text-base">{data.content}</p>
    </article>
  )
}

export default PostItem
