FROM dart:stable

WORKDIR /app/backend

COPY . .

RUN dart pub get

ENV PORT=8080
EXPOSE 8080

CMD ["dart", "run", "backend.dart"]
