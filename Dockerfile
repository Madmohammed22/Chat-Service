# syntax=docker/dockerfile:1

FROM node:lts-alpine
WORKDIR /chat-app
COPY . .
RUN yarn install --production
CMD ["node", "backEnd/index.js"]
EXPOSE 3000