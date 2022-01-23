import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import Link from "next/link";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { ParsedUrlQuery } from "querystring";

const PostPage = ({
  frontmatter: { title, date },
  content,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  return (
    <div>
      <Link href="/">Home</Link>
      <article className="article heti">
        <h1>{title}</h1>
        <p>
          <time className="heti-meta heti-small">{date}</time>
        </p>
        <section
          dangerouslySetInnerHTML={{ __html: marked(content) }}
        ></section>
      </article>
    </div>
  );
};

export async function getStaticPaths() {
  const files = fs.readdirSync(path.join("docs/posts"));

  const paths = files.map((filename) => ({
    params: { slug: filename.replace(".md", "") },
  }));

  return {
    paths,
    fallback: false,
  };
}

interface IParams extends ParsedUrlQuery {
  slug: string;
}

export const getStaticProps: GetStaticProps<
  {
    frontmatter: { [k: string]: any };
    slug: string;
    content: string;
  },
  IParams
> = async (context) => {
  const { slug } = context.params as IParams;
  const markdownWithMeta = fs.readFileSync(
    path.join("docs/posts", slug + ".md"),
    "utf-8"
  );

  const { data: frontmatter, content } = matter(markdownWithMeta);

  return {
    props: {
      frontmatter,
      slug,
      content,
    },
  };
};

export default PostPage;
