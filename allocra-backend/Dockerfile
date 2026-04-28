# FROM python:3.12-slim

# WORKDIR /app

# RUN apt-get update && apt-get install -y --no-install-recommends \
#     gcc libpq-dev curl \
#     && rm -rf /var/lib/apt/lists/*

# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt

# COPY . .

# EXPOSE 8000

# # Migrate then start
# CMD alembic upgrade head && \
#     uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --loop uvloop


# Use a stable Python version
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies needed to compile asyncpg and other drivers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of your backend code
COPY . .

# Inform Google Cloud that the app listens on port 8080
ENV PORT 8080
EXPOSE 8080

# Start the application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]