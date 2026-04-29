FROM python:3.11-slim

WORKDIR /app

# Install essential system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# Set environment and start the server
ENV PORT 8080
EXPOSE 8080

# This points correctly to your 'app/main.py' structure
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
