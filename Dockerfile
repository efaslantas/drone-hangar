FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ARG RELEASE_SHA=dev
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server ./server
ENV PORT=8780
ENV RELEASE_SHA=$RELEASE_SHA
EXPOSE 8780
VOLUME /app/server/data
CMD ["node", "server/index.mjs"]
