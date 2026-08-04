# Frontend Application

## Local Development

Install the Node.js version required by `package.json`, then run:

```bash
pnpm install
pnpm run dev
```

The development server uses `PORT` when it is set.

## Production Build

```bash
pnpm run build
```

The available development and maintenance commands are defined in `package.json`.

## Docker

The Dockerfile contains development and production targets. The production container requires
`PORT`:

```bash
docker build -t frontend-application .
docker run --rm -e PORT=8080 -p 8080:8080 frontend-application
```
