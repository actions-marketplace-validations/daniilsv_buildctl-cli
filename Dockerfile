FROM golang:1.25-alpine AS builder

WORKDIR /build

# Копируем go.mod и go.sum
COPY cli/go.mod cli/go.sum ./

# Загружаем зависимости
RUN go mod download

# Копируем исходный код CLI
COPY cli/cmd ./cmd

# Собираем buildctl
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o buildctl ./cmd/buildctl

# Финальный образ
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Копируем собранный бинарник
COPY --from=builder /build/buildctl /buildctl

# Копируем entrypoint скрипт
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
