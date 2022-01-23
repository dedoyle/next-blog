import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Banner from "@/components/Banner";
import PostItem, { PostItemData } from "@/components/PostItem";

const Home = ({ posts }: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <section className="article heti">
      <Banner />
      {posts.map((item) => (
        <PostItem key={item.frontmatter.title} data={item} />
      ))}
    </section>
  );
};

export const getStaticProps: GetStaticProps<{
  posts: PostItemData[];
}> = async () => {
  const files = fs.readdirSync(path.join("docs/posts"));
  const posts = files.map((filename) => {
    const slug = filename.replace(".md", "");
    const markdownWithMeta = fs.readFileSync(
      path.join("docs/posts", filename),
      "utf-8"
    );
    const { data: frontmatter } = matter(markdownWithMeta);
    return {
      slug,
      frontmatter,
    } as PostItemData;
  });
  return {
    props: {
      posts,
    },
  };
};

export default Home;
