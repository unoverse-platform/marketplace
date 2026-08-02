/** The universe's REST client, which a public static page does not have. Kept so the
 *  recovered views compile unedited; anything reaching for it gets an honest failure
 *  rather than a silent empty result. */
export async function authedFetch(): Promise<Response> {
  throw new Error("the storefront has no universe to call: actions go through the host");
}
export * from "./host";
