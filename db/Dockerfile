# Imagen para aplicar las migraciones con Alembic (ADR-014). Se ejecuta y termina.
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt db/requirements.txt
RUN pip install --no-cache-dir -r db/requirements.txt
COPY . db/
USER nobody
CMD ["alembic", "-c", "db/alembic.ini", "upgrade", "head"]
