FROM python:3.12-slim AS builder

WORKDIR /app

COPY pyproject.toml /app/
COPY src /app/src

RUN pip install --no-cache-dir .


FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app/src /app/src

ENV PYTHONPATH=/app/src

EXPOSE 8000

CMD ["uvicorn", "zc_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
