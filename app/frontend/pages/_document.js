import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('fp_theme')||'cozy';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
