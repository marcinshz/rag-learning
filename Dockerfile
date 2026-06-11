FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.8.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "run", "start:dev"]
