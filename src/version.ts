/**
 * What version this is, and where to say something about it.
 *
 * The version is written in by the build from package.json, which is the one
 * number that reaches a user.
 */

declare const __APP_VERSION__: string;

export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

/** Where the project lives, which is where everything below points. */
export const REPOSITORY = "https://github.com/Doomy66/Traveller-Char-Gen";

export const RELEASE_NOTES = `${REPOSITORY}/blob/main/CHANGELOG.md`;

/** What there is of a manual: the README, which says what it does and how. */
export const HELP = `${REPOSITORY}#readme`;
