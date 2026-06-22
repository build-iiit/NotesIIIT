import { auth } from"@/auth"

const PROTECTED_ROUTES = [
 /^\/upload(\/.*)?$/,
 /^\/my-files(\/.*)?$/,
 /^\/admin(\/.*)?$/,
 /^\/bookmarks(\/.*)?$/,
 /^\/notes\/[^/]+\/edit(\/.*)?$/,
 /^\/markdown\/new(\/.*)?$/,
 /^\/social(\/.*)?$/,
];

export default auth((req) => {
 const { pathname } = req.nextUrl;
 
 // Check if the route is protected
 const isProtected = PROTECTED_ROUTES.some((route) => route.test(pathname));

 if (isProtected && !req.auth) {
 // Redirect to login, preserving the current page URL as a callbackUrl
 const loginUrl = new URL("/login", req.nextUrl.origin);
 loginUrl.searchParams.set("callbackUrl", req.nextUrl.href);
 return Response.redirect(loginUrl);
 }

 if (req.auth && pathname ==="/login") {
 const newUrl = new URL("/", req.nextUrl.origin);
 return Response.redirect(newUrl);
 }
});

export const config = {
 matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
