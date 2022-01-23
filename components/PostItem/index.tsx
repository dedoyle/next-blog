import Link from "next/link";

export type PostItemData = {
  slug: string;
  frontmatter: {
    [k: string]: any;
  };
};

type PostItemProps = {
  data: PostItemData;
};

const PostItem = ({ data }: PostItemProps) => {
  return (
    <>
      <h2>{data.frontmatter.title}</h2>
      <div>{data.frontmatter.date}</div>
      <p>{data.frontmatter.excerpt}</p>
      <Link href={`/blog/${data.slug}`}>Read More</Link>
    </>
  );
};

export default PostItem;
