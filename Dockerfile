FROM node:20-slim AS build

COPY . /build
WORKDIR /build

RUN npm install -g pnpm@9
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM node:20-slim
ENV NODE_ENV=production

COPY --from=build /build/dist /app

WORKDIR /app
COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm@9
RUN pnpm install --production

EXPOSE 5888
CMD ["node", "/app/index.js"]
