import { createLink, type LinkComponent } from "@tanstack/react-router";

function Anchor(props: React.ComponentPropsWithRef<"a">) {
  return <a {...props} />;
}

const RouterLink = createLink(Anchor);

/**
 * The app's typed link. The router marks an active link with
 * `aria-current="page"`; by default that matches any parent path, which would
 * announce "Back to Projects" on a project page as the current page. Here a
 * link is active only on its own path (query string ignored). Navigation that
 * should highlight a whole section passes `activeOptions={{ exact: false }}`.
 */
export const Link: LinkComponent<typeof Anchor> = (props) => (
  <RouterLink activeOptions={{ exact: true, includeSearch: false }} activeProps={{}} {...props} />
);
