FROM node:16-slim AS build

COPY . /build
WORKDIR /build
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
RUN pnpm run build

FROM node:20-slim
ENV NODE_ENV=production

COPY --from=build /build/dist /app

WORKDIR /app
RUN npm install -g pnpm
RUN pnpm install --production

EXPOSE 5888
CMD ["node", "main.js"]
