# Repeater

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Just](https://github.com/casey/just#installation)

## Getting started

```bash
just init
```

This will reset the database, start all services, generate the web client, and bootstrap seed data.

## Common commands

```bash
just dev                  # Start all services
just test                 # Run backend tests
just test -k test_auth    # Run specific tests
just format               # Format code
just revision "message"   # Create a new migration
just migrate              # Run migrations
just generate-web-client  # Regenerate TypeScript client
```

Run `just --list` to see all available commands.

## Helpful commands

Enter psql

```bash
docker exec -it repeater-db psql -U user -d repeater

# then, perform a query
select * from users;
```
