FROM python:3.13-slim

WORKDIR /app/backend

COPY . .

RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=8080
EXPOSE 8080

CMD ["python", "backend.py"]
