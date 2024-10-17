FROM node:16-slim AS frontend-build

COPY packages/frontend /build
WORKDIR /build
RUN npm install

ENV NODE_ENV=production
RUN npm run build

FROM python:3.10-slim
ENV PYTHONUNBUFFERED=1

COPY --from=frontend-build /build/dist /www

COPY requirements.txt .
RUN pip install -r requirements.txt
RUN rm requirements.txt

COPY packages/backend /app
EXPOSE 5777:5777
ENTRYPOINT [ "python", "/app/main.py" ]
