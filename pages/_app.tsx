import ToolBox from "@/components/ToolBox";
import "../styles/globals.scss";

import type { AppProps } from "next/app";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <section className="p-12">
      <Component {...pageProps} />
      <ToolBox />
    </section>
  );
}

export default MyApp;
