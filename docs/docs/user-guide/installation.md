---
sidebar_position: 2
---

# Installation

OrganizrX can be installed using Docker (recommended) or as a bare metal application using Bun. This guide covers the various ways to get OrganizrX up and running in your environment.

## Docker Installation

Docker is the most straightforward way to run OrganizrX, providing a consistent and isolated environment.

### Quick Start (One-liner)

To start OrganizrX with a simple SQLite database and default settings:

```bash
docker run -d \
  --name organizrx \
  -p 3001:3001 \
  -e JWT_SECRET="change-me-to-a-secure-secret-at-least-32-chars" \
  -v ./data:/app/data \
  dawidkulpa/organizrx:latest
```

### Docker Compose

For more control and better management, use a `docker-compose.yml` file.

```yaml
services:
  organizrx:
    image: dawidkulpa/organizrx:latest
    container_name: organizrx
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - HOST=0.0.0.0
      - NODE_ENV=production
      - DATABASE_DIALECT=sqlite # Options: sqlite, mysql, postgresql
      - DATABASE_URL=/app/data/organizr.db
      - JWT_SECRET=your-secure-secret-minimum-32-characters
      - LOG_LEVEL=info # Options: debug, info, warn, error
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Docker Compose with MySQL

```yaml
services:
  organizrx:
    image: dawidkulpa/organizrx:latest
    container_name: organizrx
    ports:
      - "3001:3001"
    environment:
      - DATABASE_DIALECT=mysql
      - DATABASE_URL=mysql://user:password@db:3306/organizr
      - JWT_SECRET=your-secure-secret-minimum-32-characters
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=rootpassword
      - MYSQL_DATABASE=organizr
      - MYSQL_USER=user
      - MYSQL_PASSWORD=password
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

### Docker Compose with PostgreSQL

```yaml
services:
  organizrx:
    image: dawidkulpa/organizrx:latest
    container_name: organizrx
    ports:
      - "3001:3001"
    environment:
      - DATABASE_DIALECT=postgresql
      - DATABASE_URL=postgres://user:password@db:5432/organizr
      - JWT_SECRET=your-secure-secret-minimum-32-characters
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=organizr
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  pg_data:
```

## Bare Metal Installation

If you prefer to run OrganizrX directly on your host machine, you will need Bun installed.

### Prerequisites

- **Bun:** Version 1.x or higher is required.

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dawidkulpa/organizrx.git
   cd organizrx
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Build the application:**
   ```bash
   bun run build
   ```
4. **Start the server:**
   ```bash
   bun run apps/server/src/index.ts
   ```

## Reverse Proxy Configuration

To access OrganizrX securely over the internet or via a custom domain, you should use a reverse proxy.

### Nginx

Add the following to your Nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name organizrx.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Caddy

Caddy makes it simple to set up a reverse proxy with automatic TLS:

```caddy
organizrx.yourdomain.com {
    reverse_proxy localhost:3001
}
```

### Traefik (Docker)

If you are using Traefik, add these labels to your OrganizrX service in your `docker-compose.yml`:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.organizrx.rule=Host(`organizrx.yourdomain.com`)"
  - "traefik.http.routers.organizrx.entrypoints=websecure"
  - "traefik.http.routers.organizrx.tls.certresolver=myresolver"
  - "traefik.http.services.organizrx.loadbalancer.server.port=3001"
```

## Environment Variable Reference

| Name | Type | Default | Description | Required? |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Number | `3001` | The port OrganizrX will listen on. | No |
| `HOST` | String | `0.0.0.0` | The network interface to bind to. | No |
| `NODE_ENV` | String | `production` | The environment mode (development, production, test). | No |
| `DATABASE_DIALECT` | String | `sqlite` | The database driver to use (sqlite, mysql, postgresql). | No |
| `DATABASE_URL` | String | (varies) | The connection string or file path for your database. | No |
| `JWT_SECRET` | String | (none) | A secure string for signing tokens. Must be at least 32 characters in production. | **Yes** |
| `LOG_LEVEL` | String | `info` | The verbosity of logs (debug, info, warn, error). | No |
| `LEGACY_DB_PATH` | String | (none) | Path to an existing Organizr v2 SQLite database for migration. | No |
| `LEGACY_DB_URL` | String | (none) | Connection URL for an existing Organizr v2 MySQL/PG database for migration. | No |
