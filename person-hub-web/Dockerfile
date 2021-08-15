# build stage
FROM node:14.17.5-alpine as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production
FROM nginx:stable-alpine as production
COPY nginx/default.conf /etc/nginx/conf.d/
COPY --from=build-stage /app/dist/ /usr/share/nginx/html/
EXPOSE 80
CMD nginx -g 'daemon off;'
