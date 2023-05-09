FROM node:16-alpine as baseimage
RUN mkdir app/
ADD . app/
WORKDIR /app

RUN yarn

FROM baseimage
CMD ["yarn", "start"]
EXPOSE 3000