"use client";

import { useEffect, useState } from "react";

export default function MockProvider({ children }: { children: React.ReactNode }) {
  // 生产环境不挂 mock，直接就绪；开发环境需等 service worker 启动后再渲染，
  // 否则子组件的首个 fetch 会抢在 worker 激活前发出、绕过 mock 命中 404。
  const [ready, setReady] = useState(process.env.NODE_ENV !== "development");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    let active = true;
    import("./browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .catch(() => {
        /* 启动失败也放行，避免开发环境白屏 */
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
