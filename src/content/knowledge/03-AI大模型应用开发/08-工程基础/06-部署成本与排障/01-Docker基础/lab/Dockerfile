FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8038

WORKDIR /app
COPY main.py /app/main.py

USER 65532:65532
EXPOSE 8038
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8038/health', timeout=2)"
CMD ["python", "main.py"]
