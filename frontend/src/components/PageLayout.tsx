import { ReactNode } from "react";

const PageLayout = ({ children }: { children: ReactNode }) => (
  <div className="max-w-6xl mx-auto px-6 py-10">{children}</div>
);

export default PageLayout;
