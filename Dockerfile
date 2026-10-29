# Static OmniView behind nginx. Build:  docker build -t omniview .   Run:  docker run -p 8080:80 omniview
# Optional converter: docker build --build-arg VITE_CONVERSION_URL=http://localhost:8080 ... (see server/README.md; also widen connect-src)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
ARG VITE_CONVERSION_URL=""
ENV VITE_CONVERSION_URL=$VITE_CONVERSION_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
