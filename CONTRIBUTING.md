# Contributing

Thanks for your interest in contributing to the project! This file explains how to contribute, run the project locally, and the project's release & prebuild process.

Code of conduct

Please follow our Code of Conduct: see `CODE_OF_CONDUCT.md`.

Getting started

1. Fork the repository and create a branch for your change.
2. Install dependencies (we use pnpm):

   pnpm install

3. Build the packages:

   pnpm -w build

Run type checks

pnpm -w run lint

Testing

There are currently no automated tests in the repo. If you add tests, please include instructions here.

Prebuilds and binary artifacts

This mono-repo contains two packages: `@byjonas/ffmpeg` and `@byjonas/ffmpeg-binaries`.

- `@byjonas/ffmpeg` is the TypeScript wrapper. It is built by the top-level `build` script.
- `@byjonas/ffmpeg-binaries` contains bundled FFmpeg binaries for supported platforms.

We provide a GitHub Actions workflow that creates prebuild artifacts (zipped binaries) and attaches them to a GitHub Release or uploads them as artifacts. To reproduce locally, build the `ffmpeg-binaries` package and prepare the same zipped structure as included in `packages/ffmpeg-binaries/bin`.

Releasing

Releases are automated via GitHub Actions. Maintainers will create a tag (vX.Y.Z) and the release workflow will publish packages to npm and attach prebuild assets.

Required repository secrets

- `GITHUB_TOKEN` — automatically provided to workflows to upload release assets. No action required for maintainers.

How to create a release (tags)

1. Bump package versions in the packages you want to publish (or use your standard release tooling).
2. Create a signed or annotated git tag named `vX.Y.Z` and push it to origin:

   git tag v1.2.3 -m "Release v1.2.3"; git push origin v1.2.3

3. After the tag is pushed, the `release` workflow will run and publish packages to npm using trusted publishing.
4. The `prebuild` workflow will attach the generated `ffmpeg-binaries` zip to the GitHub Release.

Notes for maintainers

- Workflows assume the repository is public and published packages should be public on npm. If you need private packages, modify `release.yml` accordingly.
- The build step uses `pnpm` in the CI. Make sure any additional build steps or native build tools are installed in workflows if required.

Branching and PRs

- Open a PR from a feature branch to `master`.
- Use conventional commits in your commit messages.
- Include a short description of changes and any migration notes.

Security

If you discover a security issue, see `SECURITY.md`.

Contact

Maintainership and contact information is in `package.json` and the GitHub repository settings.
